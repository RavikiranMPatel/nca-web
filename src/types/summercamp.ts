// ==========================================
// SUMMER CAMP TYPES
// ==========================================

import type { Batch } from "./batch.types";

export type SummerCamp = {
  id: string; // UUID (internal)
  publicId: string; // Public ID (CAMP_1, CAMP_2, etc.) - Use this for URLs
  name: string;
  year: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description?: string;
  maxEnrollments?: number;
  currentEnrollments: number;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  campType?: string;
};

export type SummerCampCreateRequest = {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  description?: string;
  maxEnrollments?: number;
  campType?: string;
};

export type SummerCampUpdateRequest = {
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  maxEnrollments?: number;
  isActive?: boolean; // ← CHANGED from "active" to match backend
  status?: string; // DRAFT | ACTIVE | COMPLETED | CANCELLED
  campType?: string; // ✅ ADD THIS
};

// Fee Rules - Batch-Based Pricing
// Admin sets fees based on number of batches student enrolls in
// Example: 1 batch = ₹5000, 2 batches = ₹7500, 3 batches = ₹10000

export type SummerCampFeeRule = {
  id: string;
  publicId: string;
  batchCount: number; // Number of batches (1, 2, 3...)
  feeAmount: number; // Fee for that batch count
  version: number;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeeRuleCreateRequest = {
  batchCount: number; // Number of batches
  feeAmount: number; // Fee amount for this batch count
};

export type FeeRuleUpdateRequest = {
  batchCount?: number;
  feeAmount?: number;
};

// Enrollments
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
export type EnrollmentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "CONVERTED"
  | "WITHDRAWN";

export type SummerCampEnrollment = {
  id: string;
  publicId: string;
  campId: string;
  campName: string;
  playerName: string;
  playerPhone?: string;
  playerEmail?: string;
  parentName?: string;
  parentPhone?: string;
  enrolledAt: string; // ← Changed from enrollmentDate to match backend
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  totalFee: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  batchIds: string[];
  batchNames: string[];
  createdAt: string;
  updatedAt: string;
};

export type EnrollmentCreateRequest = {
  playerName: string;
  playerPhone?: string;
  playerEmail?: string;
  parentName?: string;
  parentPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  batchIds: string[]; // Array of batch IDs
  notes?: string;
};

export type EnrollmentUpdateRequest = {
  playerName?: string;
  playerPhone?: string;
  playerEmail?: string;
  parentName?: string;
  parentPhone?: string;
  batchIds?: string[];
  notes?: string;
  status?: EnrollmentStatus;
};

// Payment
export type PaymentRecordRequest = {
  amount: number;
  paymentMode: string; // ← Changed from paymentMethod to match backend
  paymentReference?: string; // ← Changed from transactionId to match backend
  notes?: string;
};

// Attendance
export type SummerCampAttendanceRecord = {
  id: string;
  enrollmentId: string;
  playerName: string;
  batchId: string;
  batchName: string;
  date: string; // YYYY-MM-DD
  status: "PRESENT" | "ABSENT";
  markedAt: string;
  markedBy: string;
};

export type BulkAttendanceItem = {
  enrollmentId: string;
  status: "PRESENT" | "ABSENT";
};

export type SummerCampAttendanceBulkRequest = {
  date: string;
  batchId: string;
  records: BulkAttendanceItem[];
};

// Conversion
export type ConversionRequest = {
  batchIds: string[]; // Batches to assign when converting to regular player
  joiningDate: string; // YYYY-MM-DD
  notes?: string;
};

export type ConversionResponse = {
  success: boolean;
  message: string;
  playerPublicId?: string;
  playerName?: string;
};

// Statistics
export type SummerCampStats = {
  campId: string;
  campName: string;
  totalEnrollments: number;
  activeEnrollments: number;
  convertedEnrollments: number;
  totalRevenue: number;
  pendingRevenue: number;
  attendanceRate: number;
};

export type EnrollmentAttendanceSummary = {
  enrollmentId: string;
  playerName: string;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  attendancePercentage: number;
};
