import type { SeasonData } from "./types";
import rawYahooData from "@/data/yahoo_historical.json";
import managerMapping from "@/data/manager-mapping.json";

const mapping = managerMapping as {
  yahooToSleeper: Record<string, string>;
  displayNameOverrides: Record<string, string>;
  teamNameToSleeper: Record<string, string>;
};

/**
 * Load Yahoo historical data and remap user IDs to match Sleeper IDs
 * where the same manager exists in both platforms.
 */
export function getYahooSeasonsData(): SeasonData[] {
  const { yahooToSleeper, displayNameOverrides, teamNameToSleeper } = mapping;
  const seasons = rawYahooData as SeasonData[];

  let anonCounter = 0;

  return seasons.map((season) => {
    // Step 1: Determine new ID for each user by index
    const newIdByUserIndex: string[] = season.users.map((user) => {
      const origId = user.user_id;
      const teamName = user.metadata?.team_name || "";

      if (!origId || origId === "--") {
        // Anonymous/deleted account — check team name mapping first
        if (teamName && teamNameToSleeper[teamName]) {
          return teamNameToSleeper[teamName];
        }
        return `yahoo_anon_${++anonCounter}`;
      }

      // Known Yahoo user — remap to Sleeper ID if available
      return yahooToSleeper[origId] ?? origId;
    });

    // Step 2: Build owner_id -> new_id lookup for roster remapping
    // For non-anonymous users, this is straightforward
    // For anonymous users, match by team name to find the right user
    const buildRosterOwnerRemap = (roster: (typeof season.rosters)[0]): string => {
      const origOwner = roster.owner_id;

      if (origOwner && origOwner !== "--") {
        // Non-anonymous: find the user with this ID
        const userIdx = season.users.findIndex((u) => u.user_id === origOwner);
        if (userIdx >= 0) return newIdByUserIndex[userIdx];
        return yahooToSleeper[origOwner] ?? origOwner;
      }

      // Anonymous: find by matching roster_id to user order
      // The Yahoo extraction maps users 1:1 with rosters by position
      const anonUsers: number[] = [];
      for (let i = 0; i < season.users.length; i++) {
        const uid = season.users[i].user_id;
        if (!uid || uid === "--") anonUsers.push(i);
      }
      const anonRosters: number[] = [];
      for (const r of season.rosters) {
        if (!r.owner_id || r.owner_id === "--") anonRosters.push(r.roster_id);
      }
      const rosterPos = anonRosters.indexOf(roster.roster_id);
      if (rosterPos >= 0 && rosterPos < anonUsers.length) {
        return newIdByUserIndex[anonUsers[rosterPos]];
      }

      return `yahoo_anon_${++anonCounter}`;
    };

    // Step 3: Remap users
    const users = season.users.map((user, i) => ({
      ...user,
      user_id: newIdByUserIndex[i],
      display_name: displayNameOverrides[user.user_id] ?? user.display_name,
    }));

    // Step 4: Remap rosters
    const rosters = season.rosters.map((roster) => ({
      ...roster,
      owner_id: buildRosterOwnerRemap(roster),
    }));

    // Step 5: Remap rosterToOwner
    const rosterToOwner: Record<number, string> = {};
    for (const roster of rosters) {
      rosterToOwner[roster.roster_id] = roster.owner_id;
    }

    return {
      ...season,
      users,
      rosters,
      rosterToOwner,
    };
  });
}
