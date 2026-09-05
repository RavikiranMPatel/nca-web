import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";

const PROJECTS = ["desktop", "mobile", "mobile-chrome"];

/** Single-value read straight from the database, as captureState does. */
function dbOne(sql: string): string {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", sql], { encoding: "utf8" }).trim();
}

/**
 * Role boundaries on the Kit / Merchandise module.
 *
 * COACH is admitted to exactly one kit endpoint — GET /api/admin/kit/list — by a
 * SecurityConfig rule placed before the /api/admin/** catch-all, and is refused
 * everything else at both the filter chain and PlayerKitController.authorize().
 * SUPER_ADMIN is academy-wide and carries no branch, which is the case
 * PlayerKitService.resolveBranchId exists for.
 *
 * The four users these specs use were inserted directly into nca_scoring_test:
 * no app path can create a COACH without a SUPER_ADMIN token, and none can create
 * a SUPER_ADMIN with a null branch at all. See SESSION-HANDOFF.md.
 */
/**
 * Each project gets its own player and its own season. The projects run
 * concurrently against one database, so a shared row means one project's
 * "nothing was written" assertion reads another project's writes.
 */
async function kitPlayerFor(api: Api, project: string, offset = 0) {
  const res = await api.raw("get", "/api/admin/players");
  const list = (res.body as any[])
    .filter((p) => p.displayName?.startsWith("KitTest A"))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  expect(list.length, "seeded KitTest players").toBeGreaterThan(offset + PROJECTS.length);
  const idx = Math.max(0, PROJECTS.indexOf(project));
  return list[offset + idx];
}

test.describe("Kit module — COACH is read-only", () => {
  test("gets the list, is refused every write, and sees no admin affordances", async ({ page }, testInfo) => {
    // Desktop only. AuthController rotates tokenVersion on every non-admin login,
    // so three projects authenticating as the one seeded coach invalidate each
    // other's tokens and the losers see 401 — noise that looks exactly like the
    // bug this asserts against. Covering all three would need a coach per
    // project, which is outside the four rows authorised for this database.
    // Mobile rendering of the same page is covered by kit-list.spec.ts.
    // (SUPER_ADMIN below is unaffected: isAdmin exempts it from rotation.)
    test.skip(testInfo.project.name !== "desktop",
              "one coach user, and a second login kills the first token");
    const env = config();
    const admin = await Api.login(env.a);
    const coach = await Api.login(env.aCoach);
    const SEASON_COACH = `7${Date.now() % 100000}-${testInfo.project.name.slice(0, 3)}`;
    const player = await kitPlayerFor(admin, testInfo.project.name, 0);

    // Give the season a row so the list has something to show.
    expect((await admin.raw("post", `/api/admin/players/${player.publicId}/kit`, {
      seasonYear: SEASON_COACH, tshirtSize: "M", trouserSize: "M",
      capGiven: false, tshirtGiven: false, trouserGiven: false,
    })).status).toBe(200);

    // ── API: the two read endpoints the list needs ──────────────────────────
    const list = await coach.raw("get", `/api/admin/kit/list?season=${SEASON_COACH}`);
    expect(list.status).toBe(200);
    expect((list.body as any[]).length).toBeGreaterThan(0);
    // The season selector's source. Without this a coach reaches the page and
    // has no season to pick.
    expect((await coach.raw("get", "/api/admin/kit/seasons")).status).toBe(200);

    // ── API: every write is refused, with 403 ──────────────────────────────
    // 403 exactly, since BUG-24 was fixed: SecurityConfig now registers an
    // accessDeniedHandler, so an authenticated-but-unauthorised request no
    // longer falls through to the authenticationEntryPoint and come back as 401
    // "Session expired".
    expect((await coach.raw("post", `/api/admin/players/${player.publicId}/kit`, {
      seasonYear: SEASON_COACH, tshirtSize: "L", capGiven: true,
    })).status).toBe(403);

    expect((await coach.raw("post", "/api/admin/kit/bulk-deliver", {
      seasonYear: SEASON_COACH, playerPublicIds: [player.publicId],
      tshirtGiven: true, trouserGiven: true, capGiven: true,
    })).status).toBe(403);

    expect((await coach.ctx.get(`/api/admin/kit/list/export?season=${SEASON_COACH}`)).status()).toBe(403);

    // Player Overview is ADMIN-only.
    expect((await coach.raw("get", `/api/admin/players/${player.publicId}`)).status).toBe(403);

    // ── and nothing the coach attempted actually landed ────────────────────
    const after = dbOne(
      `SELECT k.tshirt_size || '|' || k.cap_given || '|' || coalesce(k.delivered_at::text,'-')
       FROM player_kit_details k JOIN players p ON p.id = k.player_id
       WHERE p.public_id = '${player.publicId}' AND k.season_year = '${SEASON_COACH}'`);
    expect(after, "coach writes must not have landed").toBe("M|false|-");

    // ── DOM: the page renders without any admin affordance ──────────────────
    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
    }, coach.storageSeed());
    await page.goto("/admin/kit/list");
    await expect(page.getByTestId("kit-list-page")).toBeVisible();
    // The season selector is filled by a separate request; selecting before it
    // resolves re-renders the <select> out from under the click.
    await expect(page.getByTestId("kit-list-season")
      .locator(`option[value="${SEASON_COACH}"]`)).toHaveCount(1);
    await page.getByTestId("kit-list-season").selectOption(SEASON_COACH);
    await expect(page.getByTestId("kit-list-table")).toBeVisible();
    await expect(page.getByTestId(`kit-row-${player.publicId}`)).toBeVisible();
    await page.screenshot({
      path: `e2e/.artifacts/kit-coach-${testInfo.project.name}.png`, fullPage: true });

    // Asserting the rendered DOM, not the role branch that produced it.
    await expect(page.getByTestId("kit-list-export")).toHaveCount(0);
    await expect(page.getByTestId("kit-bulk-deliver")).toHaveCount(0);
    await expect(page.getByTestId("kit-select-all")).toHaveCount(0);
    await expect(page.getByTestId(`kit-select-${player.publicId}`)).toHaveCount(0);
    await expect(page.getByTestId(`kit-edit-${player.publicId}`)).toHaveCount(0);
    await expect(page.getByTestId("kit-drawer")).toHaveCount(0);
    // Player Overview is ADMIN-only, so the name must not be a link into it.
    await expect(page.getByTestId(`kit-player-link-${player.publicId}`)).toHaveCount(0);
    await expect(page.getByTestId(`kit-player-name-${player.publicId}`)).toBeVisible();
    await expect(page.locator('a[href*="/admin/players/"]')).toHaveCount(0);

    await admin.dispose(); await coach.dispose();
  });
});

test.describe("Kit module — SUPER_ADMIN carries no branch", () => {
  test("kit rows still get the academy's main branch, never NULL", async ({}, testInfo) => {
    const env = config();
    const admin = await Api.login(env.a);
    const su = await Api.login(env.aSuperAdmin);
    const SEASON = `6${Date.now() % 100000}-${testInfo.project.name.slice(0, 3)}`;

    // The premise of the whole check: this actor genuinely has no branch, so
    // BaseEntity.@PrePersist would leave branch_id NULL and only
    // PlayerKitService.resolveBranchId can supply one.
    expect(su.session.branchId ?? null, "SUPER_ADMIN must carry no branch").toBeNull();

    // Offsets disjoint from the coach spec's players above.
    const viaSave = await kitPlayerFor(admin, testInfo.project.name, 3);
    const viaBulk = await kitPlayerFor(admin, testInfo.project.name, 6);

    // ── create a kit row as SUPER_ADMIN, the Kit tab's write path ───────────
    expect((await su.raw("post", `/api/admin/players/${viaSave.publicId}/kit`, {
      seasonYear: SEASON, tshirtSize: "L", trouserSize: "L",
      capGiven: false, tshirtGiven: false, trouserGiven: false,
    })).status).toBe(200);

    // ── and one via bulk-deliver, which creates a row when none exists ──────
    const bulk = await su.raw("post", "/api/admin/kit/bulk-deliver", {
      seasonYear: SEASON, playerPublicIds: [viaBulk.publicId],
      tshirtGiven: true, trouserGiven: true, capGiven: true,
    });
    expect(bulk.status).toBe(200);
    expect((bulk.body as any).updated).toBe(1);

    // ── the branch actually persisted, read from the database ──────────────
    const mainBranch = dbOne(
      `SELECT b.id::text FROM branches b JOIN academies a ON a.id = b.academy_id
       WHERE a.code = 'TESTACAD_A' AND b.is_main_branch`);
    expect(mainBranch).not.toBe("");

    for (const [label, p] of [["save", viaSave], ["bulk", viaBulk]] as const) {
      const branchId = dbOne(
        `SELECT coalesce(k.branch_id::text, 'NULL') FROM player_kit_details k
         JOIN players p ON p.id = k.player_id
         WHERE p.public_id = '${p.publicId}' AND k.season_year = '${SEASON}'`);
      expect(branchId, `${label}: branch_id must not be NULL`).not.toBe("NULL");
      expect(branchId, `${label}: branch_id must be the academy's main branch`).toBe(mainBranch);
    }

    // delivered_by is attributed to the super admin, not left blank.
    const deliveredBy = dbOne(
      `SELECT coalesce(u.email, 'NULL') FROM player_kit_details k
       JOIN players p ON p.id = k.player_id
       LEFT JOIN users u ON u.id = k.delivered_by
       WHERE p.public_id = '${viaBulk.publicId}' AND k.season_year = '${SEASON}'`);
    expect(deliveredBy).toBe(env.aSuperAdmin.email);

    await admin.dispose(); await su.dispose();
  });
});

/**
 * Lives in this file, not its own, on purpose. playwright.config sets
 * fullyParallel: false, so tests in one file run serially in a single worker —
 * which is what keeps this and the coach test above from logging in as the same
 * coach at the same time. In separate files they land on different workers, the
 * second login rotates tokenVersion, and the first session dies mid-test: the
 * app's own interceptor then redirects to /login and the page navigates out from
 * under the assertion.
 */
test.describe("BUG-24 — a denied request is 403 and does not end the session", () => {
  // Desktop only, and not for want of mobile coverage: AuthController rotates
  // tokenVersion on every non-admin login (COACH included), so a second login as
  // the same coach invalidates the first token and JwtAuthFilter answers 401.
  // Three projects logging in as one coach concurrently therefore race, and the
  // loser sees 401 — which is indistinguishable from the bug this spec exists to
  // catch. What is asserted here is a transport-level contract with no viewport
  // dimension; the coach's rendered affordances are covered per-project in
  // kit-roles.spec.ts.
  test("COACH stays logged in and sees an error, instead of being bounced to /login", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop",
              "one coach user, and a second login kills the first token");
    const env = config();
    const coach = await Api.login(env.aCoach);

    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
    }, coach.storageSeed());
    await page.goto("/admin/kit/list");
    await expect(page.getByTestId("kit-list-page")).toBeVisible();

    // A denied write, issued with this session's own token from the page's origin.
    const outcome = await page.evaluate(async (token) => {
      const res = await fetch("/api/admin/kit/bulk-deliver", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ seasonYear: "2026", playerPublicIds: ["nope"],
                               tshirtGiven: true, trouserGiven: true, capGiven: true }),
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* empty body */ }
      return { status: res.status, message: body?.message ?? null };
    }, coach.token);

    expect(outcome.status, "a denied write must be 403, not 401").toBe(403);
    // The interceptor logs out on 401 only (src/api/axios.ts:31) and reads
    // data.message for its toast, so 403 must carry a reason the component can show.
    expect(outcome.message, "the reason must reach the component").toContain("Access denied");

    // The session survived: nothing was cleared and no redirect to /login happened.
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeTruthy();
    expect(await page.evaluate(() => localStorage.getItem("userRole"))).toBe("ROLE_COACH");
    expect(await page.evaluate(() => sessionStorage.getItem("sessionExpired"))).toBeNull();
    await expect(page).toHaveURL(/\/admin\/kit\/list$/);
    await expect(page.getByTestId("kit-list-page")).toBeVisible();

    await page.screenshot({
      path: `e2e/.artifacts/bug24-session-intact-${testInfo.project.name}.png`, fullPage: true });

    await coach.dispose();
  });
});
