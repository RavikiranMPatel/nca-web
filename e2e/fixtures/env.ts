import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.resolve(HERE, "../../.env.test");

export interface E2EEnv {
  apiBase: string;
  webBase: string;
  a: Tenant;
  b: Tenant;
  /** Non-admin roles in academy A, seeded for the role-boundary specs. */
  aCoach: Tenant;
  aSuperAdmin: Tenant;
  db: { name: string; user: string; host: string; port: string };
}
export interface Tenant {
  slug: string;
  origin: string;   // http://<slug>.localhost:8081 — needed because the login
                    // endpoint resolves the tenant from the Host header
  email: string;
  password: string;
}

let cached: E2EEnv | null = null;

/**
 * Reads .env.test — a gitignored file (.gitignore:26, `.env.*`) holding the two
 * local test-academy logins. It is NOT committed and NOT shared; regenerate it
 * with docs/testing/t20-scoring/TEST-PLAN.md if it is missing.
 */
export function config(): E2EEnv {
  if (cached) return cached;

  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(
      `Missing ${ENV_FILE}.\n` +
        `The scoring suite needs local credentials for the two test academies.\n` +
        `See docs/testing/t20-scoring/TEST-PLAN.md § "First-time setup".`,
    );
  }

  const raw: Record<string, string> = {};
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) raw[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }

  const need = (k: string) => {
    const v = raw[k];
    if (!v) throw new Error(`${ENV_FILE} is missing ${k}`);
    return v;
  };

  cached = {
    apiBase: need("E2E_API_BASE"),
    webBase: need("E2E_WEB_BASE"),
    a: {
      slug: need("E2E_A_SLUG"),
      origin: need("E2E_A_ORIGIN"),
      // E2E_AS_SUPER_ADMIN=1 runs the whole suite as academy A's SUPER_ADMIN
      // instead of its ADMIN. Used to confirm the scoring and kit rules behave
      // identically for a branchless super admin.
      email: process.env.E2E_AS_SUPER_ADMIN === "1"
        ? need("E2E_A_SUPERADMIN_EMAIL") : need("E2E_A_EMAIL"),
      password: process.env.E2E_AS_SUPER_ADMIN === "1"
        ? need("E2E_A_SUPERADMIN_PASSWORD") : need("E2E_A_PASSWORD"),
    },
    aCoach: {
      slug: need("E2E_A_SLUG"),
      origin: need("E2E_A_ORIGIN"),
      email: need("E2E_A_COACH_EMAIL"),
      password: need("E2E_A_COACH_PASSWORD"),
    },
    aSuperAdmin: {
      slug: need("E2E_A_SLUG"),
      origin: need("E2E_A_ORIGIN"),
      email: need("E2E_A_SUPERADMIN_EMAIL"),
      password: need("E2E_A_SUPERADMIN_PASSWORD"),
    },
    b: {
      slug: need("E2E_B_SLUG"),
      origin: need("E2E_B_ORIGIN"),
      email: need("E2E_B_EMAIL"),
      password: need("E2E_B_PASSWORD"),
    },
    db: {
      name: need("E2E_DB_NAME"),
      user: need("E2E_DB_USER"),
      host: need("E2E_DB_HOST"),
      port: need("E2E_DB_PORT"),
    },
  };
  return cached;
}
