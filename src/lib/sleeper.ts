import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperMatchup,
  BracketMatch,
  SeasonData,
} from "./types";

const BASE_URL = "https://api.sleeper.app/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 604800 } }); // 7-day cache
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status} ${url}`);
  return res.json();
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return fetchJson<SleeperLeague>(`${BASE_URL}/league/${leagueId}`);
}

export async function getUsers(leagueId: string): Promise<SleeperUser[]> {
  return fetchJson<SleeperUser[]>(`${BASE_URL}/league/${leagueId}/users`);
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return fetchJson<SleeperRoster[]>(`${BASE_URL}/league/${leagueId}/rosters`);
}

export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  return fetchJson<SleeperMatchup[]>(
    `${BASE_URL}/league/${leagueId}/matchups/${week}`
  );
}

export async function getWinnersBracket(
  leagueId: string
): Promise<BracketMatch[]> {
  return fetchJson<BracketMatch[]>(
    `${BASE_URL}/league/${leagueId}/winners_bracket`
  );
}

/**
 * Walk backwards through the league chain to get all historical league IDs.
 * Returns array of league IDs from oldest to newest.
 */
export async function getLeagueChain(
  currentLeagueId: string
): Promise<string[]> {
  const chain: string[] = [];
  let leagueId: string | null = currentLeagueId;

  while (leagueId) {
    chain.unshift(leagueId);
    const league = await getLeague(leagueId);
    leagueId = league.previous_league_id;
  }

  return chain;
}

/**
 * Fetch all data for a single season.
 */
export async function getSeasonData(leagueId: string): Promise<SeasonData> {
  const league = await getLeague(leagueId);
  const [users, rosters, winnersBracket] = await Promise.all([
    getUsers(leagueId),
    getRosters(leagueId),
    getWinnersBracket(leagueId),
  ]);

  // Build roster_id -> owner_id mapping
  const rosterToOwner: Record<number, string> = {};
  for (const roster of rosters) {
    rosterToOwner[roster.roster_id] = roster.owner_id;
  }

  // Determine number of regular season weeks
  const playoffStart = league.settings?.playoff_week_start ?? 15;
  const regularSeasonWeeks = playoffStart - 1;

  // Fetch all weekly matchups in parallel
  const weekNumbers = Array.from(
    { length: regularSeasonWeeks },
    (_, i) => i + 1
  );
  const matchupResults = await Promise.all(
    weekNumbers.map((week) => getMatchups(leagueId, week))
  );

  // Index by week (1-based, so matchups[0] = week 1)
  const matchups: SleeperMatchup[][] = matchupResults;

  return {
    league,
    users,
    rosters,
    matchups,
    winnersBracket,
    rosterToOwner,
  };
}

/**
 * Fetch all historical data for the league.
 */
export async function getAllSeasonsData(
  currentLeagueId: string
): Promise<SeasonData[]> {
  const chain = await getLeagueChain(currentLeagueId);
  // Fetch all seasons in parallel
  return Promise.all(chain.map((id) => getSeasonData(id)));
}
