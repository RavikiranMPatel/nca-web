import api from "./axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string;
  createdAt: string;
  createdBy: string | null;
  actorPublicId: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityPublicId: string | null;
  // The backend returns the raw JSONB column — shape varies entirely by action,
  // which is exactly why this page renders it as formatted JSON rather than
  // trying to interpret it.
  details: unknown;
};

export type AuditPage = {
  content: AuditLogEntry[];
  totalElements: number;
  totalPages: number;
  number: number; // current page, 0-based
  size: number;
  first: boolean;
  last: boolean;
};

export type AuditFilterOptions = {
  actions: string[];
  entityTypes: string[];
  actors: { actorPublicId: string; label: string }[];
  attendanceBatchNames: string[];
};

export type AuditSearchParams = {
  action?: string;
  actorPublicId?: string;
  entityType?: string;
  entityPublicId?: string;
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
  includeAttendance?: boolean;
  attendanceDate?: string; // yyyy-MM-dd — which day's attendance this concerns, not when it was recorded
  batchName?: string;
  page?: number;
  size?: number;
};

export const searchAuditLog = async (
  params: AuditSearchParams,
): Promise<AuditPage> => {
  const res = await api.get<AuditPage>("/admin/audits", { params });
  return res.data;
};

export const getAuditFilterOptions = async (): Promise<AuditFilterOptions> => {
  const res = await api.get<AuditFilterOptions>("/admin/audits/filter-options");
  return res.data;
};

// ── Login events ─────────────────────────────────────────────────────────────
// Deliberately a separate table/endpoint, not audit_logs — the shape doesn't
// overlap enough (IP/UA/success-failure vs action/entityType/details) to share one.

export type LoginEventEntry = {
  id: string;
  createdAt: string;
  emailAttempted: string;
  userId: string | null;
  userPublicId: string | null;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type LoginEventPage = {
  content: LoginEventEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type LoginEventFilterOptions = {
  users: { userPublicId: string; label: string }[];
};

export type LoginEventSearchParams = {
  userPublicId?: string;
  success?: boolean;
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
  page?: number;
  size?: number;
};

export const searchLoginEvents = async (
  params: LoginEventSearchParams,
): Promise<LoginEventPage> => {
  const res = await api.get<LoginEventPage>("/admin/login-events", { params });
  return res.data;
};

export const getLoginEventFilterOptions = async (): Promise<LoginEventFilterOptions> => {
  const res = await api.get<LoginEventFilterOptions>("/admin/login-events/filter-options");
  return res.data;
};
