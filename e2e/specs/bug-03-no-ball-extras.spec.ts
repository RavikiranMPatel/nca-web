import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * BUG-03 regression — a no ball's extras are split between the buckets they
 * belong to: the one-run penalty to no-balls, anything run beyond it to byes or
 * leg-byes according to how it was made.
 *
 * Before the fix the scorer's "Bye" and "Leg Bye" buttons posted a byte-identical
 * plain NO_BALL delivery, because the delivery row had nowhere to record the
 * distinction. V97 added `no_ball_runs_type`.
 */
test.describe("BUG-03 no-ball extras split", () => {
  const nb = (n: number, kind: "BAT" | "BYE" | "LEG_BYE") =>
    kind === "BAT"
      ? { runsBatsman: n, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT" }
      : { runsBatsman: 0, runsExtras: n + 1, extraType: "NO_BALL", noBallRunsType: kind };

  const CASES: Array<[string, any, { noBall: number; bye: number; legBye: number }, number, string]> = [
    ["no ball, nothing else",  nb(0, "BAT"),     { noBall: 1, bye: 0, legBye: 0 }, 1, "penalty only"],
    ["no ball + 2 off the bat",nb(2, "BAT"),     { noBall: 1, bye: 0, legBye: 0 }, 3, "runs are the batter's"],
    ["no ball + 2 byes",       nb(2, "BYE"),     { noBall: 1, bye: 2, legBye: 0 }, 3, "T20-031"],
    ["no ball + 4 byes",       nb(4, "BYE"),     { noBall: 1, bye: 4, legBye: 0 }, 5, "EDGE-08"],
    ["no ball + 2 leg byes",   nb(2, "LEG_BYE"), { noBall: 1, bye: 0, legBye: 2 }, 3, "T20-032"],
    ["no ball + 4 leg byes",   nb(4, "LEG_BYE"), { noBall: 1, bye: 0, legBye: 4 }, 5, "T20-039"],
  ];

  for (const [label, ball, extras, teamRuns, why] of CASES) {
    test(`${label} — ${why}`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...ball,
      });
      await expectState(m, {
        runs: teamRuns,
        balls: 0,                                   // a no ball is never a legal ball
        extras: { noBall: extras.noBall, bye: extras.bye, legBye: extras.legBye, wide: 0 },
        // The bowler is charged the penalty plus anything off the bat, never the
        // byes — unchanged by this fix, asserted so the two cannot drift apart.
        bowlers: { Bumrah: { runsConceded: ball.runsBatsman + 1, noBalls: 1 } },
      });
    });
  }

  test("extras reconcile — batter runs + all buckets = team total", async ({ scoringMatch }) => {
    const m = scoringMatch;
    for (const ball of [
      { runsBatsman: 1 },
      { runsBatsman: 0, runsExtras: 3, extraType: "BYE" },
      { runsBatsman: 0, runsExtras: 2, extraType: "LEG_BYE" },
      { runsBatsman: 0, runsExtras: 3, extraType: "WIDE" },
      nb(0, "BAT"), nb(2, "BAT"), nb(2, "BYE"), nb(4, "BYE"), nb(2, "LEG_BYE"),
      { runsBatsman: 4 },
    ]) {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    }
    const live = await m.api.state(m.matchPublicId);
    const st = live.inningsState;
    const batterRuns = Object.values(live.batterStats as Record<string, { runs: number }>)
      .reduce((sum, b) => sum + b.runs, 0);
    const buckets = st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye;

    expect(batterRuns + buckets, "batter runs + extras buckets must equal the team total")
      .toBe(st.totalRuns);

    // And the scorecard, which builds its own extrasTotal, must agree bucket for bucket.
    const card = await m.api.raw("get", `/api/public/scorecard/${m.matchPublicId}`);
    expect(card.status).toBe(200);
    const inn = card.body.innings[0];
    expect(inn.extrasWide, "scorecard wides").toBe(st.extrasWide);
    expect(inn.extrasNoBall, "scorecard no-balls").toBe(st.extrasNoBall);
    expect(inn.extrasBye, "scorecard byes").toBe(st.extrasBye);
    expect(inn.extrasLegBye, "scorecard leg-byes").toBe(st.extrasLegBye);
    expect(inn.extrasTotal, "scorecard extras total").toBe(buckets);
    expect(inn.totalRuns).toBe(st.totalRuns);
  });

  test("replay preserves the split — undo after no balls of each kind", async ({ scoringMatch }) => {
    const m = scoringMatch;
    for (const ball of [nb(2, "BYE"), nb(3, "LEG_BYE"), nb(2, "BAT"), { runsBatsman: 2 }]) {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    }
    const before = await m.api.state(m.matchPublicId);

    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 1,
    });
    const after = await m.api.undo(m.matchPublicId);

    // The sub-type is stored per delivery, so replay must reproduce the split.
    expect(after.inningsState.extrasNoBall).toBe(before.inningsState.extrasNoBall);
    expect(after.inningsState.extrasBye).toBe(before.inningsState.extrasBye);
    expect(after.inningsState.extrasLegBye).toBe(before.inningsState.extrasLegBye);
    expect(after.inningsState.totalRuns).toBe(before.inningsState.totalRuns);
    expect(after.bowlerStats).toEqual(before.bowlerStats);
    expect(after.batterStats).toEqual(before.batterStats);
  });

  test("the three no-ball sub-buttons post three different deliveries", async ({ scoringMatch, page }) => {
    // Driven through the UI: the whole bug was that two of these buttons produced
    // an identical request, so the round trip is the thing worth asserting.
    const m = scoringMatch;
    await m.open(page);

    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-bye").click();
    await expectState(m, { runs: 3, extras: { noBall: 1, bye: 2, legBye: 0 } }, page);

    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-leg-bye").click();
    await expectState(m, { runs: 6, extras: { noBall: 2, bye: 2, legBye: 2 } }, page);

    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-batsman").click();
    await expectState(m, {
      runs: 9,
      extras: { noBall: 3, bye: 2, legBye: 2 },
      batters: { "Virat Kohli": { runs: 2 } },
    }, page);
  });

  test("the three sub-buttons are tappable and do not overlap", async ({ scoringMatch, page }) => {
    // They sit in a 3-column grid and are visually adjacent, so on a narrow
    // viewport a mis-tap would silently record the wrong extra type — the exact
    // distinction this fix introduces.
    const m = scoringMatch;
    await m.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();

    const ids = ["nb-source-batsman", "nb-source-bye", "nb-source-leg-bye"];
    const boxes = [];
    for (const id of ids) {
      const el = page.getByTestId(id);
      await expect(el, `${id} must be visible`).toBeVisible();
      const box = await el.boundingBox();
      expect(box, `${id} must have a layout box`).toBeTruthy();
      // 44px is the usual minimum comfortable tap target.
      expect(box!.height, `${id} tap height`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `${id} tap width`).toBeGreaterThanOrEqual(44);
      boxes.push({ id, ...box! });
    }

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlaps =
          a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlaps, `${a.id} and ${b.id} must not overlap`).toBe(false);
      }
    }

    // And each is genuinely hittable at its own centre — not covered by a sibling.
    for (const id of ids) {
      const box = boxes.find((b) => b.id === id)!;
      const hit = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x as number, y as number)
          ?.closest("[data-testid]")?.getAttribute("data-testid") ?? null,
        [box.x + box.width / 2, box.y + box.height / 2],
      );
      expect(hit, `${id} must be the element at its own centre`).toBe(id);
    }
  });
});
