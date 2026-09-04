import { test, expect } from "../fixtures/scoringMatch";
import { createScoringMatch, destroyScoringMatch } from "../fixtures/scoringMatch";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { expectState } from "../fixtures/expectState";

test.describe("harness — scoringMatch fixture", () => {
  test("creates a started match with the workbook baseline state", async ({ scoringMatch }) => {
    const s = await scoringMatch.api.state(scoringMatch.matchPublicId);

    expect(s.inningsState.totalRuns).toBe(0);
    expect(s.inningsState.totalWickets).toBe(0);
    expect(s.inningsState.totalBalls).toBe(0);
    expect(s.inningsState.overNumber).toBe(1);
    expect(s.inningsState.ballInOver).toBe(0);

    expect(s.currentStrikerPublicId).toBe(scoringMatch.striker.mtpPublicId);
    expect(s.currentNonStrikerPublicId).toBe(scoringMatch.nonStriker.mtpPublicId);
    expect(scoringMatch.batters).toHaveLength(11);
    expect(scoringMatch.bowlers).toHaveLength(11);
  });

  test("live scorer page loads the match in the browser", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    // Server-authoritative state landed in the client: the scoring pad renders.
    await expect(page.getByTestId("scoring-pad")).toBeVisible();
    await expect(page.getByTestId("team-score")).toHaveText("0/0");
    await expect(page.getByTestId("striker-name")).toContainText("Virat Kohli");
    await expect(page.getByTestId("nonstriker-name")).toContainText("KL Rahul");
  });

  test("expectState() checks UI and server together", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);

    // Baseline, asserted through both surfaces at once.
    await expectState(scoringMatch, {
      runs: 0, wickets: 0, balls: 0, over: 1, ballInOver: 0,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
      partnership: { runs: 0, balls: 0 },
      freeHit: false,
    }, page);

    // One run off the bat through the UI, then re-assert both surfaces.
    await page.getByTestId("run-1").click();
    await expectState(scoringMatch, {
      runs: 1, wickets: 0, balls: 1, over: 1, ballInOver: 1,
      striker: "KL Rahul", nonStriker: "Virat Kohli",   // odd runs rotate strike
      batters: { "Virat Kohli": { runs: 1, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 1 } },
      partnership: { runs: 1, balls: 1 },
      freeHit: false,
    }, page);
  });

  test("advanceTo() reaches a mid-over state", async ({ scoringMatch }) => {
    await scoringMatch.advanceTo({ legalBalls: 5 });
    const s = await scoringMatch.api.state(scoringMatch.matchPublicId);
    expect(s.inningsState.totalBalls).toBe(5);
    expect(s.inningsState.ballInOver).toBe(5);
    expect(s.inningsState.overNumber).toBe(1);
  });

  test("teardown deletes the match", async () => {
    const m = await createScoringMatch();
    const id = m.matchPublicId;
    const res = await destroyScoringMatch(m);
    expect(res.status, `delete returned ${res.status}: ${JSON.stringify(res.body)}`).toBeLessThan(300);

    // Prove it is gone, using a *fresh* client for the same academy.
    const api = await Api.login(config().a);
    const after = await api.raw("get", `/api/admin/cricket/matches/${id}`);
    expect(after.status).toBe(404);
    await api.dispose();
  });
});
