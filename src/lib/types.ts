// Sleeper API response types

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  previous_league_id: string | null;
  total_rosters: number;
  settings: {
    playoff_week_start: number;
    leg: number;
    [key: string]: unknown;
  };
  avatar: string | null;
  [key: string]: unknown;
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: {
    team_name?: string;
    [key: string]: unknown;
  };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  [key: string]: unknown;
}

export interface BracketMatch {
  r: number; // round
  m: number; // match number
  t1: number; // team 1 roster_id
  t2: number; // team 2 roster_id
  w: number; // winner roster_id
  l: number; // loser roster_id
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
  p?: number; // placement (1 = championship, 3 = 3rd place)
}

// Aggregated types

export interface Manager {
  userId: string;
  displayName: string;
  avatar: string | null;
  teamNames: Record<string, string>; // season -> team name
}

export interface ManagerStats {
  userId: string;
  totalPointsFor: number;
  totalPointsAgainst: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  pointDifferential: number;
  winPercentage: number;
  championships: number;
  secondPlace: number;
  thirdPlace: number;
  luckyWins: number;
  unluckyLosses: number;
  seasonsPlayed: number;
}

export interface HeadToHeadRecord {
  managerId1: string;
  managerId2: string;
  wins1: number;
  wins2: number;
  ties: number;
}

export interface SeasonTeam {
  userId: string;
  displayName: string;
  teamName: string;
  season: string;
  pointsFor: number;
  wins: number;
  losses: number;
  record: string;
}

export interface SeasonData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  matchups: SleeperMatchup[][]; // matchups[week] = matchups for that week
  winnersBracket: BracketMatch[];
  rosterToOwner: Record<number, string>; // roster_id -> owner_id
}

export interface AggregatedData {
  managers: Record<string, Manager>;
  stats: Record<string, ManagerStats>;
  headToHead: HeadToHeadRecord[];
  bestTeams: SeasonTeam[];
  worstTeams: SeasonTeam[];
  seasons: string[];
  leagueName: string;
}
