/**
 * Summer Camp Service - Centralized API calls for summer camp management
 *
 * Usage:
 * import { summerCampService } from '../services/summerCampService';
 * const camps = await summerCampService.getAllCamps();
 */

import api from "../api/axios";
import type {
  SummerCamp,
  SummerCampCreateRequest,
  SummerCampUpdateRequest,
  SummerCampFeeRule,
  FeeRuleCreateRequest,
  SummerCampEnrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  PaymentRecordRequest,
  SummerCampAttendanceRecord,
  SummerCampAttendanceBulkRequest,
  ConversionRequest,
  ConversionResponse,
  SummerCampStats,
  EnrollmentAttendanceSummary,
} from "../types/summercamp";

// ==================== SUMMER CAMP MANAGEMENT ====================

export const summerCampService = {
  // ==================== CAMPS ====================

  /**
   * Get all summer camps
   */
  getAllCamps: async (activeOnly: boolean = false): Promise<SummerCamp[]> => {
    const url = activeOnly
      ? "/admin/summer-camps?activeOnly=true"
      : "/admin/summer-camps";
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get camp by ID
   */
  getCampById: async (campId: string): Promise<SummerCamp> => {
    const response = await api.get(`/admin/summer-camps/${campId}`);
    return response.data;
  },

  /**
   * Create new summer camp
   */
  createCamp: async (data: SummerCampCreateRequest): Promise<SummerCamp> => {
    const response = await api.post("/admin/summer-camps", data);
    return response.data;
  },

  /**
   * Update existing camp
   */
  updateCamp: async (
    campId: string,
    data: SummerCampUpdateRequest,
  ): Promise<SummerCamp> => {
    const response = await api.put(`/admin/summer-camps/${campId}`, data);
    return response.data;
  },

  /**
   * Delete camp (soft delete)
   */
  deleteCamp: async (campId: string): Promise<void> => {
    await api.delete(`/admin/summer-camps/${campId}`);
  },

  /**
   * Get camp statistics
   */
  getCampStats: async (campId: string): Promise<SummerCampStats> => {
    const response = await api.get(`/admin/summer-camps/${campId}/stats`);
    return response.data;
  },

  // ==================== FEE RULES ====================

  /**
   * Get fee rules for a camp
   */
  getFeeRules: async (campId: string): Promise<SummerCampFeeRule[]> => {
    const response = await api.get(`/admin/summer-camps/${campId}/fee-rules`);
    return response.data;
  },

  /**
   * Set fee rules for a camp (replaces existing)
   */
  setFeeRules: async (
    campId: string,
    feeRules: FeeRuleCreateRequest[],
  ): Promise<SummerCampFeeRule[]> => {
    const response = await api.put(
      `/admin/summer-camps/${campId}/fee-rules`,
      { rules: feeRules }, // ✅ Backend expects { rules: [...] }
    );
    return response.data;
  },

  // ==================== ENROLLMENTS ====================

  /**
   * Get all enrollments for a camp
   */
  getEnrollments: async (campId: string): Promise<SummerCampEnrollment[]> => {
    const response = await api.get(`/admin/summer-camps/${campId}/enrollments`);
    return response.data;
  },

  /**
   * Get enrollment by ID
   */
  getEnrollmentById: async (
    campId: string,
    enrollmentId: string,
  ): Promise<SummerCampEnrollment> => {
    const response = await api.get(
      `/admin/summer-camps/${campId}/enrollments/${enrollmentId}`,
    );
    return response.data;
  },

  /**
   * Create new enrollment
   */
  createEnrollment: async (
    campId: string,
    data: EnrollmentCreateRequest,
  ): Promise<SummerCampEnrollment> => {
    const response = await api.post(
      `/admin/summer-camps/${campId}/enrollments`,
      data,
    );
    return response.data;
  },

  /**
   * Update enrollment
   */
  updateEnrollment: async (
    campId: string,
    enrollmentId: string,
    data: EnrollmentUpdateRequest,
  ): Promise<SummerCampEnrollment> => {
    const response = await api.put(
      `/admin/summer-camps/${campId}/enrollments/${enrollmentId}`,
      data,
    );
    return response.data;
  },

  /**
   * Delete enrollment
   */
  deleteEnrollment: async (
    campId: string,
    enrollmentId: string,
  ): Promise<void> => {
    await api.delete(
      `/admin/summer-camps/${campId}/enrollments/${enrollmentId}`,
    );
  },

  /**
   * Record payment for enrollment
   */
  recordPayment: async (
    campId: string,
    enrollmentId: string,
    payment: PaymentRecordRequest,
  ): Promise<SummerCampEnrollment> => {
    const response = await api.post(
      `/admin/summer-camps/${campId}/enrollments/${enrollmentId}/payment`,
      payment,
    );
    return response.data;
  },

  // ==================== ATTENDANCE ====================

  /**
   * Submit bulk attendance
   */
  submitBulkAttendance: async (
    campId: string,
    data: SummerCampAttendanceBulkRequest,
  ): Promise<void> => {
    await api.post(
      `/admin/summer-camps/${campId}/attendance/bulk`,
      {
        records: data.records, // ✅ wrap inside object
      },
      {
        params: {
          date: data.date,
          batchId: data.batchId,
        },
      },
    );
  },

  /**
   * Get attendance records for a date and batch
   */
  getAttendanceRecords: async (
    campId: string,
    date: string,
    batchId: string,
  ): Promise<SummerCampAttendanceRecord[]> => {
    const response = await api.get(
      `/admin/summer-camps/${campId}/attendance/records`,
      {
        params: { date, batchId },
      },
    );
    return response.data;
  },

  /**
   * Get attendance summary for an enrollment
   */
  getEnrollmentAttendance: async (
    campId: string,
    enrollmentId: string,
  ): Promise<EnrollmentAttendanceSummary> => {
    const response = await api.get(
      `/admin/summer-camps/${campId}/enrollments/${enrollmentId}/attendance/summary`,
    );
    return response.data;
  },

  // ==================== CONVERSION ====================

  /**
   * Convert summer camp enrollment to regular player
   */
  convertToRegular: async (
    campId: string,
    enrollmentId: string,
    data: ConversionRequest,
  ): Promise<ConversionResponse> => {
    const response = await api.post(
      `/admin/summer-camps/${campId}/enrollments/${enrollmentId}/convert`,
      data,
    );
    return response.data;
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format date for display
 */
export function formatCampDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format date range
 */
export function formatCampDateRange(
  startDate: string,
  endDate: string,
): string {
  return `${formatCampDate(startDate)} - ${formatCampDate(endDate)}`;
}

/**
 * Calculate camp duration in days
 */
export function calculateCampDuration(
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get enrollment status color
 */
export function getEnrollmentStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "ACTIVE":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "CONVERTED":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "WITHDRAWN":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
      };
    case "INACTIVE":
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
      };
  }
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "PAID":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "PARTIAL":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        border: "border-yellow-200",
      };
    case "PENDING":
      return {
        bg: "bg-orange-100",
        text: "text-orange-700",
        border: "border-orange-200",
      };
    case "OVERDUE":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
      };
  }
}

export default summerCampService;
