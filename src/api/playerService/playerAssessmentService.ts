/**
 * Player Assessment Service - API calls for performance analysis
 *
 * Endpoints:
 * GET    /api/admin/players/{playerPublicId}/assessments          - List all
 * POST   /api/admin/players/{playerPublicId}/assessments          - Create
 * GET    /api/admin/players/{playerPublicId}/assessments/{id}     - Get one (full JSONB)
 * PUT    /api/admin/players/{playerPublicId}/assessments/{id}     - Update
 * DELETE /api/admin/players/{playerPublicId}/assessments/{id}     - Delete
 * GET    /api/admin/players/{playerPublicId}/assessments/latest   - Latest completed
 */

import api from "../axios";

// ==================== TYPES ====================

export type AssessmentType = "WEEKLY" | "MONTHLY" | "FOLLOW_UP" | "CUSTOM";
export type PlayerRole = "BATSMEN" | "BOWLER" | "ALL_ROUNDER" | "WICKET_KEEPER";
export type RatingValue = "NEEDS_WORK" | "DEVELOPING" | "GOOD" | "EXCELLENT";
export type AssessmentStatus = "DRAFT" | "COMPLETED";

export interface SkillEntry {
  rating?: RatingValue;
  comment?: string;
}

export interface CricketSkillsData {
  batting?: {
    basics?: Record<string, SkillEntry>;
    intermediate?: Record<string, SkillEntry>;
    advanced?: Record<string, SkillEntry>;
  };
  bowling?: {
    basics?: Record<string, SkillEntry>;
    intermediate?: Record<string, SkillEntry>;
    advanced?: Record<string, SkillEntry>;
  };
  wicketKeeping?: {
    basics?: Record<string, SkillEntry>;
    intermediate?: Record<string, SkillEntry>;
    advanced?: Record<string, SkillEntry>;
  };
  balancePriority?: string; // For ALL_ROUNDER: BATTING_FOCUS, BOWLING_FOCUS, EQUAL
}

export interface FieldingData {
  common?: {
    basics?: Record<string, SkillEntry>;
    intermediate?: Record<string, SkillEntry>;
    advanced?: Record<string, SkillEntry>;
  };
  wicketKeeping?: {
    basics?: Record<string, SkillEntry>;
    intermediate?: Record<string, SkillEntry>;
    advanced?: Record<string, SkillEntry>;
  };
}

export interface FitnessData {
  endurance?: Record<string, SkillEntry>;
  speedAgility?: Record<string, SkillEntry>;
  strength?: Record<string, SkillEntry>;
  flexibility?: Record<string, SkillEntry>;
  bodyMetrics?: {
    height?: number;
    weight?: number;
    bmi?: number;
  };
  injuryTracker?: Record<string, SkillEntry>;
}

export interface DietData {
  currentAssessment?: Record<string, SkillEntry>;
  complianceRating?: RatingValue;
  recommendedPlan?: Record<string, SkillEntry>;
  supplements?: string;
  coachNotes?: string;
}

export interface MentalData {
  discipline?: Record<string, SkillEntry>;
  matchTemperament?: Record<string, SkillEntry>;
  teamBehavior?: Record<string, SkillEntry>;
  goalTracking?: {
    currentGoal?: string;
    progress?: string;
    nextMilestone?: string;
  };
}

export interface PlayerAssessmentRequest {
  assessmentDate: string; // ISO date
  assessmentType: AssessmentType;
  playerRole: PlayerRole;
  ageGroup?: string;
  cricketSkills?: CricketSkillsData;
  fielding?: FieldingData;
  fitness?: FitnessData;
  diet?: DietData;
  mental?: MentalData;
  overallRating?: RatingValue;
  overallSummary?: string;
  parentAssessmentPublicId?: string;
  status?: AssessmentStatus;
}

export interface PlayerAssessmentResponse {
  publicId: string;
  playerPublicId: string;
  playerName: string;
  assessmentDate: string;
  assessmentType: AssessmentType;
  playerRole: PlayerRole;
  ageGroup?: string;
  cricketSkills?: CricketSkillsData;
  fielding?: FieldingData;
  fitness?: FitnessData;
  diet?: DietData;
  mental?: MentalData;
  overallRating?: RatingValue;
  overallSummary?: string;
  parentAssessmentPublicId?: string;
  status: AssessmentStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== SERVICE ====================

export const playerAssessmentService = {
  /**
   * List all assessments for a player (timeline - lightweight)
   */
  getAll: async (
    playerPublicId: string,
  ): Promise<PlayerAssessmentResponse[]> => {
    const response = await api.get(
      `/admin/players/${playerPublicId}/assessments`,
    );
    return response.data;
  },

  /**
   * Get a single assessment with full JSONB data
   */
  getById: async (
    playerPublicId: string,
    assessmentPublicId: string,
  ): Promise<PlayerAssessmentResponse> => {
    const response = await api.get(
      `/admin/players/${playerPublicId}/assessments/${assessmentPublicId}`,
    );
    return response.data;
  },

  /**
   * Create a new assessment
   */
  create: async (
    playerPublicId: string,
    data: PlayerAssessmentRequest,
  ): Promise<PlayerAssessmentResponse> => {
    const response = await api.post(
      `/admin/players/${playerPublicId}/assessments`,
      data,
    );
    return response.data;
  },

  /**
   * Update an existing assessment
   */
  update: async (
    playerPublicId: string,
    assessmentPublicId: string,
    data: PlayerAssessmentRequest,
  ): Promise<PlayerAssessmentResponse> => {
    const response = await api.put(
      `/admin/players/${playerPublicId}/assessments/${assessmentPublicId}`,
      data,
    );
    return response.data;
  },

  /**
   * Delete an assessment (SUPER_ADMIN only)
   */
  delete: async (
    playerPublicId: string,
    assessmentPublicId: string,
  ): Promise<void> => {
    await api.delete(
      `/admin/players/${playerPublicId}/assessments/${assessmentPublicId}`,
    );
  },

  /**
   * Get the latest completed assessment (for follow-up)
   */
  getLatest: async (
    playerPublicId: string,
  ): Promise<PlayerAssessmentResponse> => {
    const response = await api.get(
      `/admin/players/${playerPublicId}/assessments/latest`,
    );
    return response.data;
  },
};

export default playerAssessmentService;
