import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";

type FeatureFlags = Record<string, boolean>;

const FeatureFlagContext = createContext<FeatureFlags>({});

export function FeatureFlagProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [flags, setFlags] = useState<FeatureFlags>({});

  const fetchFlags = useCallback(() => {
    api
      .get<Record<string, string>>("/admin/settings/feature-flags")
      .then((res) => {
        const parsed: FeatureFlags = {};
        Object.entries(res.data).forEach(([k, v]) => {
          parsed[k] = v !== "false";
        });
        setFlags(parsed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) return;
    fetchFlags();
  }, [fetchFlags]);

  useEffect(() => {
    window.addEventListener("feature-flags-changed", fetchFlags);
    return () =>
      window.removeEventListener("feature-flags-changed", fetchFlags);
  }, [fetchFlags]);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

export function useFlag(key: string): boolean {
  const flags = useFeatureFlags();
  return flags[key] ?? true;
}
