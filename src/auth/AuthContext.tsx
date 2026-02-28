/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";
import type { ReactNode } from "react";

export type LoginData = {
  token: string;
  role: string;
  userName?: string;
  userEmail?: string;
  userPublicId?: string;
  academyId?: string;
  academyName?: string;
  branchId?: string;
  branchName?: string;
};

type AuthContextType = {
  token: string | null;
  userRole: string | null;
  userName: string | null;
  userEmail: string | null;
  userPublicId: string | null;
  academyId: string | null;
  academyName: string | null;
  branchId: string | null;
  branchName: string | null;
  login: (data: LoginData) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken"),
  );
  const [userRole, setUserRole] = useState<string | null>(
    localStorage.getItem("userRole"),
  );
  const [userName, setUserName] = useState<string | null>(
    localStorage.getItem("userName"),
  );
  const [userEmail, setUserEmail] = useState<string | null>(
    localStorage.getItem("userEmail"),
  );
  const [userPublicId, setUserPublicId] = useState<string | null>(
    localStorage.getItem("userPublicId"),
  );
  const [academyId, setAcademyId] = useState<string | null>(
    localStorage.getItem("academyId"),
  );
  const [academyName, setAcademyName] = useState<string | null>(
    localStorage.getItem("academyName"),
  );
  const [branchId, setBranchId] = useState<string | null>(
    localStorage.getItem("branchId"),
  );
  const [branchName, setBranchName] = useState<string | null>(
    localStorage.getItem("branchName"),
  );

  const login = (data: LoginData) => {
    setToken(data.token);
    setUserRole(data.role);
    setUserName(data.userName ?? null);
    setUserEmail(data.userEmail ?? null);
    setUserPublicId(data.userPublicId ?? null);
    setAcademyId(data.academyId ?? null);
    setAcademyName(data.academyName ?? null);
    setBranchId(data.branchId ?? null);
    setBranchName(data.branchName ?? null);

    localStorage.setItem("accessToken", data.token);
    localStorage.setItem("userRole", data.role);
    if (data.userName) localStorage.setItem("userName", data.userName);
    if (data.userEmail) localStorage.setItem("userEmail", data.userEmail);
    if (data.userPublicId)
      localStorage.setItem("userPublicId", data.userPublicId);
    if (data.academyId) localStorage.setItem("academyId", data.academyId);
    if (data.academyName) localStorage.setItem("academyName", data.academyName);
    if (data.branchId) localStorage.setItem("branchId", data.branchId);
    if (data.branchName) localStorage.setItem("branchName", data.branchName);
  };

  const logout = () => {
    setToken(null);
    setUserRole(null);
    setUserName(null);
    setUserEmail(null);
    setUserPublicId(null);
    setAcademyId(null);
    setAcademyName(null);
    setBranchId(null);
    setBranchName(null);

    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPublicId");
    localStorage.removeItem("academyId");
    localStorage.removeItem("academyName");
    localStorage.removeItem("branchId");
    localStorage.removeItem("branchName");
    localStorage.removeItem("userId");
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerName");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userRole,
        userName,
        userEmail,
        userPublicId,
        academyId,
        academyName,
        branchId,
        branchName,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
