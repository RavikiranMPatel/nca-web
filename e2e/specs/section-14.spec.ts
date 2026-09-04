import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { config } from "../fixtures/env";
import { rawSql } from "../fixtures/captureState";

/**
 * Workbook section 14 — Crash / Logout / Offline / Sync (T20-340 … T20-351).
 *
 * The recovery half is genuinely testable: every delivery is a synchronous POST
 * inside one transaction, and the scorer rebuilds from the server on load. The
 * offline half is deferred by design (CLAUDE.md) and skipped.
 */

/** Open the match in a brand-new browser context — a fresh process-level client,
 *  not a reload — with the session seeded the way a logged-in scorer would have it. */
async function openFreshContext(browser: Browser, m: any): Promise<[BrowserContext, Page]> {
  const ctx = await browser.newContext();
  await ctx.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v as string);
    window.localStorage.setItem("nca_ww_enabled", "false");
  }, m.api.storageSeed());
  const page = await ctx.newPage();
  await page.goto(`${config().webBase}/admin/cricket/matches/${m.matchPublicId}/score`);
  return [ctx, page];
}

/** Assert the rendered scorer agrees with the server on everything it displays. */
async function expectUiRebuiltFromServer(page: Page, m: any) {
  const s = await m.api.state(m.matchPublicId);
  const st = s.inningsState;
  await expect(page.getByTestId("scoring-pad")).toBeVisible();
  await expect(page.getByTestId("team-score")).toHaveText(`${st.totalRuns}/${st.totalWickets}`);
  await expect(page.getByTestId("over-count"))
    .toHaveText(`${Math.floor(st.totalBalls / 6)}.${st.totalBalls % 6} ov`);
  await expect(page.getByTestId("extras-total"))
    .toHaveText(String(st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye + st.extrasPenalty));
  const name = (id: string | null) =>
    [...m.batters, ...m.bowlers].find((p: any) => p.mtpPublicId === id)?.displayName ?? null;
  if (s.currentStrikerPublicId)
    await expect(page.getByTestId("striker-name")).toHaveText(name(s.currentStrikerPublicId)!);
  if (s.currentNonStrikerPublicId)
    await expect(page.getByTestId("nonstriker-name")).toHaveText(name(s.currentNonStrikerPublicId)!);
  if (s.currentBowlerPublicId)
    await expect(page.getByTestId("bowler-name")).toHaveText(name(s.currentBowlerPublicId)!);
  await expect(page.getByTestId("free-hit-indicator")).toHaveCount(s.isFreeHit ? 1 : 0);
  return s;
}

const deliveryCount = (matchPublicId: string) => Number(rawSql(
  `SELECT count(*) FROM deliveries d JOIN innings i ON d.innings_id=i.id
   JOIN cricket_matches m ON i.match_id=m.id WHERE m.public_id='${matchPublicId}'`));

test.describe("§14 Crash / Logout / Refresh / Sync", () => {

  test("T20-340 a delivery is committed before the POST returns", async ({ scoringMatch }) => {
    const m = scoringMatch;
    expect(deliveryCount(m.matchPublicId), "nothing yet").toBe(0);

    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 4,
    });
    // Workbook: "Delivery committed after save; state restorable." Read straight
    // from the database the instant the call returns — no UI involved.
    expect(deliveryCount(m.matchPublicId), "the row is durable before the response").toBe(1);
    expect(Number(rawSql(
      `SELECT i.total_runs FROM innings i JOIN cricket_matches mm ON i.match_id=mm.id
       WHERE mm.public_id='${m.matchPublicId}' AND i.status='IN_PROGRESS'`))).toBe(4);
  });

  for (const [id, label, ball] of [
    ["T20-341", "a normal ball", { runsBatsman: 4 }],
    ["T20-342", "a wide", { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" }],
    ["T20-343", "a wicket", { runsBatsman: 0, isWicket: true, dismissalType: "BOWLED" }],
  ] as const) {
    test(`${id} crash after ${label} — a fresh client restores the exact state`, async ({ scoringMatch, browser }) => {
      const m = scoringMatch;
      const s0 = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s0.currentBowlerPublicId!,
        batsmanPublicId: s0.currentStrikerPublicId!,
        nonStrikerPublicId: s0.currentNonStrikerPublicId!,
        ...(ball as any),
        ...(("isWicket" in ball) ? { dismissedPlayerPublicId: s0.currentStrikerPublicId! } : {}),
      });
      if ("isWicket" in ball) {
        await m.api.selectBatter(m.matchPublicId, m.batters[2].mtpPublicId, "striker");
      }
      const expected = await m.api.state(m.matchPublicId);

      // A brand-new context is the closest thing to the app having died and been
      // reopened: new storage, new process-level client, nothing carried over.
      const [ctx, page] = await openFreshContext(browser, m);
      try {
        const seen = await expectUiRebuiltFromServer(page, m);
        expect(seen.inningsState.totalRuns).toBe(expected.inningsState.totalRuns);
        expect(seen.inningsState.totalBalls).toBe(expected.inningsState.totalBalls);
        expect(seen.inningsState.totalWickets).toBe(expected.inningsState.totalWickets);
        expect(seen.currentStrikerPublicId).toBe(expected.currentStrikerPublicId);
      } finally {
        await ctx.close();
      }
    });
  }

  test("T20-344 logout and log back in — the last committed state is restored", async ({ scoringMatch, browser }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2, 1] });
    const expected = await m.api.state(m.matchPublicId);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // Land with no session at all, the way a logged-out scorer would.
      await page.goto(`${config().webBase}/admin/cricket/matches/${m.matchPublicId}/score`);
      await expect(page.getByTestId("scoring-pad"),
        "with no token the scorer must not render").toHaveCount(0);

      // Log back in by seeding the session the login flow would have produced,
      // then navigate again.
      await page.evaluate((seed) => {
        for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v as string);
        window.localStorage.setItem("nca_ww_enabled", "false");
      }, m.api.storageSeed());
      await page.goto(`${config().webBase}/admin/cricket/matches/${m.matchPublicId}/score`);

      const seen = await expectUiRebuiltFromServer(page, m);
      expect(seen.inningsState.totalRuns).toBe(expected.inningsState.totalRuns);
      expect(seen.inningsState.totalBalls).toBe(expected.inningsState.totalBalls);
    } finally {
      await ctx.close();
    }
  });

  test("T20-345 browser refresh — exact state restored", async ({ scoringMatch, page }) => {
    const m = scoringMatch;
    await m.open(page);
    await page.getByTestId("run-4").click();
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-0").click();
    // Wait for both UI-driven deliveries to land before capturing what the reload
    // has to reproduce — reading the server too early captures a state that never
    // existed on screen.
    await expectState(m, { runs: 5, balls: 1, extras: { wide: 1 } }, page);
    const expected = await m.api.state(m.matchPublicId);

    await page.reload();
    const seen = await expectUiRebuiltFromServer(page, m);
    expect(seen.inningsState.totalRuns).toBe(expected.inningsState.totalRuns);
    expect(seen.inningsState.totalBalls).toBe(expected.inningsState.totalBalls);
    expect(seen.currentStrikerPublicId).toBe(expected.currentStrikerPublicId);
  });

  test("T20-348/EDGE-27 an identical delivery posted twice is scored twice", async ({ scoringMatch }) => {
    test.fail(true, "BUG-18: postBall has no idempotency key, so a retried request double-scores");
    const m = scoringMatch;
    const s = await m.api.state(m.matchPublicId);
    const payload = {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 4,
    };
    await m.api.postBall(m.matchPublicId, payload);
    await m.api.postBall(m.matchPublicId, { ...payload });

    // Workbook T20-348: "Idempotency prevents duplicate." EDGE-27: "No duplicate score."
    expect(deliveryCount(m.matchPublicId), "the same delivery must not be recorded twice").toBe(1);
    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalRuns, "and must not be scored twice").toBe(4);
  });

  test("T20-349/EDGE-28 two clients scoring at once are serialised, not interleaved", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const s = await m.api.state(m.matchPublicId);
    const payload = {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 1,
    };

    // Both fire for the same ball position at once.
    const [a, b] = await Promise.all([
      m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, { ...payload }),
      m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, { ...payload }),
    ]);
    expect([a.status, b.status], "both are accepted").toEqual([200, 200]);

    // Workbook: "no silent overwrite." The pessimistic lock on the innings row
    // serialises them, so the result is two well-formed sequential deliveries and a
    // consistent innings row — not a lost update or a duplicated ball position.
    const rows = rawSql(
      `SELECT d.over_number || '.' || d.ball_number FROM deliveries d
       JOIN innings i ON d.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
       WHERE mm.public_id='${m.matchPublicId}' ORDER BY d.sequence_number`).split("\n");
    expect(rows, "two distinct, consecutive ball positions").toEqual(["0.1", "0.2"]);

    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalBalls, "the innings row agrees with the stream").toBe(2);
    expect(after.inningsState.totalRuns).toBe(2);

    // NOTE: the workbook also asks for "version/conflict handling". There is none —
    // the second client's ball is appended rather than rejected or flagged. What is
    // asserted here is the half that holds: the state cannot be corrupted.
  });

  test("T20-350 partial save failure", async () => {
    test.skip(true,
      "NOT TESTABLE LOCALLY without instrumenting the server. postBall is a single " +
      "@Transactional unit, so a partial write cannot commit, and the UI surfaces " +
      "the error — but forcing a mid-transaction failure deterministically needs a " +
      "fault-injection hook the app does not have. Asserting the transaction " +
      "boundary from outside would only re-test the happy path.");
  });

  for (const [id, what] of [
    ["T20-346", "offline scoring"],
    ["T20-347", "reconnect sync"],
  ] as const) {
    test(`${id} ${what}`, async () => {
      test.skip(true,
        "NOT-IMPLEMENTED, deferred by design. CLAUDE.md: 'a true offline scoring " +
        "queue is deferred — it conflicts with this model and needs its own design'. " +
        "There is no service worker, no queue and no offline indicator.");
    });
  }

  test("T20-351 client and server timestamps", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no client timestamp is sent or stored on a delivery or a " +
      "note. Only the server's created_at exists, so 'both timestamps retained; " +
      "server authoritative' has nothing to compare.");
  });
});
