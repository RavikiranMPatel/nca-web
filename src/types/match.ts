// ── Cricket scoring types ─────────────────────────────────────────────────────

export type MatchType = "INTERNAL" | "INTER_ACADEMY" | "KSCA_TOURNAMENT";
export type MatchStatus =
  | "SETUP"
  | "IN_PROGRESS"
  | "INNINGS_BREAK"
  | "SUPER_OVER"
  | "COMPLETED"
  | "ABANDONED";
// Mirrors the comment on Fixture.java. Fixtures are otherwise untyped `any`
// throughout TournamentDetailPage, so the dropdown and the badge maps had
// nothing keeping them in sync with the backend.
export type FixtureStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED"
  | "ABANDONED"
  | "NO_RESULT"
  | "BYE";

export const FIXTURE_STATUSES: FixtureStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "POSTPONED",
  "ABANDONED",
  "NO_RESULT",
  "CANCELLED",
  "BYE",
];

// RAIN | BAD_LIGHT | GROUND_ISSUE | TEAM_ISSUE | OTHER — mirrors
// InterruptionReason.java, which validates these server-side.
export type InterruptionReason =
  "RAIN" | "BAD_LIGHT" | "GROUND_ISSUE" | "TEAM_ISSUE" | "OTHER";

export const INTERRUPTION_REASONS: {
  value: InterruptionReason;
  label: string;
}[] = [
  { value: "RAIN", label: "Rain" },
  { value: "BAD_LIGHT", label: "Bad Light" },
  { value: "GROUND_ISSUE", label: "Ground Issue" },
  { value: "TEAM_ISSUE", label: "Team Issue" },
  { value: "OTHER", label: "Other" },
];

export type DataSource = "BALL_BY_BALL" | "MANUAL";
export type TossDecision = "BAT" | "FIELD";
export type ResultType =
  | "WON_BY_RUNS"
  | "WON_BY_WICKETS"
  | "TIE"
  | "SUPER_OVER"
  | "DRAW"
  | "NO_RESULT"
  | "ABANDONED";

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
  tournament?: { name: string; publicId: string };
  pauseReason?: string | null;
  pausedAt?: string | null;
  playerOfMatch?: { publicId: string; displayName: string } | null;
  playerOfMatchNote?: string | null;
}

export interface CricketTeam {
  id: string;
  publicId: string;
  name: string;
  teamType: "TEAM_A" | "TEAM_B";
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
  playerRole?: string;
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
  fixturePublicId?: string;
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
