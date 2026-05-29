import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import publicApi from "../api/publicApi";

export type TenantInfo = {
  academyPublicId: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tagline: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
};

type TenantContextType = {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(() => {
    if (
      window.location.pathname === "/onboarding" ||
      window.location.pathname.startsWith("/platform")
    ) {
      setLoading(false);
      return;
    }

    publicApi
      .get<TenantInfo>("/public/resolve-tenant")
      .then((res) => {
        setTenant(res.data);
        setError(null);
      })
      .catch(() => {
        setError("Failed to resolve tenant");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return (
    <TenantContext.Provider
      value={{ tenant, loading, error, refetch: fetchTenant }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
