import api from "../axios";

// ==================== TYPES ====================

export type SlotType = "COACHED" | "SELF_PRACTICE";
export type FocusArea =
  | "BATTING"
  | "BOWLING"
  | "FIELDING"
  | "FITNESS"
  | "MENTAL"
  | "GENERAL";
export type CompletionStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";
export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED" | "DROPPED";
export type GoalPriority = "LOW" | "MEDIUM" | "HIGH";
export type MatchType = "PRACTICE_MATCH" | "TOURNAMENT" | "LEAGUE" | "FRIENDLY";
export type MatchResult = "WON" | "LOST" | "DRAW" | "NO_RESULT";

// ── Practice Day ──────────────────────────────────────────────────

export interface DrillAssignmentRequest {
  publicId?: string;
  name: string;
  description?: string;
  targetReps?: number;
  targetDuration?: string;
  dueDate?: string;
  completionStatus?: CompletionStatus;
  completionNotes?: string;
  isSharedWithPlayer?: boolean;
}

export interface PracticeSlotRequest {
  publicId?: string;
  startTime: string; // HH:mm
  durationMinutes: number;
  slotType: SlotType;
  focusArea: FocusArea;
  coachUserPublicId?: string;
  coachName?: string;
  coachNotes?: string;
  playerSummary?: string;
  drills?: DrillAssignmentRequest[];
}

export interface PracticeDayRequest {
  practiceDate: string;
  totalDurationMinutes?: number;
  overallCoachNote?: string;
  overallPlayerSummary?: string;
  isSharedWithPlayer?: boolean;
  mentalState?: Record<string, any>;
  status?: string;
  slots?: PracticeSlotRequest[];
}

export interface DrillAssignmentResponse {
  publicId: string;
  name: string;
  description?: string;
  targetReps?: number;
  targetDuration?: string;
  dueDate?: string;
  completionStatus: CompletionStatus;
  completionNotes?: string;
  isSharedWithPlayer: boolean;
  whatsappSent: boolean;
  createdAt: string;
}

export interface PracticeSlotResponse {
  publicId: string;
  startTime: string;
  durationMinutes: number;
  slotType: SlotType;
  focusArea: FocusArea;
  coachUserPublicId?: string;
  coachName?: string;
  coachNotes?: string;
  playerSummary?: string;
  drills: DrillAssignmentResponse[];
}

export interface PracticeDayResponse {
  publicId: string;
  playerPublicId: string;
  playerName: string;
  practiceDate: string;
  totalDurationMinutes: number;
  overallCoachNote?: string;
  overallPlayerSummary?: string;
  isSharedWithPlayer: boolean;
  mentalState?: Record<string, any>;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  slots?: PracticeSlotResponse[];
}

// ── Goals ─────────────────────────────────────────────────────────

export interface PlayerGoalRequest {
  title: string;
  description?: string;
  category: string;
  priority?: GoalPriority;
  targetDate?: string;
  status?: GoalStatus;
  isSharedWithPlayer?: boolean;
  spawnedFromPracticeDayPublicId?: string;
}

export interface GoalProgressNoteRequest {
  note: string;
  recordedAt: string;
}

export interface GoalProgressNoteResponse {
  publicId: string;
  note: string;
  recordedAt: string;
  createdBy?: string;
  createdAt: string;
}

export interface PlayerGoalResponse {
  publicId: string;
  playerPublicId: string;
  playerName: string;
  title: string;
  description?: string;
  category: string;
  priority: GoalPriority;
  targetDate?: string;
  status: GoalStatus;
  isSharedWithPlayer: boolean;
  spawnedFromPracticeDayPublicId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  progressNotes?: GoalProgressNoteResponse[];
}

// ── Match Performance ─────────────────────────────────────────────

export interface MatchPerformanceRequest {
  matchDate: string;
  matchType: MatchType;
  oppositionTeam?: string;
  venue?: string;
  result?: MatchResult;
  playerRole: string;
  battingStats?: Record<string, any>;
  bowlingStats?: Record<string, any>;
  fieldingStats?: Record<string, any>;
  mentalState?: Record<string, any>;
  coachObservations?: string;
  playerReflection?: string;
  isSharedWithPlayer?: boolean;
}

export interface MatchPerformanceResponse {
  publicId: string;
  playerPublicId: string;
  playerName: string;
  matchDate: string;
  matchType: MatchType;
  oppositionTeam?: string;
  venue?: string;
  result?: MatchResult;
  playerRole: string;
  battingStats?: Record<string, any>;
  bowlingStats?: Record<string, any>;
  fieldingStats?: Record<string, any>;
  mentalState?: Record<string, any>;
  coachObservations?: string;
  playerReflection?: string;
  isSharedWithPlayer: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== SERVICE ====================

export const coachingService = {
  // ── Practice Days ──────────────────────────────

  getPracticeDays: async (
    playerPublicId: string,
  ): Promise<PracticeDayResponse[]> => {
    const res = await api.get(`/admin/players/${playerPublicId}/practice-days`);
    return res.data;
  },

  getPracticeDay: async (
    playerPublicId: string,
    publicId: string,
  ): Promise<PracticeDayResponse> => {
    const res = await api.get(
      `/admin/players/${playerPublicId}/practice-days/${publicId}`,
    );
    return res.data;
  },

  createPracticeDay: async (
    playerPublicId: string,
    data: PracticeDayRequest,
  ): Promise<PracticeDayResponse> => {
    const res = await api.post(
      `/admin/players/${playerPublicId}/practice-days`,
      data,
    );
    return res.data;
  },

  updatePracticeDay: async (
    playerPublicId: string,
    publicId: string,
    data: PracticeDayRequest,
  ): Promise<PracticeDayResponse> => {
    const res = await api.put(
      `/admin/players/${playerPublicId}/practice-days/${publicId}`,
      data,
    );
    return res.data;
  },

  deletePracticeDay: async (
    playerPublicId: string,
    publicId: string,
  ): Promise<void> => {
    await api.delete(
      `/admin/players/${playerPublicId}/practice-days/${publicId}`,
    );
  },

  // ── Goals ──────────────────────────────────────

  getGoals: async (playerPublicId: string): Promise<PlayerGoalResponse[]> => {
    const res = await api.get(`/admin/players/${playerPublicId}/goals`);
    return res.data;
  },

  getGoal: async (
    playerPublicId: string,
    goalPublicId: string,
  ): Promise<PlayerGoalResponse> => {
    const res = await api.get(
      `/admin/players/${playerPublicId}/goals/${goalPublicId}`,
    );
    return res.data;
  },

  createGoal: async (
    playerPublicId: string,
    data: PlayerGoalRequest,
  ): Promise<PlayerGoalResponse> => {
    const res = await api.post(`/admin/players/${playerPublicId}/goals`, data);
    return res.data;
  },

  updateGoal: async (
    playerPublicId: string,
    goalPublicId: string,
    data: PlayerGoalRequest,
  ): Promise<PlayerGoalResponse> => {
    const res = await api.put(
      `/admin/players/${playerPublicId}/goals/${goalPublicId}`,
      data,
    );
    return res.data;
  },

  deleteGoal: async (
    playerPublicId: string,
    goalPublicId: string,
  ): Promise<void> => {
    await api.delete(`/admin/players/${playerPublicId}/goals/${goalPublicId}`);
  },

  addProgressNote: async (
    playerPublicId: string,
    goalPublicId: string,
    data: GoalProgressNoteRequest,
  ): Promise<GoalProgressNoteResponse> => {
    const res = await api.post(
      `/admin/players/${playerPublicId}/goals/${goalPublicId}/progress-notes`,
      data,
    );
    return res.data;
  },

  deleteProgressNote: async (
    playerPublicId: string,
    goalPublicId: string,
    notePublicId: string,
  ): Promise<void> => {
    await api.delete(
      `/admin/players/${playerPublicId}/goals/${goalPublicId}/progress-notes/${notePublicId}`,
    );
  },

  // ── Match Performances ─────────────────────────

  getMatches: async (
    playerPublicId: string,
  ): Promise<MatchPerformanceResponse[]> => {
    const res = await api.get(
      `/admin/players/${playerPublicId}/match-performances`,
    );
    return res.data;
  },

  getMatch: async (
    playerPublicId: string,
    publicId: string,
  ): Promise<MatchPerformanceResponse> => {
    const res = await api.get(
      `/admin/players/${playerPublicId}/match-performances/${publicId}`,
    );
    return res.data;
  },

  createMatch: async (
    playerPublicId: string,
    data: MatchPerformanceRequest,
  ): Promise<MatchPerformanceResponse> => {
    const res = await api.post(
      `/admin/players/${playerPublicId}/match-performances`,
      data,
    );
    return res.data;
  },

  updateMatch: async (
    playerPublicId: string,
    publicId: string,
    data: MatchPerformanceRequest,
  ): Promise<MatchPerformanceResponse> => {
    const res = await api.put(
      `/admin/players/${playerPublicId}/match-performances/${publicId}`,
      data,
    );
    return res.data;
  },

  deleteMatch: async (
    playerPublicId: string,
    publicId: string,
  ): Promise<void> => {
    await api.delete(
      `/admin/players/${playerPublicId}/match-performances/${publicId}`,
    );
  },
  completeDrill: async (
    drillPublicId: string,
    status: "COMPLETED" | "SKIPPED",
    completionNote?: string,
  ): Promise<void> => {
    await api.patch(`/player/coaching/drills/${drillPublicId}/complete`, {
      status,
      completionNote,
    });
  },
};

export default coachingService;
