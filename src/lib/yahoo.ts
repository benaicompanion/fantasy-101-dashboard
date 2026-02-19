import type { SeasonData } from "./types";
import rawYahooData from "@/data/yahoo_historical.json";
import managerMapping from "@/data/manager-mapping.json";

/**
 * Load Yahoo historical data and remap user IDs to match Sleeper IDs
 * where the same manager exists in both platforms.
 */
export function getYahooSeasonsData(): SeasonData[] {
  const { yahooToSleeper, displayNameOverrides } = managerMapping;
  const seasons = rawYahooData as SeasonData[];

  // Track anonymous users (deleted Yahoo accounts with "--" or "" IDs)
  // Give each a unique synthetic ID per-season so they don't merge
  let anonCounter = 0;

  return seasons.map((season) => {
    const idRemap: Record<string, string> = {};

    // Build remap for this season's users
    for (const user of season.users) {
      const originalId = user.user_id;

      if (!originalId || originalId === "--") {
        // Deleted Yahoo account — assign unique synthetic ID
        const syntheticId = `yahoo_anon_${++anonCounter}`;
        idRemap[originalId] = syntheticId;
      } else if (yahooToSleeper[originalId as keyof typeof yahooToSleeper]) {
        idRemap[originalId] =
          yahooToSleeper[originalId as keyof typeof yahooToSleeper];
      }
      // else: keep original Yahoo ID (Yahoo-only managers)
    }

    // Remap user IDs
    const users = season.users.map((user) => {
      const newId = idRemap[user.user_id] ?? user.user_id;
      const nameOverride =
        displayNameOverrides[
          user.user_id as keyof typeof displayNameOverrides
        ];
      return {
        ...user,
        user_id: newId,
        display_name: nameOverride ?? user.display_name,
      };
    });

    // Remap roster owner IDs
    const rosters = season.rosters.map((roster) => ({
      ...roster,
      owner_id: idRemap[roster.owner_id] ?? roster.owner_id,
    }));

    // Remap rosterToOwner
    const rosterToOwner: Record<number, string> = {};
    for (const [rosterId, ownerId] of Object.entries(season.rosterToOwner)) {
      rosterToOwner[Number(rosterId)] = idRemap[ownerId] ?? ownerId;
    }

    return {
      ...season,
      users,
      rosters,
      rosterToOwner,
    };
  });
}
