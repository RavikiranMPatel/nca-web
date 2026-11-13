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
};

export type AuditSearchParams = {
  action?: string;
  actorPublicId?: string;
  entityType?: string;
  entityPublicId?: string;
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
  includeAttendance?: boolean;
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
