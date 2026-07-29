import api from "./axios";
import publicApi from "./publicApi";

export type RepresentativeHonor = {
  publicId: string;
  playerPublicId: string;
  playerDisplayName: string;
  playerPhotoUrl?: string;
  level: string;
  teamName: string;
  ageGroup?: string;
  seasonYear?: string;
  description?: string;
  displayOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicRepresentativeHonor = {
  publicId: string;
  playerDisplayName: string;
  playerPhotoUrl?: string;
  level: string;
  teamName: string;
  ageGroup?: string;
  seasonYear?: string;
  description?: string;
  displayOrder: number;
};

export type RepresentativeHonorRequest = {
  playerPublicId: string;
  level: string;
  teamName: string;
  ageGroup?: string;
  seasonYear?: string;
  description?: string;
  displayOrder: number;
};

export const representativeHonorService = {
  list: async (): Promise<RepresentativeHonor[]> => {
    const res = await api.get("/admin/representative-honors");
    return res.data;
  },

  get: async (publicId: string): Promise<RepresentativeHonor> => {
    const res = await api.get(`/admin/representative-honors/${publicId}`);
    return res.data;
  },

  create: async (data: RepresentativeHonorRequest): Promise<RepresentativeHonor> => {
    const res = await api.post("/admin/representative-honors", data);
    return res.data;
  },

  update: async (publicId: string, data: RepresentativeHonorRequest): Promise<RepresentativeHonor> => {
    const res = await api.put(`/admin/representative-honors/${publicId}`, data);
    return res.data;
  },

  delete: async (publicId: string): Promise<void> => {
    await api.delete(`/admin/representative-honors/${publicId}`);
  },
};

export const publicRepresentativeHonorService = {
  list: async (): Promise<PublicRepresentativeHonor[]> => {
    const res = await publicApi.get("/public/representative-honors");
    return res.data;
  },
};
