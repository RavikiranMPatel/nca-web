export type HomepageSection = {
  publicId: string;
  sectionType: string;
  visible: boolean;
  displayOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Club = {
  publicId: string;
  name: string;
  ownerName?: string;
  ownerContact?: string;
  history?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  currentStanding?: ClubSeasonStandingData;
};

export type ClubPage = {
  content: Club[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type ClubMember = {
  publicId: string;
  clubPublicId: string;
  memberType: string;
  playerPublicId?: string;
  displayName?: string;
  photoUrl?: string;
  dob?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerRole?: string;
  gender?: string;
  status: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  honors?: ClubHonor[];
};

export type ClubMemberPage = {
  content: ClubMember[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type ClubHonor = {
  publicId: string;
  memberPublicId: string;
  level: string;
  title: string;
  description?: string;
  year: number;
  isCurrent?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ClubMemberAttendanceEntry = {
  batchName: string;
  status: string;
  overridden: boolean;
};

export type ClubMemberAttendance = {
  playerPublicId?: string;
  displayName?: string;
  sessions: ClubMemberAttendanceEntry[];
};

export type ClubRequest = {
  name: string;
  ownerName?: string;
  ownerContact?: string;
  history?: string;
};

export type ClubMemberRequest = {
  memberType: "INTERNAL" | "EXTERNAL";
  playerPublicId?: string;
  displayName?: string;
  photoUrl?: string;
  dob?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerRole?: string;
  gender?: string;
  status?: string;
};

export type ClubHonorRequest = {
  level: string;
  title: string;
  description?: string;
  year: number;
  isCurrent?: boolean;
};

export type PublicClub = {
  publicId: string;
  name: string;
  ownerName?: string;
  history?: string;
  totalMembers: number;
  alumniCount: number;
  currentStanding?: ClubSeasonStandingData;
};

export type PublicClubHonor = {
  publicId: string;
  level: string;
  title: string;
  description?: string;
  year: number;
  isCurrent?: boolean;
};

export type PublicClubMember = {
  publicId: string;
  memberType: string;
  displayName?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerRole?: string;
  gender?: string;
  status: string;
  honors: PublicClubHonor[];
};

export type PublicClubDetail = {
  publicId: string;
  name: string;
  ownerName?: string;
  history?: string;
  totalMembers: number;
  alumniCount: number;
  members: PublicClubMember[];
};

// ── Season / Squad / Stats ────────────────────────────────────────────────────

export type Season = {
  publicId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SeasonRequest = {
  name: string;
  startDate?: string;
  endDate?: string;
};

export type ClubSeasonSquadEntry = {
  publicId: string;
  memberPublicId: string;
  displayName?: string;
  photoUrl?: string;
  playerRole?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isWicketKeeper: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ClubSeasonSquadRequest = {
  memberPublicId: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isWicketKeeper?: boolean;
};

export type ClubSeasonStatsData = {
  publicId: string;
  matchType: string;
  topScorerMemberPublicId?: string;
  topScorerDisplayName?: string;
  topScorerRuns?: number;
  topWicketTakerMemberPublicId?: string;
  topWicketTakerDisplayName?: string;
  topWicketTakerWickets?: number;
  updatedAt: string;
};

export type ClubSeasonStatsRequest = {
  topScorerMemberPublicId?: string;
  topScorerRuns?: number;
  topWicketTakerMemberPublicId?: string;
  topWicketTakerWickets?: number;
};

export type ClubSeasonStandingData = {
  publicId: string;
  division: number;
  position?: number;
  movement?: 'PROMOTED' | 'RELEGATED' | 'RETAINED';
  updatedBy: string;
  updatedAt: string;
};

export type ClubSeasonStandingRequest = {
  division: number;
  position?: number;
  movement?: string;
};

export type ClubSeasonSummary = {
  seasonPublicId: string;
  seasonName: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  squad: ClubSeasonSquadEntry[];
  stats: ClubSeasonStatsData[];
  standing?: ClubSeasonStandingData;
};
