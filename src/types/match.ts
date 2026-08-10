// ── Cricket scoring types ─────────────────────────────────────────────────────

export interface KeyMoment {
  overNumber?: number;
  ballNumber?: number;
  description: string;
  tag: string;
  playerPublicId?: string;
  playerName?: string;
}

export type MatchType = "INTERNAL" | "INTER_ACADEMY" | "KSCA_TOURNAMENT" | "PRACTICE";
export type MatchStatus =
  | "SETUP"
  | "IN_PROGRESS"
  | "INNINGS_BREAK"
  | "SUPER_OVER"
  | "COMPLETED"
  | "ABANDONED";
export type DataSource = "BALL_BY_BALL" | "MANUAL" | "EXTERNAL";
export type TossDecision = "BAT" | "FIELD";
export type ResultType =
  | "WON_BY_RUNS"
  | "WON_BY_WICKETS"
  | "TIE"
  | "SUPER_OVER"
  | "DRAW"
  | "NO_RESULT"
  | "ABANDONED";

export interface TeamChecklist {
  batting: string[];
  bowling: string[];
  fielding: string[];
}

export interface TeamPerformanceComments {
  batting: string;
  bowling: string;
  fielding: string;
}

export interface IndividualObservation {
  playerPublicId: string;
  playerName: string;
  observation: string;
}

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
  resultMargin?: number;
  resultDescription?: string;
  playerOfMatchNote?: string;
  notes?: string;
  keyMoments?: KeyMoment[];
  tournament?: { name: string; publicId: string };
  // Ground conditions
  groundName?: string;
  groundNumber?: string;
  pitchType?: string;
  pitchCondition?: string;
  outfield?: string;
  weather?: string;
  matchFormat?: string;
  // Pitch analysis (Phase 3)
  bounce?: string;
  swingAvailable?: string;
  spinAvailable?: string;
  // Match report (Phase 3)
  positives?: TeamChecklist;
  improvements?: TeamChecklist;
  teamPerformanceComments?: TeamPerformanceComments;
  individualObservations?: IndividualObservation[];
  lessonsLearned?: string[];
  // Pause state (Stage 5) — null when not paused; match stays IN_PROGRESS during a pause
  pauseReason?: string;
  pausedAt?: string;
  // Item 4: when true, Playing XI cap is 12 instead of 11
  allowExtendedSquad?: boolean;
  // Match clock (V86) — all optional; no clock display when scheduledStartTime is absent
  scheduledStartTime?: string;       // "HH:MM:SS" from DB TIME column
  inningsIntervalMinutes?: number;   // per-match override; null = use overs-derived default
  totalBreakSeconds?: number;        // cumulative across all pauses this match
}

export interface UpdateExternalMatchRequest {
  resultType?: string;
  resultDescription?: string;
  resultMargin?: number;
  playerOfMatchPublicId?: string;
  playerOfMatchNote?: string;
  groundName?: string;
  groundNumber?: string;
  pitchType?: string;
  pitchCondition?: string;
  outfield?: string;
  weather?: string;
  matchFormat?: string;
  bounce?: string;
  swingAvailable?: string;
  spinAvailable?: string;
}

export interface CricketTeam {
  id: string;
  publicId: string;
  name: string;
  teamType: "TEAM_A" | "TEAM_B";
}

export interface MatchTeamPlayer {
  id: string;
  mtpPublicId: string;       // scoring identifier for both academy and guest players
  playerPublicId?: string;   // Player.publicId — for profile links; null for guests
  displayName: string;
  externalName?: string;     // set for guest players only
  battingStyle?: string;
  bowlingStyle?: string;
  photoUrl?: string;
  battingOrder?: number;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  isImpactPlayer: boolean;
  isForeign: boolean;
  // Substitution (Item 3)
  isSubstitutedOut?: boolean;
  isSubstitute?: boolean;
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
  notes?: string;
  // Item 4: when true, Playing XI cap is raised to 12
  allowExtendedSquad?: boolean;
  // Match clock — both optional
  scheduledStartTime?: string;     // "HH:MM" sent to backend
  inningsIntervalMinutes?: number;
  // Ground conditions — for EXTERNAL matches
  groundName?: string;
  groundNumber?: string;
  pitchType?: string;
  pitchCondition?: string;
  outfield?: string;
  weather?: string;
  matchFormat?: string;
}

export interface StaffEntry {
  name: string;
  role: string;
}

export interface SetTeamsRequest {
  teamAName: string;
  teamBName: string;
  teamAPlayers: PlayerSelection[];
  teamBPlayers: PlayerSelection[];
  teamAStaff?: StaffEntry[];
  teamBStaff?: StaffEntry[];
}

export interface PlayerSelection {
  playerPublicId: string;  // empty string for guest players
  externalName?: string;   // set for guest players; backend uses this when playerPublicId is blank
  battingOrder: number;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  isImpactPlayer: boolean;
  isForeign: boolean;
}

export interface TossRequest {
  winnerTeamPublicId: string;
  decision: TossDecision;
}
