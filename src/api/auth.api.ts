import api from "./axios";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  name: string;
};

export async function loginApi(
  data: LoginRequest
): Promise<LoginResponse> {
  const response = await api.post("/auth/login", data);
  return response.data;
}

export async function signupApi(
  data: SignupRequest
): Promise<LoginResponse> {
  const response = await api.post("/auth/signup", data);
  return response.data;
}
