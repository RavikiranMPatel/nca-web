export interface BallRequest {
  bowlerPublicId: string;
  batsmanPublicId: string;
  nonStrikerPublicId: string;
  runsBatsman: number;
  runsExtras?: number;
  extraType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY' | null;
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

export interface BallResponse {
  inningsState: InningsState;
  lastBall?: BallDTO;
  overComplete: boolean;
  inningsComplete: boolean;
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
  publicId: string;
  displayName: string;
  battingStyle?: string;
  bowlingStyle?: string;
}
