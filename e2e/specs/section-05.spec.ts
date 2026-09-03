import { test, expect } from "../fixtures/scoringMatch";
import { createScoringMatch, destroyScoringMatch } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 5 — Striker / Non-Striker / Last Ball / Over Completion
 * (T20-080 … T20-095).
 *
 * The workbook writes the last-ball setups as "0.6", meaning five legal balls are
 * already gone and this is the sixth. Every one of those is reached with
 * `advanceTo({ legalBalls: 5 })` — dots, which are parity-neutral, so Virat is
 * still on strike when the scenario's own delivery is bowled.
 */
test.describe("§5 Striker / Non-Striker / Over Completion", () => {

  // ── Strike rotation on a normal delivery ─────────────────────────────────
  test("T20-080 odd runs change strike", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-1").click();
    // Workbook: "Strike changes before next delivery."
    await expectState(scoringMatch, { runs: 1, balls: 1, striker: "KL Rahul", nonStriker: "Virat Kohli" }, page);

    await page.getByTestId("run-3").click();
    await expectState(scoringMatch, { runs: 4, balls: 2, striker: "Virat Kohli", nonStriker: "KL Rahul" }, page);
  });

  test("T20-081 even runs keep strike until over-end", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-2").click();
    // Workbook: "Virat remains striker until over-end logic."
    await expectState(scoringMatch, { runs: 2, balls: 1, striker: "Virat Kohli", nonStriker: "KL Rahul" }, page);

    await page.getByTestId("run-4").click();
    await expectState(scoringMatch, { runs: 6, balls: 2, striker: "Virat Kohli", nonStriker: "KL Rahul" }, page);
  });

  // ── Last legal ball of the over ──────────────────────────────────────────
  // Each: 5 dots, then the scenario's own sixth delivery.
  const lastBall = (
    id: string, runs: number, finalStriker: string, note: string,
  ) => {
    test(`${id} last legal ball = ${runs} — ${note}`, async ({ scoringMatch, page }) => {
      await scoringMatch.advanceTo({ legalBalls: 5 });
      await scoringMatch.open(page);
      await expectState(scoringMatch, { balls: 5, over: 1, ballInOver: 5, striker: "Virat Kohli" }, page);

      await page.getByTestId(`run-${runs}`).click();

      await expectState(scoringMatch, {
        runs, balls: 6, over: 2, ballInOver: 0,
        striker: finalStriker,
        nonStriker: finalStriker === "Virat Kohli" ? "KL Rahul" : "Virat Kohli",
      }, page);
    });
  };

  // Workbook T20-082: "Over 1.0; ends swap; KL faces next over."
  lastBall("T20-082", 0, "KL Rahul", "over completes, ends swap, KL faces");
  // T20-083: "Run swap then over-end swap; verify Virat faces next over."
  lastBall("T20-083", 1, "Virat Kohli", "run swap then over swap, Virat faces");
  // T20-084: "Over ends; KL faces next over."
  lastBall("T20-084", 2, "KL Rahul", "over ends, KL faces");
  // T20-085: "Run swap + over-end swap; verify final striker."
  lastBall("T20-085", 3, "Virat Kohli", "run swap then over swap, Virat faces");
  // T20-086: "Over ends; KL faces next over."
  lastBall("T20-086", 4, "KL Rahul", "over ends, KL faces");
  // T20-087: "Over ends; KL faces next over."
  lastBall("T20-087", 6, "KL Rahul", "over ends, KL faces");

  // ── Illegal deliveries on the last ball must not complete the over ───────
  test("T20-088 last ball wide — still 0.6, over not complete", async ({ scoringMatch, page }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-0").click();

    // Workbook: "Still 0.6; over not complete."
    await expectState(scoringMatch, {
      runs: 1, balls: 5, over: 1, ballInOver: 5, extras: { wide: 1 },
    }, page);
  });

  test("T20-089 last ball wide + run — still 0.6, over not complete", async ({ scoringMatch, page }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-1").click();

    // Workbook: "Still 0.6; over not complete."
    await expectState(scoringMatch, {
      runs: 2, balls: 5, over: 1, ballInOver: 5, extras: { wide: 2 },
    }, page);
  });

  test("T20-090 last ball no ball — still 0.6, over not complete", async ({ scoringMatch, page }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-0").click();

    // Workbook: "Still 0.6; over not complete."
    await expectState(scoringMatch, {
      runs: 1, balls: 5, over: 1, ballInOver: 5, extras: { noBall: 1 }, freeHit: true,
    }, page);
  });

  test("T20-091 last ball bye — legal ball, over completes", async ({ scoringMatch, page }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    await scoringMatch.open(page);
    await page.getByTestId("extra-bye").click();
    await page.getByTestId("bye-1").click();

    // Workbook: "Legal ball; over completes; ends swap."
    await expectState(scoringMatch, {
      runs: 1, balls: 6, over: 2, ballInOver: 0, extras: { bye: 1 },
    }, page);
  });

  test("T20-092 last ball leg bye — legal ball, over completes", async ({ scoringMatch, page }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    await scoringMatch.open(page);
    await page.getByTestId("extra-leg-bye").click();
    await page.getByTestId("leg-bye-1").click();

    // Workbook: "Legal ball; over completes; ends swap."
    await expectState(scoringMatch, {
      runs: 1, balls: 6, over: 2, ballInOver: 0, extras: { legBye: 1 },
    }, page);
  });

  test("T20-093 over increments only after six LEGAL balls", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);

    // Workbook: "Over increments only after six legal balls; illegal deliveries
    // do not consume a ball." Six legal balls with wides and no-balls mixed in.
    // Each row carries the running (legal balls, team runs) it must produce.
    // Both are needed: an illegal delivery leaves the ball count unchanged, so
    // without runs there is nothing for expectState to wait on and it would race
    // the in-flight POST.
    const seq: Array<[string, string, number, number]> = [
      ["run-0",                  "legal 1",  1, 0],
      ["extra-wide|wide-plus-0", "wide",     1, 1],
      ["run-2",                  "legal 2",  2, 3],
      ["extra-no-ball|nb-plus-0","no ball",  2, 4],
      ["run-0",                  "legal 3",  3, 4],
      ["extra-wide|wide-plus-2", "wide + 2", 3, 7],
      ["run-2",                  "legal 4",  4, 9],
      ["run-0",                  "legal 5",  5, 9],
    ];
    for (const [step, label, balls, runs] of seq) {
      for (const id of step.split("|")) await page.getByTestId(id).click();
      await test.step(`after ${label}`, async () => {
        await expectState(scoringMatch, { balls, runs, over: 1 }, page);
      });
    }

    // Sixth legal ball completes the over.
    await page.getByTestId("run-0").click();
    await expectState(scoringMatch, { balls: 6, runs: 9, over: 2, ballInOver: 0 }, page);
  });

  // ── Bowler eligibility ───────────────────────────────────────────────────
  test("T20-094 the bowler who just bowled cannot bowl the next over", async ({ scoringMatch, page }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    await scoringMatch.open(page);
    // Bowl the sixth ball through the UI: completing the over is what makes the
    // app clear currentBowler and open the picker, which is the flow under test.
    await page.getByTestId("run-0").click();

    // Completing an over opens two overlays at once: the over summary sits on
    // top of the bowler picker, so it must be dismissed before the picker is
    // reachable. That is the real scorer flow, not a test artefact.
    await expect(page.getByTestId("over-summary")).toBeVisible();
    await page.getByTestId("over-summary-continue").click();
    await expect(page.getByTestId("bowler-select")).toBeVisible();

    const bumrah = scoringMatch.bowlers.find((b) => b.displayName === "Bumrah")!;
    const cummins = scoringMatch.bowlers.find((b) => b.displayName === "Pat Cummins")!;

    // Workbook: "Eligible new bowler; previous bowler not consecutive."
    await expect(
      page.getByTestId(`bowler-option-${bumrah.mtpPublicId}`),
      "the bowler who just bowled must be blocked",
    ).toBeDisabled();
    await expect(page.getByTestId(`bowler-option-${cummins.mtpPublicId}`)).toBeEnabled();

    await page.getByTestId(`bowler-option-${cummins.mtpPublicId}`).click();
    await page.getByTestId("run-1").click();
    await expectState(scoringMatch, { balls: 7, over: 2, ballInOver: 1 }, page);
  });

  test("T20-095 a bowler at their over quota is blocked", async () => {
    // Quota is totalOvers / 5 (ScoringService.postBall:98), so a 5-over match
    // gives one over per bowler — reachable without bowling 20 overs.
    const m = await createScoringMatch({ totalOvers: 5 });
    try {
      const bumrah = m.bowlers.find((b) => b.displayName === "Bumrah")!;
      const cummins = m.bowlers.find((b) => b.displayName === "Pat Cummins")!;

      await m.advanceTo({ legalBalls: 6 });                    // Bumrah bowls over 1
      await m.api.correctBowler(m.matchPublicId, cummins.mtpPublicId);
      await m.advanceTo({ legalBalls: 6 });                    // Cummins bowls over 2

      // Bumrah is no longer the last bowler, so only the quota can block him.
      const res = await m.api.raw(
        "post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/correct-bowler`,
        { bowlerPublicId: bumrah.mtpPublicId },
      );
      // correct-bowler itself does not enforce the quota — postBall does.
      const s = await m.api.state(m.matchPublicId);
      const ball = await m.api.raw(
        "post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`,
        {
          bowlerPublicId: bumrah.mtpPublicId,
          batsmanPublicId: s.currentStrikerPublicId,
          nonStrikerPublicId: s.currentNonStrikerPublicId,
          runsBatsman: 0,
        },
      );

      // Workbook: "System blocks/flags ineligible bowler."
      expect(ball.status, "a bowler past their quota must be rejected").toBe(400);
      expect(String(ball.body?.message)).toContain("quota");
      expect(res.status).toBeLessThan(500);
    } finally {
      await destroyScoringMatch(m);
    }
  });
});
