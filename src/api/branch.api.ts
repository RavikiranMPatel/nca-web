import api from "./axios";
import publicApi from "./publicApi";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Branch = {
  id: string;
  publicId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isMainBranch: boolean;
  active: boolean;
};

export type AdminUser = {
  id: string;
  publicId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  branchId: string;
  active: boolean;
  createdAt: string;
};

export type CreateBranchRequest = {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
};

export type CreateAdminRequest = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  branchId: string;
};

// ── Branch APIs ───────────────────────────────────────────────────────────────

export async function getAdminBranches(): Promise<Branch[]> {
  const res = await api.get("/admin/branches");
  return res.data;
}

export async function getPublicBranches(): Promise<Branch[]> {
  const res = await publicApi.get("/public/branches");
  return res.data;
}

export async function createBranch(data: CreateBranchRequest): Promise<Branch> {
  const res = await api.post("/admin/branches", data);
  return res.data;
}

export async function toggleBranchActive(id: string): Promise<Branch> {
  const res = await api.patch(`/admin/branches/${id}/toggle-active`);
  return res.data;
}

// ── Admin User APIs ───────────────────────────────────────────────────────────

export async function getAdminUsers(): Promise<AdminUser[]> {
  // Backend returns a Page — fetch large size, extract content
  const res = await api.get("/admin/users?size=200");
  return res.data.content ?? res.data;
}

export async function createAdminUser(
  data: CreateAdminRequest,
): Promise<AdminUser> {
  const res = await api.post("/admin/users", data);
  return res.data;
}

// ✅ Uses publicId, correct endpoint is /{publicId}/toggle
export async function toggleAdminActive(publicId: string): Promise<AdminUser> {
  const res = await api.patch(`/admin/users/${publicId}/toggle`);
  return res.data;
}
