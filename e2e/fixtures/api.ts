import { request, type APIRequestContext } from "@playwright/test";
import { config, type Tenant } from "./env";

export interface BallRequest {
  bowlerPublicId: string;
  batsmanPublicId: string;
  nonStrikerPublicId: string;
  runsBatsman: number;
  runsExtras?: number;
  extraType?: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE" | "PENALTY" | null;
  isWicket?: boolean;
  dismissalType?: string;
  dismissedPlayerPublicId?: string;
  fielderPublicId?: string;
  fielder2PublicId?: string;
  isFreeHit?: boolean;
}

/** Thin authenticated API client for one academy. */
export interface LoginPayload {
  accessToken: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  academyId?: string;
  academyName?: string;
  branchId?: string;
  branchName?: string;
}

export class Api {
  private constructor(
    readonly ctx: APIRequestContext,
    readonly token: string,
    readonly tenant: Tenant,
    readonly session: LoginPayload,
  ) {}

  /**
   * The exact localStorage shape AuthContext reads on boot
   * (src/auth/AuthContext.tsx:47-74). ProtectedRoute needs `userRole` as well as
   * `accessToken`, so seeding the token alone lands on /login.
   */
  storageSeed(): Record<string, string> {
    const s = this.session;
    const out: Record<string, string> = { accessToken: s.accessToken };
    const put = (k: string, v?: string) => { if (v) out[k] = v; };
    put("userRole", s.role);
    put("userName", s.userName);
    put("userEmail", s.userEmail);
    put("userPublicId", s.userId);
    put("academyId", s.academyId);
    put("academyName", s.academyName);
    put("branchId", s.branchId);
    put("branchName", s.branchName);
    return out;
  }

  static async login(tenant: Tenant): Promise<Api> {
    const env = config();
    // Login resolves the tenant from the Host header (TenantResolverFilter), so
    // it must go to the academy's own <slug>.localhost origin. Every other call
    // takes its academy from the JWT and can use the plain API base.
    const authCtx = await request.newContext({ baseURL: tenant.origin });
    const res = await authCtx.post("/api/auth/login", {
      data: { email: tenant.email, password: tenant.password },
    });
    if (!res.ok()) {
      throw new Error(
        `Login failed for ${tenant.email} at ${tenant.origin}: ${res.status()} ${await res.text()}`,
      );
    }
    const session: LoginPayload = await res.json();
    await authCtx.dispose();

    const ctx = await request.newContext({
      baseURL: env.apiBase,
      extraHTTPHeaders: { Authorization: `Bearer ${session.accessToken}` },
    });
    return new Api(ctx, session.accessToken, tenant, session);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  private async json(method: "get" | "post" | "delete" | "patch", url: string, data?: unknown) {
    const res = await this.ctx[method](url, data === undefined ? undefined : { data });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok()) {
      throw new Error(`${method.toUpperCase()} ${url} -> ${res.status()} ${text}`);
    }
    return body;
  }

  /** Raw call that does NOT throw — for negative/security assertions. */
  async raw(method: "get" | "post" | "delete" | "patch", url: string, data?: unknown) {
    const res = await this.ctx[method](url, data === undefined ? undefined : { data });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: res.status(), body };
  }

  // ── match lifecycle ───────────────────────────────────────────────────────
  createMatch = (d: Record<string, unknown>) => this.json("post", "/api/admin/cricket/matches", d);
  setTeams = (m: string, d: unknown) => this.json("post", `/api/admin/cricket/matches/${m}/teams`, d);
  getTeams = (m: string) => this.json("get", `/api/admin/cricket/matches/${m}/teams`);
  getXI = (m: string, t: string) => this.json("get", `/api/admin/cricket/matches/${m}/teams/${t}/players`);
  toss = (m: string, d: unknown) => this.json("post", `/api/admin/cricket/matches/${m}/toss`, d);
  start = (m: string) => this.json("post", `/api/admin/cricket/matches/${m}/start`);
  deleteMatch = (m: string) =>
    this.raw("delete", `/api/admin/cricket/matches/${m}?confirmDeletePerformances=true`);

  // ── scoring ───────────────────────────────────────────────────────────────
  postBall = (m: string, b: BallRequest) =>
    this.json("post", `/api/admin/cricket/matches/${m}/scoring/ball`, b);
  state = (m: string) => this.json("get", `/api/admin/cricket/matches/${m}/scoring/state`);
  selectBatter = (m: string, batterPublicId: string, position: "striker" | "nonstriker") =>
    this.json("post", `/api/admin/cricket/matches/${m}/scoring/select-batter`, {
      batterPublicId, position,
    });
  undo = (m: string) => this.json("delete", `/api/admin/cricket/matches/${m}/scoring/ball/last`);
  correctBowler = (m: string, bowlerPublicId: string) =>
    this.json("post", `/api/admin/cricket/matches/${m}/scoring/correct-bowler`, { bowlerPublicId });
}
