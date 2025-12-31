/* eslint-disable react-refresh/only-export-components */

import { createContext, useState } from "react";
import type { ReactNode } from "react";

type AuthContextType = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

export const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken") // ✅ FIX
  );

  const login = (jwt: string) => {
    setToken(jwt);
    localStorage.setItem("accessToken", jwt); // ✅ FIX
  };

  const logout = () => {
  setToken(null);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userRole");
  localStorage.removeItem("playerId");
};

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
