export interface BallRequest {
  bowlerPublicId: string;
  batsmanPublicId: string;
  nonStrikerPublicId: string;
  runsBatsman: number;
  runsExtras?: number;
  extraType?: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE" | "PENALTY" | null;
  isWicket?: boolean;
  dismissalType?: string;
  dismissedPlayerPublicId?: string;
  fielderPublicId?: string;
  fielder2PublicId?: string;
  isFreeHit?: boolean;
}

export interface InningsState {
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  overNumber: number;
  ballInOver: number;
  extrasWide: number;
  extrasNoBall: number;
  extrasBye: number;
  extrasLegBye: number;
  currentRunRate: number;
  target?: number;
  requiredRuns?: number;
  inningsNumber?: number;
}

export interface BallDTO {
  runsBatsman: number;
  runsExtras: number;
  extraType?: string;
  isWicket: boolean;
  dismissalType?: string;
  isLegalBall: boolean;
  sequenceNumber: number;
  displayLabel: string;
  displayClass: string;
}

export interface BatterStatDTO {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalType?: string;
}

export interface BowlerStatDTO {
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  dots: number;
  wides: number;
  noBalls: number;
}

export interface BallResponse {
  inningsState: InningsState;
  lastBall?: BallDTO;
  overComplete: boolean;
  inningsComplete: boolean;
  lastDeliveryPublicId?: string;
  // Server-persisted player state — same key space (player PLY-NCA-x publicId)
  currentStrikerPublicId?: string | null;
  currentNonStrikerPublicId?: string | null;
  currentBowlerPublicId?: string | null;
  lastBowlerPublicId?: string | null;
  prevSuperOverBowlerPublicId?: string | null;
  isFreeHit: boolean;
  overJustEnded: boolean;
  partnershipRuns: number;
  partnershipBalls: number;
  batterStats?: Record<string, BatterStatDTO>;
  bowlerStats?: Record<string, BowlerStatDTO>;
  dismissedMtpPublicIds?: string[];
  runnerPublicId?: string | null;
  runnerName?: string | null;
  runnerForPublicId?: string | null;
  runnerForName?: string | null;
}

export interface Delivery {
  id: string;
  runsBatsman: number;
  runsExtras: number;
  extraType?: string;
  isWicket: boolean;
  isLegalBall: boolean;
  displayLabel?: string;
  displayClass?: string;
}

export interface ScoringPlayer {
  id?: string;
  publicId: string;
  displayName: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isWicketkeeper?: boolean;
  isCaptain?: boolean;
  playerRole?: string;
}
