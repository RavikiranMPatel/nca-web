import publicApi from "./publicApi";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthResponse = {
  accessToken: string;
  userPublicId: string;
  userName: string;
  userEmail: string;
  role: string;
  academyId: string;
  academyPublicId: string;
  academyName: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
};

// ── Auth APIs ─────────────────────────────────────────────────────────────────

export async function signupApi(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ accessToken: string }> {
  const res = await publicApi.post("/auth/signup", data);
  return { accessToken: res.data.accessToken };
}

export async function loginApi(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await publicApi.post("/auth/login", data);
  return res.data as AuthResponse;
}

