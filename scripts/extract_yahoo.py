#!/usr/bin/env python3
"""
Yahoo Fantasy Football Historical Data Extractor

Authenticates via OAuth 2.0, discovers all NFL leagues for the user,
filters for matching league names, and exports data as JSON compatible
with the Fantasy 101 Dashboard's SeasonData format.

Usage:
    python scripts/extract_yahoo.py

First run will open a browser for Yahoo OAuth authorization.
Subsequent runs reuse the saved refresh token.
"""

import json
import sys
import os
import time
import webbrowser
import urllib.parse
import http.server
import threading
from pathlib import Path
from base64 import b64encode

import requests

# --- Config ---
CREDENTIALS_PATH = Path(__file__).resolve().parent.parent.parent / "credentials" / "yahoo_fantasy.json"
TOKEN_PATH = Path(__file__).resolve().parent / ".yahoo_token.json"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "yahoo_historical.json"

# League name filters (case-insensitive)
LEAGUE_NAME_FILTERS = ["football101", "football 1"]

REDIRECT_URI = "oob"
AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth"
TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"
API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2"

# NFL game IDs by season
NFL_GAME_IDS = {
    2001: 57, 2002: 49, 2003: 79, 2004: 101, 2005: 124,
    2006: 153, 2007: 175, 2008: 199, 2009: 222, 2010: 242,
    2011: 257, 2012: 273, 2013: 314, 2014: 331, 2015: 348,
    2016: 359, 2017: 371, 2018: 380, 2019: 390, 2020: 399,
    2021: 406, 2022: 414, 2023: 423, 2024: 449, 2025: 461,
}


class YahooFantasyClient:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = 0

    def _basic_auth_header(self) -> str:
        creds = f"{self.client_id}:{self.client_secret}"
        return b64encode(creds.encode()).decode()

    def authenticate(self, auth_code: str | None = None):
        """Run OAuth flow — load saved token or start new auth."""
        if TOKEN_PATH.exists():
            token_data = json.loads(TOKEN_PATH.read_text())
            self.refresh_token = token_data.get("refresh_token")
            self.access_token = token_data.get("access_token")
            self.token_expiry = token_data.get("expires_at", 0)

            if time.time() < self.token_expiry - 60:
                print("Using saved access token (still valid)")
                return

            if self.refresh_token:
                print("Refreshing access token...")
                try:
                    self._refresh_access_token()
                    return
                except Exception as e:
                    print(f"Token refresh failed: {e}. Starting new auth flow.")

        self._new_auth_flow(auth_code)

    def _new_auth_flow(self, auth_code: str | None = None):
        """Handle authorization — use provided code or prompt for one."""
        if auth_code:
            # Code provided via CLI
            # Extract code from URL if a full URL was passed
            if auth_code.startswith("http"):
                parsed = urllib.parse.urlparse(auth_code)
                query_params = urllib.parse.parse_qs(parsed.query)
                if "code" in query_params:
                    auth_code = query_params["code"][0]
            self._exchange_code(auth_code)
            return

        # No code provided — print the URL for the user
        params = {
            "client_id": self.client_id,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "language": "en-us",
        }
        auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

        print("\n=== Yahoo Fantasy OAuth ===")
        print(f"Go to this URL and authorize:\n{auth_url}\n")
        print("After authorizing, Yahoo will display an authorization code on the page.")
        print("Copy that code and re-run this script with it:")
        print(f'  python scripts/extract_yahoo.py --code "PASTE_CODE_HERE"')
        sys.exit(0)

    def _exchange_code(self, code: str):
        """Exchange authorization code for access + refresh tokens."""
        resp = requests.post(
            TOKEN_URL,
            headers={
                "Authorization": f"Basic {self._basic_auth_header()}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
        )
        resp.raise_for_status()
        data = resp.json()

        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        self.token_expiry = time.time() + data.get("expires_in", 3600)

        self._save_token(data)
        print("Authentication successful!")

    def _refresh_access_token(self):
        """Use refresh token to get a new access token."""
        resp = requests.post(
            TOKEN_URL,
            headers={
                "Authorization": f"Basic {self._basic_auth_header()}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
            },
        )
        resp.raise_for_status()
        data = resp.json()

        self.access_token = data["access_token"]
        if "refresh_token" in data:
            self.refresh_token = data["refresh_token"]
        self.token_expiry = time.time() + data.get("expires_in", 3600)

        self._save_token(data)
        print("Token refreshed successfully!")

    def _save_token(self, data: dict):
        """Persist token data to disk."""
        save_data = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_at": self.token_expiry,
            "raw": data,
        }
        TOKEN_PATH.write_text(json.dumps(save_data, indent=2))

    def _ensure_token(self):
        """Auto-refresh if token is expired."""
        if time.time() >= self.token_expiry - 60:
            self._refresh_access_token()

    def api_get(self, path: str) -> dict:
        """Make authenticated GET request to Yahoo Fantasy API."""
        self._ensure_token()
        url = f"{API_BASE}{path}"
        separator = "&" if "?" in url else "?"
        url += f"{separator}format=json"

        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {self.access_token}"},
        )

        if resp.status_code == 401:
            # Try refreshing token once
            self._refresh_access_token()
            resp = requests.get(
                url,
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

        resp.raise_for_status()
        return resp.json()

    def discover_leagues(self) -> list[dict]:
        """Find all NFL leagues the user has participated in."""
        print("\nDiscovering all NFL leagues...")

        all_leagues = []

        # Check seasons from 2001 to 2019 (before Sleeper era)
        for year in range(2001, 2020):
            game_id = NFL_GAME_IDS.get(year)
            if not game_id:
                continue

            try:
                data = self.api_get(
                    f"/users;use_login=1/games;game_keys={game_id}/leagues"
                )

                # Parse the nested Yahoo response structure
                games = data.get("fantasy_content", {}).get("users", {}).get("0", {}).get("user", [])
                if len(games) < 2:
                    continue

                games_data = games[1].get("games", {})
                game_count = games_data.get("count", 0)

                for i in range(game_count):
                    game_entry = games_data.get(str(i), {}).get("game", [])
                    if len(game_entry) < 2:
                        continue

                    game_info = game_entry[0]
                    leagues_data = game_entry[1].get("leagues", {})
                    league_count = leagues_data.get("count", 0)

                    for j in range(league_count):
                        league_info = leagues_data.get(str(j), {}).get("league", [{}])[0]
                        league_name = league_info.get("name", "")
                        league_key = league_info.get("league_key", "")
                        league_id = league_info.get("league_id", "")
                        season = league_info.get("season", str(year))

                        all_leagues.append({
                            "name": league_name,
                            "league_key": league_key,
                            "league_id": league_id,
                            "season": season,
                            "game_id": game_id,
                            "game_key": str(game_id),
                        })
                        print(f"  Found: {league_name} ({season}) - {league_key}")

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 400:
                    # No leagues for this season
                    continue
                print(f"  Warning: Error fetching {year}: {e}")
                continue
            except Exception as e:
                print(f"  Warning: Error fetching {year}: {e}")
                continue

            # Small delay to avoid rate limiting
            time.sleep(0.3)

        return all_leagues

    def filter_leagues(self, leagues: list[dict]) -> list[dict]:
        """Filter leagues by name to match Football 101/102/105."""
        filtered = []
        for league in leagues:
            name_lower = league["name"].lower().strip()
            for pattern in LEAGUE_NAME_FILTERS:
                if pattern in name_lower:
                    filtered.append(league)
                    break

        print(f"\nFiltered to {len(filtered)} matching leagues:")
        for l in sorted(filtered, key=lambda x: x["season"]):
            print(f"  {l['name']} ({l['season']}) - {l['league_key']}")

        return filtered

    def get_league_standings(self, league_key: str) -> dict:
        """Get standings for a league."""
        return self.api_get(f"/league/{league_key}/standings")

    def get_league_settings(self, league_key: str) -> dict:
        """Get league settings (for playoff week info)."""
        return self.api_get(f"/league/{league_key}/settings")

    def get_league_scoreboard(self, league_key: str, week: int) -> dict:
        """Get scoreboard/matchups for a specific week."""
        return self.api_get(f"/league/{league_key}/scoreboard;week={week}")

    def extract_season_data(self, league: dict) -> dict | None:
        """Extract all data for a single season in SeasonData-compatible format."""
        league_key = league["league_key"]
        season = league["season"]
        print(f"\n--- Extracting: {league['name']} ({season}) ---")

        try:
            # Get settings first (for playoff week)
            settings_data = self.get_league_settings(league_key)
            settings_raw = self._parse_league_settings(settings_data)
            num_teams = int(settings_raw.get("num_teams", 10))
            playoff_start = int(settings_raw.get("playoff_start_week", 14))
            end_week = int(settings_raw.get("end_week", 16))
            regular_season_weeks = playoff_start - 1

            # Get standings
            standings_data = self.get_league_standings(league_key)
            parsed = self._parse_standings(standings_data, league_key)

            if not parsed:
                print(f"  Could not parse standings for {league_key}")
                return None

            league_info = parsed["league_info"]
            teams = parsed["teams"]

            # Build user/roster mappings
            # In Yahoo, team_key acts like roster_id
            # manager_guid acts like owner_id
            users = []
            rosters = []
            roster_to_owner = {}

            # Sort teams by rank so roster_id 1 = rank 1 (champion), etc.
            # This makes championship determination stable and correct.
            teams_sorted = sorted(teams, key=lambda t: int(t.get("rank") or 99))

            for idx, team in enumerate(teams_sorted):
                team_id = idx + 1  # 1-based roster_id; rank 1 team gets roster_id 1
                manager_id = team.get("manager_guid", f"yahoo_{team.get('team_key', idx)}")

                users.append({
                    "user_id": manager_id,
                    "display_name": team.get("manager_name", f"Manager {team_id}"),
                    "avatar": team.get("team_logo"),
                    "metadata": {
                        "team_name": team.get("team_name", "")
                    }
                })

                rosters.append({
                    "roster_id": team_id,
                    "owner_id": manager_id,
                    "league_id": league_key,
                    "settings": {
                        "wins": team.get("wins", 0),
                        "losses": team.get("losses", 0),
                        "ties": team.get("ties", 0),
                        "fpts": int(float(team.get("points_for", 0))),
                        "fpts_decimal": round((float(team.get("points_for", 0)) % 1) * 100),
                        "fpts_against": int(float(team.get("points_against", 0))),
                        "fpts_against_decimal": round((float(team.get("points_against", 0)) % 1) * 100),
                    }
                })

                roster_to_owner[team_id] = manager_id

            # Build team_key -> roster_id mapping for matchup parsing
            team_key_to_roster_id = {}
            for idx, team in enumerate(teams_sorted):
                team_key_to_roster_id[team.get("team_key", "")] = idx + 1

            # Fetch weekly matchups
            print(f"  Fetching {regular_season_weeks} weeks of matchups...")
            all_matchups = []
            for week in range(1, regular_season_weeks + 1):
                try:
                    scoreboard = self.get_league_scoreboard(league_key, week)
                    week_matchups = self._parse_scoreboard(scoreboard, team_key_to_roster_id)
                    all_matchups.append(week_matchups)
                    time.sleep(0.2)  # Rate limiting
                except Exception as e:
                    print(f"  Warning: Could not fetch week {week}: {e}")
                    all_matchups.append([])

            # Build winners bracket directly from standings rank.
            # rank=1 → champion, rank=2 → runner-up, rank=3 → 3rd place.
            # This is authoritative and does not depend on playoff matchup parsing.
            winners_bracket = self._build_bracket_from_rankings(roster_to_owner)

            # Build SeasonData-compatible output
            season_data = {
                "league": {
                    "league_id": league_key,
                    "name": league["name"],
                    "season": season,
                    "previous_league_id": None,
                    "total_rosters": len(teams),
                    "settings": {
                        "playoff_week_start": playoff_start,
                        "leg": 1,
                    },
                    "avatar": None,
                },
                "users": users,
                "rosters": rosters,
                "matchups": all_matchups,
                "winnersBracket": winners_bracket,
                "rosterToOwner": {str(k): v for k, v in roster_to_owner.items()},
            }

            print(f"  Extracted {len(teams)} teams, {len(all_matchups)} weeks, {len(winners_bracket)} playoff placements")
            return season_data

        except Exception as e:
            print(f"  ERROR extracting {league['name']} ({season}): {e}")
            import traceback
            traceback.print_exc()
            return None

    def _parse_league_settings(self, data: dict) -> dict:
        """Parse league settings from Yahoo API response."""
        try:
            league_data = data.get("fantasy_content", {}).get("league", [])
            settings = {}

            for item in league_data:
                if isinstance(item, dict):
                    if "settings" in item:
                        setting_list = item["settings"]
                        if isinstance(setting_list, list):
                            for s in setting_list:
                                if isinstance(s, dict):
                                    settings.update(s)
                    # Also check for direct league metadata
                    if "num_teams" in item:
                        settings["num_teams"] = int(item["num_teams"])
                    if "end_week" in item:
                        settings["end_week"] = int(item["end_week"])
                    if "start_week" in item:
                        settings["start_week"] = int(item["start_week"])
                    if "playoff_start_week" in item:
                        settings["playoff_start_week"] = int(item["playoff_start_week"])

            # Look in the first element which often has league metadata
            if league_data and isinstance(league_data[0], dict):
                meta = league_data[0]
                for key in ["num_teams", "end_week", "start_week", "playoff_start_week"]:
                    if key in meta:
                        settings[key] = int(meta[key])

            return settings
        except Exception as e:
            print(f"  Warning: Could not parse settings: {e}")
            return {"playoff_start_week": 14, "end_week": 16, "num_teams": 10}

    def _parse_standings(self, data: dict, league_key: str) -> dict | None:
        """Parse standings from Yahoo API response."""
        try:
            league_data = data.get("fantasy_content", {}).get("league", [])

            league_info = {}
            teams = []

            # First element is league metadata
            if league_data and isinstance(league_data[0], dict):
                league_info = league_data[0]

            # Second element contains standings
            if len(league_data) > 1 and isinstance(league_data[1], dict):
                standings = league_data[1].get("standings", [])
                if isinstance(standings, list):
                    for item in standings:
                        if isinstance(item, dict) and "teams" in item:
                            teams_data = item["teams"]
                            team_count = teams_data.get("count", 0)
                            for i in range(team_count):
                                team_entry = teams_data.get(str(i), {}).get("team", [])
                                team_info = self._parse_team_entry(team_entry)
                                if team_info:
                                    teams.append(team_info)

            return {"league_info": league_info, "teams": teams}
        except Exception as e:
            print(f"  Error parsing standings: {e}")
            return None

    def _parse_team_entry(self, team_entry: list) -> dict | None:
        """Parse a single team entry from Yahoo's nested response."""
        try:
            team = {}

            for item in team_entry:
                if isinstance(item, list):
                    for sub in item:
                        if isinstance(sub, dict):
                            # Team metadata fields
                            for key in ["team_key", "team_id", "name", "url",
                                       "team_logos", "is_owned_by_current_login"]:
                                if key in sub:
                                    if key == "name":
                                        team["team_name"] = sub[key]
                                    elif key == "team_logos":
                                        logos = sub[key]
                                        if isinstance(logos, list) and logos:
                                            logo = logos[0]
                                            if isinstance(logo, dict) and "team_logo" in logo:
                                                team["team_logo"] = logo["team_logo"].get("url")
                                    else:
                                        team[key] = sub[key]
                            # Manager info
                            if "managers" in sub:
                                managers = sub["managers"]
                                if isinstance(managers, list) and managers:
                                    mgr = managers[0]
                                    if isinstance(mgr, dict) and "manager" in mgr:
                                        mgr_data = mgr["manager"]
                                        team["manager_name"] = mgr_data.get("nickname", "Unknown")
                                        team["manager_guid"] = mgr_data.get("guid", "")
                elif isinstance(item, dict):
                    # Team standings
                    if "team_standings" in item:
                        standings = item["team_standings"]
                        team["rank"] = standings.get("rank")

                        outcome = standings.get("outcome_totals", {})
                        team["wins"] = int(outcome.get("wins", 0))
                        team["losses"] = int(outcome.get("losses", 0))
                        team["ties"] = int(outcome.get("ties", 0))

                        team["points_for"] = float(standings.get("points_for", 0))
                        team["points_against"] = float(standings.get("points_against", 0))

                    # Team points (alternative location)
                    if "team_points" in item:
                        team["points_total"] = float(item["team_points"].get("total", 0))

            return team if team.get("team_key") else None
        except Exception as e:
            print(f"  Warning: Could not parse team entry: {e}")
            return None

    def _parse_scoreboard(self, data: dict, team_key_to_roster_id: dict) -> list[dict]:
        """Parse a weekly scoreboard into matchup format."""
        matchups = []
        try:
            league_data = data.get("fantasy_content", {}).get("league", [])

            if len(league_data) < 2:
                return matchups

            scoreboard = league_data[1].get("scoreboard", {})
            if not scoreboard:
                return matchups

            matchup_data = scoreboard.get("0", {}).get("matchups", scoreboard.get("matchups", {}))
            if not matchup_data:
                # Try alternative structure
                for key, val in scoreboard.items():
                    if isinstance(val, dict) and "matchups" in val:
                        matchup_data = val["matchups"]
                        break

            if not matchup_data:
                return matchups

            count = matchup_data.get("count", 0)
            matchup_id = 1

            for i in range(count):
                match_entry = matchup_data.get(str(i), {}).get("matchup", {})
                if not match_entry:
                    continue

                teams_in_matchup = match_entry.get("0", {}).get("teams", match_entry.get("teams", {}))
                if not teams_in_matchup:
                    continue

                team_count = teams_in_matchup.get("count", 0)
                match_teams = []

                for t in range(team_count):
                    team_entry = teams_in_matchup.get(str(t), {}).get("team", [])
                    team_key = None
                    team_points = 0

                    for item in team_entry:
                        if isinstance(item, list):
                            for sub in item:
                                if isinstance(sub, dict) and "team_key" in sub:
                                    team_key = sub["team_key"]
                        elif isinstance(item, dict):
                            if "team_points" in item:
                                team_points = float(item["team_points"].get("total", 0))

                    if team_key:
                        roster_id = team_key_to_roster_id.get(team_key, t + 1)
                        match_teams.append({
                            "roster_id": roster_id,
                            "matchup_id": matchup_id,
                            "points": team_points,
                        })

                if len(match_teams) == 2:
                    matchups.extend(match_teams)
                    matchup_id += 1

        except Exception as e:
            print(f"  Warning: Could not parse scoreboard: {e}")

        return matchups

    def _build_bracket_from_rankings(self, roster_to_owner: dict) -> list[dict]:
        """Build winners bracket from standings rankings.

        Since we sort teams by rank and assign roster_id 1=rank1, 2=rank2, etc.,
        the roster IDs directly encode final standings. This is stable and accurate.
        """
        bracket = []

        # Championship game: roster 1 (champion) beat roster 2 (runner-up)
        if 1 in roster_to_owner and 2 in roster_to_owner:
            bracket.append({
                "r": 2, "m": 1,
                "t1": 1, "t2": 2,
                "w": 1, "l": 2,
                "p": 1,
            })

        # 3rd place game: roster 3 beat roster 4
        if 3 in roster_to_owner and 4 in roster_to_owner:
            bracket.append({
                "r": 2, "m": 2,
                "t1": 3, "t2": 4,
                "w": 3, "l": 4,
                "p": 3,
            })

        return bracket

    def _determine_placements(
        self,
        playoff_matchups: list[tuple[int, list[dict]]],
        playoff_start: int,
        end_week: int,
        team_key_to_roster_id: dict,
    ) -> list[dict]:
        """Determine 1st/2nd/3rd from playoff matchups.

        Uses semifinal results to identify which final-week matchup is the
        championship (semifinal winners) vs 3rd place (semifinal losers).
        """
        bracket = []

        if not playoff_matchups:
            return bracket

        final_week_matchups = None
        semifinal_week_matchups = None

        for week, matchups in playoff_matchups:
            if week == end_week:
                final_week_matchups = matchups
            elif week == end_week - 1:
                semifinal_week_matchups = matchups

        if not final_week_matchups:
            return bracket

        # Identify semifinal winners (they play in the championship)
        semi_winners = set()
        semi_losers = set()
        if semifinal_week_matchups:
            semi_by_matchup = {}
            for m in semifinal_week_matchups:
                mid = m["matchup_id"]
                if mid not in semi_by_matchup:
                    semi_by_matchup[mid] = []
                semi_by_matchup[mid].append(m)

            for mid, pair in semi_by_matchup.items():
                if len(pair) == 2:
                    winner = max(pair, key=lambda x: x["points"])
                    loser = min(pair, key=lambda x: x["points"])
                    semi_winners.add(winner["roster_id"])
                    semi_losers.add(loser["roster_id"])

        # Group final week by matchup_id
        by_matchup = {}
        for m in final_week_matchups:
            mid = m["matchup_id"]
            if mid not in by_matchup:
                by_matchup[mid] = []
            by_matchup[mid].append(m)

        champ_matchup = None
        third_matchup = None

        if semi_winners:
            # Use semifinal results to identify championship vs 3rd place
            for mid, pair in by_matchup.items():
                if len(pair) != 2:
                    continue
                roster_ids = {p["roster_id"] for p in pair}
                if roster_ids.issubset(semi_winners):
                    champ_matchup = pair
                elif roster_ids.issubset(semi_losers):
                    third_matchup = pair
        else:
            # No semifinal data — fall back to matchup_id ordering
            matchup_ids = sorted(by_matchup.keys())
            if matchup_ids:
                champ_matchup = by_matchup[matchup_ids[0]]
            if len(matchup_ids) > 1:
                third_matchup = by_matchup[matchup_ids[1]]

        if champ_matchup and len(champ_matchup) == 2:
            winner = max(champ_matchup, key=lambda x: x["points"])
            loser = min(champ_matchup, key=lambda x: x["points"])
            bracket.append({
                "r": 2, "m": 1,
                "t1": winner["roster_id"], "t2": loser["roster_id"],
                "w": winner["roster_id"], "l": loser["roster_id"],
                "p": 1,
            })

        if third_matchup and len(third_matchup) == 2:
            winner = max(third_matchup, key=lambda x: x["points"])
            loser = min(third_matchup, key=lambda x: x["points"])
            bracket.append({
                "r": 2, "m": 2,
                "t1": winner["roster_id"], "t2": loser["roster_id"],
                "w": winner["roster_id"], "l": loser["roster_id"],
                "p": 3,
            })

        return bracket


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Extract Yahoo Fantasy Football data")
    parser.add_argument("--code", help="OAuth authorization code or redirect URL")
    args = parser.parse_args()

    # Load credentials
    if not CREDENTIALS_PATH.exists():
        print(f"Error: Credentials not found at {CREDENTIALS_PATH}")
        sys.exit(1)

    creds = json.loads(CREDENTIALS_PATH.read_text())
    client_id = creds["client_id"]
    client_secret = creds["client_secret"]

    # Create client and authenticate
    client = YahooFantasyClient(client_id, client_secret)
    client.authenticate(auth_code=args.code)

    # Discover leagues
    all_leagues = client.discover_leagues()

    if not all_leagues:
        print("\nNo NFL leagues found for this user.")
        print("Raw API response for debugging:")
        try:
            debug = client.api_get("/users;use_login=1/games;game_codes=nfl/leagues")
            print(json.dumps(debug, indent=2)[:3000])
        except Exception as e:
            print(f"Debug call failed: {e}")
        sys.exit(1)

    # Filter for matching leagues
    matching = client.filter_leagues(all_leagues)

    if not matching:
        print("\nNo leagues matching the name filters found.")
        print("All discovered leagues:")
        for l in all_leagues:
            print(f"  {l['name']} ({l['season']})")
        sys.exit(1)

    # Extract data for each matching league
    all_season_data = []
    for league in sorted(matching, key=lambda x: x["season"]):
        season_data = client.extract_season_data(league)
        if season_data:
            all_season_data.append(season_data)

    if not all_season_data:
        print("\nNo season data could be extracted.")
        sys.exit(1)

    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(all_season_data, indent=2))
    print(f"\n=== SUCCESS ===")
    print(f"Extracted {len(all_season_data)} seasons to {OUTPUT_PATH}")

    # Print summary
    print("\nSeasons extracted:")
    for sd in all_season_data:
        league = sd["league"]
        managers = len(sd["users"])
        weeks = len(sd["matchups"])
        print(f"  {league['name']} ({league['season']}) - {managers} teams, {weeks} weeks")

    # Print unique managers for mapping purposes
    all_managers = {}
    for sd in all_season_data:
        for user in sd["users"]:
            uid = user["user_id"]
            if uid not in all_managers:
                all_managers[uid] = user["display_name"]

    print(f"\nUnique managers found ({len(all_managers)}):")
    for uid, name in sorted(all_managers.items(), key=lambda x: x[1]):
        print(f"  {name} (ID: {uid})")

    print("\nNext step: You'll need to map Yahoo user IDs to Sleeper user IDs")
    print("so the dashboard can show unified all-time stats.")


if __name__ == "__main__":
    main()
