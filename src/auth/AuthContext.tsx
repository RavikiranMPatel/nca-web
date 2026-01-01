/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";
import type { ReactNode } from "react";

type AuthContextType = {
  token: string | null;
  userRole: string | null;
  login: (token: string, role: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

export const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );

  const [userRole, setUserRole] = useState<string | null>(
    localStorage.getItem("userRole")
  );

  const login = (jwt: string, role: string) => {
    setToken(jwt);
    setUserRole(role);
    localStorage.setItem("accessToken", jwt);
    localStorage.setItem("userRole", role);
  };

  const logout = () => {
    setToken(null);
    setUserRole(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("playerId");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userRole,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
