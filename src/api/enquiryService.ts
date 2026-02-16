/**
 * Enquiry Service - Centralized API calls for enquiry management
 *
 * Usage:
 * import { enquiryService } from '../api/enquiryService';
 * const enquiries = await enquiryService.getAllEnquiries();
 */

import api from "./axios";

// ==================== TYPES ====================

export type EnquirySource =
  | "WALK_IN"
  | "PHONE_CALL"
  | "WEBSITE"
  | "REFERRAL"
  | "OTHER";

export type EnquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "FOLLOW_UP_1"
  | "FOLLOW_UP_2"
  | "FOLLOW_UP_3"
  | "ENROLLED"
  | "NOT_ENROLLED"
  | "LOST";

export type FollowUpMethod =
  | "EMAIL"
  | "WHATSAPP"
  | "PHONE"
  | "IN_PERSON"
  | "BOTH";

export interface Batch {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface EnquiryListItem {
  publicId: string;
  childName: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  enquiryDate: string;
  enquirySource: EnquirySource;
  status: EnquiryStatus;
  followUpCount: number;
  nextFollowUpDate?: string;
  preferredBatches: Batch[];
}

export interface EnquiryDetails {
  publicId: string;
  childName: string;
  childDob?: string;
  childGender?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
  preferredBatches: Batch[];
  enquiryDate: string;
  enquirySource: EnquirySource;
  notes?: string;
  status: EnquiryStatus;
  followUpCount: number;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  convertedToPlayerId?: string;
  convertedDate?: string;
  followUpHistory: FollowUpHistoryItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface FollowUpHistoryItem {
  followUpNumber: number;
  followUpDate: string;
  method: FollowUpMethod;
  notes?: string;
  response?: string;
  createdBy: string;
}

export interface EnquiryFormData {
  childName: string;
  childDob?: string;
  childGender?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
  preferredBatchIds: string[];
  enquiryDate: string;
  enquirySource: EnquirySource;
  notes?: string;
}

export interface SendFollowUpRequest {
  method: FollowUpMethod;
  notes?: string;
}

export interface UpdateStatusRequest {
  status: EnquiryStatus;
  reason?: string;
}

export interface ConvertToPlayerRequest {
  playerId?: string; // If converting to existing player
  createNewPlayer: boolean;
  playerData?: {
    displayName: string;
    dob?: string;
    gender?: string;
    phone?: string;
    parentsPhone: string;
    email?: string;
    address?: string;
    profession: string;
    batchIds: string[];
    joiningDate: string;
    notes?: string;
  };
}

export interface EnquiryStats {
  totalEnquiries: number;
  thisWeekEnquiries: number;
  thisMonthEnquiries: number;
  statusBreakdown: {
    [key in EnquiryStatus]: number;
  };
  pendingFollowUpsToday: number;
  overdueFollowUps: number;
  conversionRate: number;
  sourceBreakdown: {
    [key in EnquirySource]: number;
  };
}

// ==================== SERVICE ====================

export const enquiryService = {
  /**
   * Get all enquiries
   */
  getAllEnquiries: async (): Promise<EnquiryListItem[]> => {
    const response = await api.get("/admin/enquiries");
    return response.data;
  },

  /**
   * Get enquiry by public ID
   */
  getEnquiryById: async (publicId: string): Promise<EnquiryDetails> => {
    const response = await api.get(`/admin/enquiries/${publicId}`);
    return response.data;
  },

  /**
   * Create new enquiry
   */
  createEnquiry: async (data: EnquiryFormData): Promise<any> => {
    const response = await api.post("/admin/enquiries", data);
    return response.data;
  },

  /**
   * Update existing enquiry
   */
  updateEnquiry: async (
    publicId: string,
    data: EnquiryFormData,
  ): Promise<any> => {
    const response = await api.put(`/admin/enquiries/${publicId}`, data);
    return response.data;
  },

  /**
   * Send follow-up
   */
  sendFollowUp: async (
    publicId: string,
    data: SendFollowUpRequest,
  ): Promise<any> => {
    const response = await api.post(
      `/admin/enquiries/${publicId}/follow-up`,
      data,
    );
    return response.data;
  },

  /**
   * Update enquiry status
   */
  updateStatus: async (
    publicId: string,
    data: UpdateStatusRequest,
  ): Promise<any> => {
    const response = await api.put(`/admin/enquiries/${publicId}/status`, data);
    return response.data;
  },

  /**
   * Convert enquiry to player
   * Only for SUPER_ADMIN
   */
  convertToPlayer: async (
    publicId: string,
    data: ConvertToPlayerRequest,
  ): Promise<any> => {
    // ✅ Send playerData directly (backend expects flat PlayerDTO)
    const payload = data.playerData || data;

    const response = await api.post(
      `/admin/enquiries/${publicId}/convert`,
      payload, // ✅ Send flat structure
    );
    return response.data;
  },

  /**
   * Get enquiry statistics
   */
  getStats: async (): Promise<EnquiryStats> => {
    const response = await api.get("/admin/enquiries/stats");
    return response.data;
  },

  /**
   * Search enquiries
   */
  searchEnquiries: async (query: string): Promise<EnquiryListItem[]> => {
    const response = await api.get("/admin/enquiries/search", {
      params: { q: query },
    });
    return response.data;
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get status badge color
 */
export function getStatusColor(status: EnquiryStatus): string {
  const colors: Record<EnquiryStatus, string> = {
    NEW: "bg-blue-100 text-blue-700",
    CONTACTED: "bg-purple-100 text-purple-700",
    FOLLOW_UP_1: "bg-yellow-100 text-yellow-700",
    FOLLOW_UP_2: "bg-orange-100 text-orange-700",
    FOLLOW_UP_3: "bg-red-100 text-red-700",
    ENROLLED: "bg-green-100 text-green-700",
    NOT_ENROLLED: "bg-gray-100 text-gray-700",
    LOST: "bg-gray-200 text-gray-600",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

/**
 * Get status display text
 */
export function getStatusText(status: EnquiryStatus): string {
  const texts: Record<EnquiryStatus, string> = {
    NEW: "New",
    CONTACTED: "Contacted",
    FOLLOW_UP_1: "Follow-up 1",
    FOLLOW_UP_2: "Follow-up 2",
    FOLLOW_UP_3: "Follow-up 3",
    ENROLLED: "Enrolled",
    NOT_ENROLLED: "Not Enrolled",
    LOST: "Lost",
  };
  return texts[status] || status;
}

/**
 * Get source display text
 */
export function getSourceText(source: EnquirySource): string {
  const texts: Record<EnquirySource, string> = {
    WALK_IN: "Walk-in",
    PHONE_CALL: "Phone Call",
    WEBSITE: "Website",
    REFERRAL: "Referral",
    OTHER: "Other",
  };
  return texts[source] || source;
}

/**
 * Format follow-up method for display
 */
export function getMethodText(method: FollowUpMethod): string {
  const texts: Record<FollowUpMethod, string> = {
    EMAIL: "Email",
    WHATSAPP: "WhatsApp",
    PHONE: "Phone",
    IN_PERSON: "In-Person",
    BOTH: "Email + WhatsApp",
  };
  return texts[method] || method;
}

/**
 * Check if follow-up is overdue
 */
export function isFollowUpOverdue(nextFollowUpDate?: string): boolean {
  if (!nextFollowUpDate) return false;
  return new Date(nextFollowUpDate) < new Date();
}

// Export as default
export default enquiryService;
