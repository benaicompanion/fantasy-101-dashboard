import type {
  SeasonData,
  Manager,
  ManagerStats,
  HeadToHeadRecord,
  SeasonTeam,
  AggregatedData,
} from "./types";

function initManagerStats(userId: string): ManagerStats {
  return {
    userId,
    totalPointsFor: 0,
    totalPointsAgainst: 0,
    totalWins: 0,
    totalLosses: 0,
    totalTies: 0,
    pointDifferential: 0,
    winPercentage: 0,
    championships: 0,
    secondPlace: 0,
    thirdPlace: 0,
    luckyWins: 0,
    unluckyLosses: 0,
    seasonsPlayed: 0,
  };
}

export function aggregateAllSeasons(seasons: SeasonData[]): AggregatedData {
  const managers: Record<string, Manager> = {};
  const stats: Record<string, ManagerStats> = {};
  const h2hMap: Record<string, { wins1: number; wins2: number; ties: number }> =
    {};
  const allSeasonTeams: SeasonTeam[] = [];

  for (const season of seasons) {
    const { league, users, rosters, matchups, winnersBracket, rosterToOwner } =
      season;
    const seasonYear = league.season;

    // Build user lookup
    const userMap: Record<string, { displayName: string; avatar: string | null; teamName: string }> = {};
    for (const user of users) {
      userMap[user.user_id] = {
        displayName: user.display_name,
        avatar: user.avatar,
        teamName: user.metadata?.team_name || user.display_name,
      };
    }

    // Register managers and accumulate roster stats
    for (const roster of rosters) {
      const ownerId = roster.owner_id;
      if (!ownerId) continue;

      const userInfo = userMap[ownerId];
      if (!userInfo) continue;

      // Register manager
      if (!managers[ownerId]) {
        managers[ownerId] = {
          userId: ownerId,
          displayName: userInfo.displayName,
          avatar: userInfo.avatar,
          teamNames: {},
        };
      }
      // Update display name to most recent
      managers[ownerId].displayName = userInfo.displayName;
      managers[ownerId].avatar = userInfo.avatar;
      managers[ownerId].teamNames[seasonYear] = userInfo.teamName;

      // Init stats
      if (!stats[ownerId]) {
        stats[ownerId] = initManagerStats(ownerId);
      }

      const s = stats[ownerId];
      const rs = roster.settings;
      const ptsFor = (rs.fpts || 0) + (rs.fpts_decimal || 0) / 100;
      const ptsAgainst =
        (rs.fpts_against || 0) + (rs.fpts_against_decimal || 0) / 100;

      s.totalPointsFor += ptsFor;
      s.totalPointsAgainst += ptsAgainst;
      s.totalWins += rs.wins || 0;
      s.totalLosses += rs.losses || 0;
      s.totalTies += rs.ties || 0;
      s.seasonsPlayed += 1;

      // Track season teams for best/worst
      allSeasonTeams.push({
        userId: ownerId,
        displayName: userInfo.displayName,
        teamName: userInfo.teamName,
        season: seasonYear,
        pointsFor: ptsFor,
        wins: rs.wins || 0,
        losses: rs.losses || 0,
        record: `${rs.wins || 0}-${rs.losses || 0}`,
      });
    }

    // Process weekly matchups for H2H and luck
    for (const weekMatchups of matchups) {
      if (!weekMatchups || weekMatchups.length === 0) continue;

      // Group by matchup_id to find opponents
      const byMatchup: Record<number, typeof weekMatchups> = {};
      for (const m of weekMatchups) {
        if (!byMatchup[m.matchup_id]) byMatchup[m.matchup_id] = [];
        byMatchup[m.matchup_id].push(m);
      }

      // Calculate median score for luck analysis
      const allScores = weekMatchups
        .map((m) => m.points)
        .filter((p) => p > 0)
        .sort((a, b) => a - b);
      const median =
        allScores.length > 0
          ? allScores.length % 2 === 0
            ? (allScores[allScores.length / 2 - 1] +
                allScores[allScores.length / 2]) /
              2
            : allScores[Math.floor(allScores.length / 2)]
          : 0;

      for (const matchupId in byMatchup) {
        const pair = byMatchup[matchupId];
        if (pair.length !== 2) continue;

        const [a, b] = pair;
        const ownerA = rosterToOwner[a.roster_id];
        const ownerB = rosterToOwner[b.roster_id];
        if (!ownerA || !ownerB) continue;

        // H2H key: alphabetically sorted so we have a consistent key
        const [first, second] =
          ownerA < ownerB ? [ownerA, ownerB] : [ownerB, ownerA];
        const h2hKey = `${first}:${second}`;

        if (!h2hMap[h2hKey]) {
          h2hMap[h2hKey] = { wins1: 0, wins2: 0, ties: 0 };
        }

        if (a.points > b.points) {
          // a won
          if (ownerA === first) h2hMap[h2hKey].wins1++;
          else h2hMap[h2hKey].wins2++;

          // Luck: a won but scored below median
          if (a.points < median && stats[ownerA]) {
            stats[ownerA].luckyWins++;
          }
          // Unlucky: b lost but scored above median
          if (b.points > median && stats[ownerB]) {
            stats[ownerB].unluckyLosses++;
          }
        } else if (b.points > a.points) {
          // b won
          if (ownerB === first) h2hMap[h2hKey].wins1++;
          else h2hMap[h2hKey].wins2++;

          // Luck
          if (b.points < median && stats[ownerB]) {
            stats[ownerB].luckyWins++;
          }
          if (a.points > median && stats[ownerA]) {
            stats[ownerA].unluckyLosses++;
          }
        } else {
          h2hMap[h2hKey].ties++;
        }
      }
    }

    // Process winners bracket for placements
    for (const match of winnersBracket) {
      if (!match.p) continue; // only care about placement matches

      const winnerOwner = rosterToOwner[match.w];
      const loserOwner = rosterToOwner[match.l];

      if (match.p === 1) {
        // Championship game
        if (winnerOwner && stats[winnerOwner]) stats[winnerOwner].championships++;
        if (loserOwner && stats[loserOwner]) stats[loserOwner].secondPlace++;
      } else if (match.p === 3) {
        // 3rd place game
        if (winnerOwner && stats[winnerOwner]) stats[winnerOwner].thirdPlace++;
      }
    }
  }

  // Calculate derived stats
  for (const userId in stats) {
    const s = stats[userId];
    s.pointDifferential = s.totalPointsFor - s.totalPointsAgainst;
    const totalGames = s.totalWins + s.totalLosses + s.totalTies;
    s.winPercentage = totalGames > 0 ? s.totalWins / totalGames : 0;

    // Round decimals
    s.totalPointsFor = Math.round(s.totalPointsFor * 100) / 100;
    s.totalPointsAgainst = Math.round(s.totalPointsAgainst * 100) / 100;
    s.pointDifferential = Math.round(s.pointDifferential * 100) / 100;
    s.winPercentage = Math.round(s.winPercentage * 1000) / 1000;
  }

  // Convert H2H map to array
  const headToHead: HeadToHeadRecord[] = Object.entries(h2hMap).map(
    ([key, val]) => {
      const [id1, id2] = key.split(":");
      return {
        managerId1: id1,
        managerId2: id2,
        wins1: val.wins1,
        wins2: val.wins2,
        ties: val.ties,
      };
    }
  );

  // Sort season teams for best/worst
  const sortedTeams = [...allSeasonTeams].sort(
    (a, b) => b.pointsFor - a.pointsFor
  );
  const bestTeams = sortedTeams.slice(0, 3);
  const worstTeams = sortedTeams.slice(-3).reverse();

  const seasonYears = seasons
    .map((s) => s.league.season)
    .sort((a, b) => parseInt(a) - parseInt(b));

  const leagueName = seasons[seasons.length - 1]?.league.name || "Fantasy League";

  return {
    managers,
    stats,
    headToHead,
    bestTeams,
    worstTeams,
    seasons: seasonYears,
    leagueName,
  };
}
