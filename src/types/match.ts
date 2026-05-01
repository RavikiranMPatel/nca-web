// ── Cricket scoring types ─────────────────────────────────────────────────────

export type MatchType = 'INTERNAL' | 'INTER_ACADEMY' | 'KSCA_TOURNAMENT';
export type MatchStatus = 'SETUP' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'SUPER_OVER' | 'COMPLETED' | 'ABANDONED';
export type DataSource = 'BALL_BY_BALL' | 'MANUAL';
export type TossDecision = 'BAT' | 'FIELD';
export type ResultType = 'WON_BY_RUNS' | 'WON_BY_WICKETS' | 'TIE' | 'SUPER_OVER' | 'DRAW' | 'NO_RESULT' | 'ABANDONED';

export interface CricketMatch {
  id: string;
  publicId: string;
  title: string;
  matchType: MatchType;
  status: MatchStatus;
  matchDate: string;
  venue?: string;
  totalOvers: number;
  ballsPerOver: number;
  dataSource: DataSource;
  tossDecision?: TossDecision;
  resultType?: ResultType;
  resultDescription?: string;
  tournamentName?: string;
}

export interface CricketTeam {
  id: string;
  publicId: string;
  name: string;
  teamType: 'TEAM_A' | 'TEAM_B';
}

export interface MatchTeamPlayer {
  id: string;
  player: {
    publicId: string;
    displayName: string;
    battingStyle?: string;
    bowlingStyle?: string;
    photoUrl?: string;
  };
  battingOrder?: number;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  isImpactPlayer: boolean;
}

export interface PlayerOption {
  publicId: string;
  displayName: string;
  battingStyle?: string;
  bowlingStyle?: string;
}

export interface CreateMatchRequest {
  title: string;
  matchDate: string;
  matchType: MatchType;
  venue?: string;
  totalOvers: number;
  ballsPerOver?: number;
  dataSource?: DataSource;
  tournamentPublicId?: string;
  notes?: string;
}

export interface SetTeamsRequest {
  teamAName: string;
  teamBName: string;
  teamAPlayers: PlayerSelection[];
  teamBPlayers: PlayerSelection[];
}

export interface PlayerSelection {
  playerPublicId: string;
  battingOrder: number;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  isImpactPlayer: boolean;
}

export interface TossRequest {
  winnerTeamPublicId: string;
  decision: TossDecision;
}
