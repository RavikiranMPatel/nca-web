import api from "./axios";
import type {
  Club,
  ClubPage,
  ClubMember,
  ClubMemberPage,
  ClubHonor,
  ClubMemberAttendance,
  ClubRequest,
  ClubMemberRequest,
  ClubHonorRequest,
} from "../types/club";

export const clubService = {
  // ── Clubs ────────────────────────────────────────────────────────────────

  listClubs: async (page = 0, size = 20): Promise<ClubPage> => {
    const response = await api.get("/admin/clubs", { params: { page, size } });
    return response.data;
  },

  getClub: async (publicId: string): Promise<Club> => {
    const response = await api.get(`/admin/clubs/${publicId}`);
    return response.data;
  },

  createClub: async (data: ClubRequest): Promise<Club> => {
    const response = await api.post("/admin/clubs", data);
    return response.data;
  },

  updateClub: async (publicId: string, data: ClubRequest): Promise<Club> => {
    const response = await api.put(`/admin/clubs/${publicId}`, data);
    return response.data;
  },

  deleteClub: async (publicId: string): Promise<void> => {
    await api.delete(`/admin/clubs/${publicId}`);
  },

  // ── Members ──────────────────────────────────────────────────────────────

  listMembers: async (
    clubId: string,
    page = 0,
    size = 20,
    status?: string,
  ): Promise<ClubMemberPage> => {
    const response = await api.get(`/admin/clubs/${clubId}/members`, {
      params: { page, size, ...(status ? { status } : {}) },
    });
    return response.data;
  },

  getMember: async (
    clubId: string,
    memberPublicId: string,
  ): Promise<ClubMember> => {
    const response = await api.get(
      `/admin/clubs/${clubId}/members/${memberPublicId}`,
    );
    return response.data;
  },

  addMember: async (
    clubId: string,
    data: ClubMemberRequest,
  ): Promise<ClubMember> => {
    const response = await api.post(`/admin/clubs/${clubId}/members`, data);
    return response.data;
  },

  updateMember: async (
    clubId: string,
    memberPublicId: string,
    data: ClubMemberRequest,
  ): Promise<ClubMember> => {
    const response = await api.put(
      `/admin/clubs/${clubId}/members/${memberPublicId}`,
      data,
    );
    return response.data;
  },

  deleteMember: async (
    clubId: string,
    memberPublicId: string,
  ): Promise<void> => {
    await api.delete(`/admin/clubs/${clubId}/members/${memberPublicId}`);
  },

  getAttendanceToday: async (
    clubId: string,
  ): Promise<ClubMemberAttendance[]> => {
    const response = await api.get(
      `/admin/clubs/${clubId}/attendance-today`,
    );
    return response.data;
  },

  // ── Honors ───────────────────────────────────────────────────────────────

  listHonors: async (memberPublicId: string): Promise<ClubHonor[]> => {
    const response = await api.get(
      `/admin/clubs/members/${memberPublicId}/honors`,
    );
    return response.data;
  },

  addHonor: async (
    memberPublicId: string,
    data: ClubHonorRequest,
  ): Promise<ClubHonor> => {
    const response = await api.post(
      `/admin/clubs/members/${memberPublicId}/honors`,
      data,
    );
    return response.data;
  },

  updateHonor: async (
    honorPublicId: string,
    data: ClubHonorRequest,
  ): Promise<ClubHonor> => {
    const response = await api.put(
      `/admin/clubs/honors/${honorPublicId}`,
      data,
    );
    return response.data;
  },

  deleteHonor: async (honorPublicId: string): Promise<void> => {
    await api.delete(`/admin/clubs/honors/${honorPublicId}`);
  },
};

export default clubService;
