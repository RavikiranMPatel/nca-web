// ==========================================
// BATCH TYPES - Flexible Batch System
// ==========================================

export type Batch = {
  id: string;
  name: string; // e.g., "Morning Session", "Evening Batch", "Night Training"
  startTime: string; // HH:mm format, e.g., "06:30"
  endTime: string; // HH:mm format, e.g., "08:00"
  active: boolean;
  description?: string;
  color?: string;
  moduleType: string;
  createdAt: string;
  updatedAt: string;
};

export type BatchCreateRequest = {
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
  color?: string;
  moduleType: string;
};

export type BatchUpdateRequest = {
  name?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  color?: string;
  moduleType: string;
  active?: boolean;
};

export type PlayerBatchAssignment = {
  playerId: string;
  batchIds: string[]; // Array of batch IDs the player is enrolled in
};

// Updated Player type with flexible batches
export type Player = {
  id: string;
  publicId: string;
  displayName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  batches: Batch[]; // Array of batches instead of single batch enum
  joiningDate: string;
  active: boolean;
  phoneNumber?: string;
  email?: string;
};

// Attendance types updated for flexible batches
export type AttendanceStatus = "PRESENT" | "ABSENT" | "OVERRIDDEN";

export type AttendanceRecord = {
  id: string;
  playerId: string;
  batchId: string; // Reference to specific batch
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
  overridden: boolean;
  oldStatus?: AttendanceStatus;
  newStatus?: AttendanceStatus;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
};

export type AttendanceSession = {
  date: string;
  batch: Batch; // Full batch object instead of enum
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
};

export type BulkAttendanceRequest = {
  date: string;
  batchId: string; // Specific batch ID
  records: {
    playerId: string;
    status: AttendanceStatus;
  }[];
};

export type SessionStatus = {
  locked: boolean;
  editable: boolean;
  sessionExists: boolean;
  attendanceMarked: boolean;
  batchId: string;
  batchName: string;
};
