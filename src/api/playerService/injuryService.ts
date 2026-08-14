import api from "../axios";

export interface PlayerInjuryRequest {
  bodyPart: string;
  injuryType?: string;
  location?: string; // ON_GROUND | WHILE_PRACTICING | IN_GYM | DURING_MATCH | OTHER
  activity?: string;
  injuryDate: string; // ISO date "YYYY-MM-DD"
  doctorTreated?: boolean;
  expectedRecoveryDate?: string;
  actualRecoveryDate?: string;
  status?: string; // UNDER_REHAB | RECOVERING | RECOVERED
  notes?: string;
  medicalStaffId?: string;
  physioSessionsCount?: number;
  rehabCompliance?: string; // EXCELLENT | GOOD | PARTIAL | NON_COMPLIANT
}

export interface PlayerInjuryResponse {
  publicId: string;
  playerPublicId: string;
  playerName: string;
  bodyPart: string;
  injuryType?: string;
  location?: string;
  activity?: string;
  injuryDate: string;
  doctorTreated: boolean;
  expectedRecoveryDate?: string;
  actualRecoveryDate?: string;
  status: string;
  doctorReportUrl?: string;
  notes?: string;
  medicalStaffId?: string;
  medicalStaffName?: string;
  physioSessionsCount?: number;
  rehabCompliance?: string;
  recurrenceCount: number;
  createdAt: string;
  createdBy?: string;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface InjuryDashboardResponse {
  totalInjuries: number;
  activeInjuries: number;
  recovered: number;
  avgRecoveryDays?: number;
  bodyPartBreakdown: BreakdownItem[];
  locationBreakdown: BreakdownItem[];
  recentInjuries: PlayerInjuryResponse[];
}

export interface MedicalStaffOption {
  publicId: string;
  name: string;
  role: string;
}

export const injuryService = {
  list(playerPublicId: string): Promise<PlayerInjuryResponse[]> {
    return api.get(`/admin/players/${playerPublicId}/injuries`).then((r) => r.data);
  },

  get(playerPublicId: string, injuryPublicId: string): Promise<PlayerInjuryResponse> {
    return api.get(`/admin/players/${playerPublicId}/injuries/${injuryPublicId}`).then((r) => r.data);
  },

  create(playerPublicId: string, req: PlayerInjuryRequest): Promise<PlayerInjuryResponse> {
    return api.post(`/admin/players/${playerPublicId}/injuries`, req).then((r) => r.data);
  },

  update(playerPublicId: string, injuryPublicId: string, req: PlayerInjuryRequest): Promise<PlayerInjuryResponse> {
    return api.put(`/admin/players/${playerPublicId}/injuries/${injuryPublicId}`, req).then((r) => r.data);
  },

  uploadDoctorReport(playerPublicId: string, injuryPublicId: string, file: File): Promise<PlayerInjuryResponse> {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/admin/players/${playerPublicId}/injuries/${injuryPublicId}/doctor-report`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  dashboard(params?: { from?: string; to?: string }): Promise<InjuryDashboardResponse> {
    return api.get("/admin/injuries/dashboard", { params }).then((r) => r.data);
  },

  listMedicalStaff(): Promise<MedicalStaffOption[]> {
    return api.get("/admin/medical-staff/active").then((r) => r.data);
  },
};

export const INJURY_LOCATIONS: Record<string, string> = {
  ON_GROUND: "On Ground",
  WHILE_PRACTICING: "While Practicing",
  IN_GYM: "In Gym",
  DURING_MATCH: "During Match",
  OTHER: "Other",
};

export const INJURY_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  UNDER_REHAB: { label: "Under Rehab", color: "text-red-700", bg: "bg-red-100" },
  RECOVERING: { label: "Recovering", color: "text-amber-700", bg: "bg-amber-100" },
  RECOVERED: { label: "Recovered", color: "text-green-700", bg: "bg-green-100" },
};

export const REHAB_COMPLIANCE_OPTIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "PARTIAL", label: "Partial" },
  { value: "NON_COMPLIANT", label: "Non-compliant" },
];
