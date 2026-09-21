import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Api } from "../fixtures/api";
import { config, type Tenant } from "../fixtures/env";
import { createScoringMatch, destroyScoringMatch } from "../fixtures/scoringMatch";

/** Single-value read straight from the database, as kit-roles.spec.ts does. */
function dbOne(sql: string): string {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", sql], { encoding: "utf8" }).trim();
}

const SCORING_BASE = (m: string) => `/api/admin/cricket/matches/${m}/scoring`;

/**
 * BUG-07/BUG-08 need a real ROLE_SCORER token, and unlike COACH/SUPER_ADMIN
 * (seeded directly, once, because no app path could create them at the time —
 * see SESSION-HANDOFF.md) createAdmin could ALWAYS create this role. So this
 * provisions and tears down its own scorer per test, through the real API,
 * rather than adding a third permanent seeded row: every other spec in this
 * suite asserts an exact user count against a fixed baseline (7), and a
 * permanent addition here would mean hunting down and updating every one of
 * them instead of just this file.
 */
async function createScorer(tenant: Tenant, superAdmin: Tenant) {
  const admin = await Api.login(superAdmin);
  const branches = await admin.raw("get", "/api/admin/branches");
  const branchId = (branches.body as Array<{ id: string }>)[0]?.id;
  if (!branchId) throw new Error(`No branch found for ${superAdmin.slug} to assign the scorer to`);

  const email = `e2e-scorer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "Tt1!ScorerPass9";
  const created = await admin.raw("post", "/api/admin/users", {
    name: "E2E Scorer", email, password, role: "ROLE_SCORER", branchId,
  });
  if (created.status !== 200) {
    await admin.dispose();
    throw new Error(`Failed to create scorer: ${created.status} ${JSON.stringify(created.body)}`);
  }
  const publicId = (created.body as { publicId: string }).publicId;
  const scorer = await Api.login({ ...tenant, email, password });
  return { scorer, adminApi: admin, publicId };
}

async function destroyScorer(fx: { adminApi: Api; publicId: string }) {
  await fx.adminApi.raw("delete", `/api/admin/users/${fx.publicId}`);
  await fx.adminApi.dispose();
}

/**
 * BUG-07: ROLE_SCORER could never reach any scoring endpoint —
 * ScoringService.validateScorerOrAdmin already accepted it, but SecurityConfig's
 * generic /api/admin/** catch-all (ROLE_ADMIN/ROLE_SUPER_ADMIN only) blocked the
 * request before the service layer ever ran.
 *
 * BUG-08: ROLE_COACH could never load the live scorer page — partly the frontend
 * route guard (ROLE_ADMIN/ROLE_SUPER_ADMIN only), and partly that the page's
 * match-read calls (getMatch/getTeams/getPlayingXI) and its close-innings/
 * record-result calls live in MatchController, gated by a narrower
 * validateAdminOrSuperAdmin that excluded COACH too — fixing only the frontend
 * route would have left the page loading into a wall of 403s.
 *
 * Scope, per the ruling: everything validateScorerOrAdmin already accepts, plus
 * match read (which the fix widened to cover what the scorer page actually
 * needs: getMatch, getTeams, getPlayingXI, closeInnings, recordResult) and the
 * scorer page itself. Nothing else — pause/resume/coin-flip, match setup, and
 * every admin/fee/player/kit surface stay exactly as narrow as before.
 */

test.describe("BUG-07 — ROLE_SCORER: the scoring surface and nothing else", () => {
  test("every scoring endpoint 200, match read 200, everything else 403", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one scoring match, run once is enough");

    const env = config();
    const m = await createScoringMatch({ tenant: env.a }); // built as ADMIN-A
    const fx = await createScorer(env.a, env.aSuperAdmin);
    const scorer = fx.scorer;
    try {
      expect(scorer.session.role, "fixture must actually be ROLE_SCORER").toBe("ROLE_SCORER");

      // ── match read — the other half of the ruling's scope ──────────────────
      expect((await scorer.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`)).status).toBe(200);
      expect((await scorer.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}/teams`)).status).toBe(200);
      expect((await scorer.raw("get",
        `/api/admin/cricket/matches/${m.matchPublicId}/teams/${m.battingTeamPublicId}/players`)).status).toBe(200);

      // ── the full ScoringController surface ──────────────────────────────────
      const ballRes = await scorer.raw("post", `${SCORING_BASE(m.matchPublicId)}/ball`, {
        bowlerPublicId: m.bowler.mtpPublicId,
        batsmanPublicId: m.striker.mtpPublicId,
        nonStrikerPublicId: m.nonStriker.mtpPublicId,
        runsBatsman: 1,
        deliveryClientId: crypto.randomUUID(),
      });
      expect(ballRes.status, "postBall").toBe(200);

      expect((await scorer.raw("get", `${SCORING_BASE(m.matchPublicId)}/state`)).status, "state").toBe(200);
      expect((await scorer.raw("get", `${SCORING_BASE(m.matchPublicId)}/this-over`)).status, "this-over").toBe(200);
      expect((await scorer.raw("get", `${SCORING_BASE(m.matchPublicId)}/deliveries`)).status, "deliveries").toBe(200);

      expect((await scorer.raw("delete", `${SCORING_BASE(m.matchPublicId)}/ball/last`)).status,
        "undo the ball just posted, to leave the innings clean").toBe(200);

      // select-batter is not exercised here: with the fixture's openers already
      // at the crease, re-selecting the current striker is a domain error
      // (400), not a security one — correct-bowler below and postBall above
      // already prove the write surface is reachable.
      expect((await scorer.raw("post", `${SCORING_BASE(m.matchPublicId)}/correct-bowler`, {
        bowlerPublicId: m.bowler.mtpPublicId,
      })).status, "correct-bowler").toBe(200);

      // annotations sits under /scoring/** (so SecurityConfig admits a SCORER
      // token through) but MatchService.createAnnotation narrows further to
      // admin/coach only — SCORER must be refused here, at the service layer.
      expect((await scorer.raw("post", `${SCORING_BASE(m.matchPublicId)}/annotations`, {
        noteText: "should not be allowed",
      })).status, "annotations stay admin/coach only even for a SCORER token").toBe(403);

      // ── deliberately outside the ruling's scope — still ADMIN/SUPER_ADMIN only ──
      expect((await scorer.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/pause`,
        { reason: "RAIN" })).status, "pause").toBe(403);
      expect((await scorer.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/resume`)).status,
        "resume").toBe(403);
      expect((await scorer.raw("post", "/api/admin/cricket/matches", {
        title: "should not be creatable", matchDate: "2026-01-01", matchType: "INTERNAL", totalOvers: 20,
      })).status, "create match").toBe(403);
      expect((await scorer.raw("delete",
        `/api/admin/cricket/matches/${m.matchPublicId}?confirmDeletePerformances=true`)).status,
        "delete match").toBe(403);

      // ── no admin surface, no fee/player/kit access ──────────────────────────
      expect((await scorer.raw("get", "/api/admin/users")).status, "user management").toBe(403);
      expect((await scorer.raw("get", "/api/admin/fees/plans")).status, "fee plans").toBe(403);
      expect((await scorer.raw("get", "/api/admin/kit/list")).status, "kit list").toBe(403);
      expect((await scorer.raw("get", "/api/admin/players")).status, "player list").toBe(403);
      expect((await scorer.raw("get", `/api/admin/players/${m.striker.mtpPublicId}`)).status,
        "player overview").toBe(403);

      // ── nothing the scorer did outside its scope actually landed ────────────
      const afterStatus = dbOne(
        `SELECT pause_reason FROM cricket_matches WHERE public_id = '${m.matchPublicId}'`);
      expect(afterStatus, "the refused pause must not have landed").toBe("");

    } finally {
      await destroyScoringMatch(m);
      await scorer.dispose();
      await destroyScorer(fx);
    }
  });

  test("cross-tenant: a B scorer against A's match gets 404 on every scoring endpoint", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one scoring match, run once is enough");

    const env = config();
    const m = await createScoringMatch({ tenant: env.a });
    const fx = await createScorer(env.b, env.bSuperAdmin);
    const scorerB = fx.scorer;
    try {
      expect(scorerB.session.role).toBe("ROLE_SCORER");

      const targets: Array<[string, () => Promise<{ status: number }>]> = [
        ["match read", () => scorerB.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`)],
        ["teams", () => scorerB.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}/teams`)],
        ["scoring state", () => scorerB.raw("get", `${SCORING_BASE(m.matchPublicId)}/state`)],
        ["this-over", () => scorerB.raw("get", `${SCORING_BASE(m.matchPublicId)}/this-over`)],
        ["deliveries", () => scorerB.raw("get", `${SCORING_BASE(m.matchPublicId)}/deliveries`)],
        ["postBall", () => scorerB.raw("post", `${SCORING_BASE(m.matchPublicId)}/ball`, {
          bowlerPublicId: m.bowler.mtpPublicId, batsmanPublicId: m.striker.mtpPublicId,
          nonStrikerPublicId: m.nonStriker.mtpPublicId, runsBatsman: 1,
          deliveryClientId: crypto.randomUUID(),
        })],
      ];

      for (const [label, call] of targets) {
        const res = await call();
        expect(res.status, `${label}: a scorer from another academy must not even learn this match exists`).toBe(404);
      }

    } finally {
      await destroyScoringMatch(m);
      await scorerB.dispose();
      await destroyScorer(fx);
    }
  });
});

test.describe("BUG-07 — the scorer page renders with no admin affordances", () => {
  test("loads, shows the scoring pad, and hides pause/resume", async ({ page }, testInfo) => {
    const env = config();
    const m = await createScoringMatch({ tenant: env.a });
    const fx = await createScorer(env.a, env.aSuperAdmin);
    const scorer = fx.scorer;
    try {
      await page.addInitScript((seed) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
      }, scorer.storageSeed());

      await page.goto(`/admin/cricket/matches/${m.matchPublicId}/score`);

      // The page actually renders the live scorer, not a redirect to /home.
      await expect(page.getByTestId("scoring-pad")).toBeVisible();
      await expect(page.getByTestId("btn-undo")).toBeVisible();
      await expect(page.getByTestId("run-4")).toBeVisible();

      // Asserting the rendered DOM, not the role branch that produced it —
      // pauseMatch/resumeMatch stay ADMIN/SUPER_ADMIN-only, so the button must
      // not exist for a SCORER at all (not just be disabled).
      await expect(page.getByTestId("btn-pause")).toHaveCount(0);
      await expect(page.getByTestId("btn-resume")).toHaveCount(0);

      await page.screenshot({
        path: `e2e/.artifacts/bug07-scorer-page-${testInfo.project.name}.png`, fullPage: true });

    } finally {
      await destroyScoringMatch(m);
      await scorer.dispose();
      await destroyScorer(fx);
    }
  });
});

test.describe("BUG-08 — ROLE_COACH: the scorer page renders and functions", () => {
  test("loads the page and scores one full over", async ({ page }, testInfo) => {
    // Desktop only: a second project logging in as the same seeded coach
    // rotates its tokenVersion and kills the first project's session mid-test
    // (kit-roles.spec.ts's own reason for the same restriction).
    test.skip(testInfo.project.name !== "desktop",
      "one coach user, and a second login kills the first token");

    const env = config();
    const m = await createScoringMatch({ tenant: env.a });
    const coach = await Api.login(env.aCoach);
    try {
      expect(coach.session.role).toBe("ROLE_COACH");

      // ── page loads (frontend route guard) ───────────────────────────────────
      await page.addInitScript((seed) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
      }, coach.storageSeed());
      await page.goto(`/admin/cricket/matches/${m.matchPublicId}/score`);
      await expect(page.getByTestId("scoring-pad")).toBeVisible();

      // ── and functions: getMatch/getTeams/getPlayingXI must all succeed for
      // the page to have gotten this far without an error banner ─────────────
      await expect(page.getByTestId("striker-name")).toBeVisible();
      await expect(page.getByTestId("bowler-name")).toBeVisible();

      // ── one full over (6 legal balls) scored via the API as COACH ───────────
      for (let i = 0; i < 6; i++) {
        const res = await coach.raw("post", `${SCORING_BASE(m.matchPublicId)}/ball`, {
          bowlerPublicId: m.bowler.mtpPublicId,
          batsmanPublicId: m.striker.mtpPublicId,
          nonStrikerPublicId: m.nonStriker.mtpPublicId,
          runsBatsman: i % 2, // alternates strike without ending on an odd total
          deliveryClientId: crypto.randomUUID(),
        });
        expect(res.status, `ball ${i + 1} of the over`).toBe(200);
      }

      const state = await coach.raw("get", `${SCORING_BASE(m.matchPublicId)}/state`);
      expect(state.status).toBe(200);
      expect((state.body as any).inningsState.totalBalls, "six legal balls bowled").toBe(6);

      // ── and BUG-07's exact repro path also works for COACH via match read ───
      expect((await coach.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`)).status).toBe(200);

    } finally {
      await destroyScoringMatch(m);
      await coach.dispose();
    }
  });
});
