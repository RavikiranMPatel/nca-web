import { test, expect } from "../fixtures/scoringMatch";
import { config } from "../fixtures/env";
import { execFileSync } from "node:child_process";

/**
 * Workbook section 9 — Milestones / Partnerships / Timing / Live Notes
 * (T20-180 … T20-204).
 *
 * Sixteen of the twenty-five are NOT-IMPLEMENTED. Duck classifications, bowler
 * milestone counters, hat-tricks, wicket maidens, partnership history and
 * wall-vs-active timing do not exist anywhere in the codebase; each is skipped with
 * the reason so the gap shows in the report.
 */

const sql = (q: string) => {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", q], { encoding: "utf8" }).trim();
};

/** crease timestamps for one batter, as booleans plus the stint value. */
function creaseRow(matchPublicId: string, mtpPublicId: string) {
  const out = sql(
    `SELECT (s.crease_entered_at IS NOT NULL), (s.crease_exited_at IS NOT NULL),
            (s.current_stint_started_at IS NOT NULL),
            coalesce(to_char(s.current_stint_started_at,'YYYYMMDDHH24MISSMS'),'-'),
            coalesce(to_char(s.crease_entered_at,'YYYYMMDDHH24MISSMS'),'-'),
            s.runs, s.balls, s.is_out
     FROM innings_batting_stats s
     JOIN innings i ON s.innings_id=i.id JOIN cricket_matches m ON i.match_id=m.id
     JOIN match_team_players mtp ON s.mtp_id=mtp.id
     WHERE m.public_id='${matchPublicId}' AND mtp.public_id='${mtpPublicId}'`);
  if (!out) return null;
  const [entered, exited, stint, stintAt, enteredAt, runs, balls, isOut] = out.split("|");
  return {
    hasEntered: entered === "t", hasExited: exited === "t", hasStint: stint === "t",
    stintAt, enteredAt, runs: +runs, balls: +balls, isOut: isOut === "t",
  };
}

test.describe("§9 Milestones / Partnerships / Timing / Live Notes", () => {

  // ── Batting milestones ───────────────────────────────────────────────────
  for (const [id, target, note] of [
    ["T20-180", 50, "50 milestone + stats"],
    ["T20-181", 100, "100 milestone + stats"],
  ] as const) {
    test(`${id} batter reaches ${target} — ${note}`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      // Keeping one batter on strike across over boundaries takes a little care:
      // twos do not rotate mid-ball, but the ends swap at the end of every over.
      // Ending each over with a single rotates strike once, which the over-end swap
      // then undoes — so Virat faces every ball. Eleven runs per over, then twos to
      // top up.
      const perOver = [2, 2, 2, 2, 2, 1];            // 11 runs, strike retained
      // Choose the number of whole overs so the remainder is even and can be made
      // up in twos without rotating strike. 11 is odd, so dropping one over always
      // flips the remainder's parity.
      let overs = Math.floor(target / 11);
      if ((target - overs * 11) % 2 !== 0) overs -= 1;
      const balls: number[] = [];
      for (let i = 0; i < overs; i++) balls.push(...perOver);
      while (balls.reduce((a, b) => a + b, 0) < target) balls.push(2);
      expect(balls.reduce((a, b) => a + b, 0), "sequence must land exactly on the target").toBe(target);
      await m.advanceTo({ runs: balls });

      const s = await m.api.state(m.matchPublicId);
      const virat = s.batterStats[m.striker.mtpPublicId];
      expect(virat.runs, `Virat is on ${target}`).toBe(target);
      expect(virat.balls).toBe(balls.length);
      expect(s.inningsState.totalRuns).toBe(target);

      // NOTE: there is no in-match milestone indicator — fifties and hundreds are
      // only derived post-hoc in CareerStatsService. The runs and balls are what
      // the workbook's "+ stats" can be checked against today.
    });
  }

  for (const [id, what] of [
    ["T20-182", "duck"],
    ["T20-183", "golden duck"],
    ["T20-184", "diamond duck"],
    ["T20-185", "silver duck"],
    ["T20-186", "pair / king pair"],
  ] as const) {
    test(`${id} ${what} classification`, async () => {
      test.skip(true,
        "NOT-IMPLEMENTED: no duck classification exists anywhere — a grep for " +
        "'duck' across the backend returns nothing. A batter out for 0 is stored " +
        "as runs=0 with no classification of any kind.");
    });
  }

  test("T20-187 bowler 3/4/5-wicket milestone counter", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no in-match bowler milestone counter. PlayerCareerStat has " +
      "threeWickets/fiveWickets, but those are career aggregates computed after the " +
      "fact, not a milestone raised during the innings.");
  });

  test("T20-188 maiden over", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ legalBalls: 6 });
    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Maiden = 1."
    expect(s.bowlerStats[m.bowler.mtpPublicId].maidens).toBe(1);
    expect(s.bowlerStats[m.bowler.mtpPublicId].runsConceded).toBe(0);
    expect(s.inningsState.totalBalls).toBe(6);
  });

  test("T20-189 wicket maiden", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no wicket-maiden field. InningsBowlingStat has maidens but " +
      "nothing distinguishes a maiden that also took a wicket.");
  });

  for (const [id, what] of [
    ["T20-190", "hat-trick"],
    ["T20-191", "four wickets in four balls"],
    ["T20-192", "five wickets in an over"],
  ] as const) {
    test(`${id} ${what}`, async () => {
      test.skip(true,
        `NOT-IMPLEMENTED: no ${what} detection. Consecutive-delivery wicket ` +
        "sequences are not examined anywhere; only per-innings wicket totals exist.");
    });
  }

  // ── Partnerships ─────────────────────────────────────────────────────────
  test("T20-193 partnership runs and balls track every delivery", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Workbook asks for milestones at 10/25/50/75/100, which do not exist. What
    // does exist is the live partnership, asserted after each delivery.
    const seq: Array<[Record<string, unknown>, number, number]> = [
      [{ runsBatsman: 4 }, 4, 1],
      [{ runsBatsman: 2 }, 6, 2],
      [{ runsBatsman: 0, runsExtras: 1, extraType: "WIDE" }, 7, 2],   // runs count, ball does not
      [{ runsBatsman: 0, runsExtras: 2, extraType: "BYE" }, 9, 3],
      [{ runsBatsman: 6 }, 15, 4],
    ];
    for (const [ball, runs, balls] of seq) {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
      const after = await m.api.state(m.matchPublicId);
      expect(after.partnershipRuns, `partnership runs after ${JSON.stringify(ball)}`).toBe(runs);
      expect(after.partnershipBalls, `partnership balls after ${JSON.stringify(ball)}`).toBe(balls);
    }
  });

  test("T20-194 a wicket resets the partnership, and an undo restores it", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2, 4] });
    const before = await m.api.state(m.matchPublicId);
    expect(before.partnershipRuns).toBe(10);
    expect(before.partnershipBalls).toBe(3);

    const victim = before.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED", dismissedPlayerPublicId: victim,
    });
    const out = await m.api.state(m.matchPublicId);
    // Workbook: "End time, runs, balls saved." Nothing persists a finished
    // partnership (see T20-195 skip); what is assertable is that the live one resets.
    expect(out.partnershipRuns, "a wicket starts a new partnership").toBe(0);
    expect(out.partnershipBalls).toBe(0);

    // Relies on the BUG-12/BUG-16 replay fixes: the batter comes back to the crease
    // and the partnership is rebuilt from the surviving deliveries.
    const after = await m.api.undo(m.matchPublicId);
    expect(after.partnershipRuns, "undo restores the partnership runs").toBe(before.partnershipRuns);
    expect(after.partnershipBalls, "and its balls").toBe(before.partnershipBalls);
    expect(after.currentStrikerPublicId, "and the batter is back at the crease").toBe(victim);
  });

  test("T20-195 a retirement resets the partnership too", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2] });
    const before = await m.api.state(m.matchPublicId);
    expect(before.partnershipRuns).toBe(6);

    const retiring = before.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: retiring, nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT",
      dismissedPlayerPublicId: retiring,
    });
    const after = await m.api.state(m.matchPublicId);
    expect(after.partnershipRuns, "a retirement ends the partnership as a wicket does").toBe(0);
    expect(after.partnershipBalls).toBe(0);
    expect(after.inningsState.totalWickets, "but it is not a wicket").toBe(0);
  });

  test("T20-193 / T20-194 / T20-195 partnership history and milestones", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no partnership is ever persisted. Innings carries only the " +
      "CURRENT partnership_runs/partnership_balls, which applyBall zeroes on a " +
      "wicket; there is no table, no end time, and no milestone tracking at " +
      "10/25/50/75/100. The live partnership is covered by the tests above.");
  });

  // ── Batter timestamps ────────────────────────────────────────────────────
  test("T20-196 / T20-197 crease timestamps for a plain dismissal", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const virat = m.striker.mtpPublicId;

    // Workbook T20-196: "inTime captured; both timestamps retained."
    const atStart = creaseRow(m.matchPublicId, virat)!;
    expect(atStart.hasEntered, "crease_entered_at set when the opener is selected").toBe(true);
    expect(atStart.hasStint, "current_stint_started_at set too").toBe(true);
    expect(atStart.hasExited, "and no exit time while at the crease").toBe(false);

    await m.advanceTo({ runs: [4, 2] });
    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: virat, nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED", dismissedPlayerPublicId: virat,
    });

    // Workbook T20-197: "outTime = confirmation time; delivery timestamp separately stored."
    const out = creaseRow(m.matchPublicId, virat)!;
    expect(out.isOut).toBe(true);
    expect(out.hasExited, "crease_exited_at set once out").toBe(true);
    expect(out.hasEntered, "and entry time retained").toBe(true);
    expect(out.enteredAt, "entry time is not overwritten by the dismissal")
      .toBe(atStart.enteredAt);

    // The delivery carries its own timestamp, separately.
    const deliveryAt = sql(
      `SELECT count(*) FROM deliveries d JOIN innings i ON d.innings_id=i.id
       JOIN cricket_matches mm ON i.match_id=mm.id
       WHERE mm.public_id='${m.matchPublicId}' AND d.is_wicket AND d.created_at IS NOT NULL`);
    expect(Number(deliveryAt), "the dismissal delivery has its own created_at").toBe(1);

    // BUG-16 regression: undoing the dismissal must clear the exit time again.
    await m.api.undo(m.matchPublicId);
    const back = creaseRow(m.matchPublicId, virat)!;
    expect(back.isOut, "is_out reverts").toBe(false);
    expect(back.hasExited, "and so does crease_exited_at").toBe(false);
  });

  test("T20-198 retire, return and then be dismissed", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const virat = m.striker.mtpPublicId;
    await m.advanceTo({ runs: [4, 2] });
    const first = creaseRow(m.matchPublicId, virat)!;

    // Retire hurt.
    let s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: virat, nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT", dismissedPlayerPublicId: virat,
    });
    const retired = creaseRow(m.matchPublicId, virat)!;
    expect(retired.isOut, "a retirement is not out").toBe(false);
    expect(retired.hasExited, "retiredHurtTime is recorded as the crease exit").toBe(true);
    expect(retired.runs, "runs preserved").toBe(first.runs);

    // Replacement in, then Virat returns.
    await m.api.selectBatter(m.matchPublicId, m.batters[2].mtpPublicId, "striker");
    await m.advanceTo({ runs: [1] });
    s = await m.api.state(m.matchPublicId);
    if (s.currentStrikerPublicId && s.currentNonStrikerPublicId) {
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT",
        dismissedPlayerPublicId: s.currentStrikerPublicId!,
      });
    }
    await m.api.selectBatter(m.matchPublicId, virat, "striker");

    // Workbook: "retiredHurtTime, returnTime, outTime preserved."
    const returned = creaseRow(m.matchPublicId, virat)!;
    expect(returned.hasEntered, "first entry retained").toBe(true);
    expect(returned.enteredAt, "crease_entered_at is first entry only").toBe(first.enteredAt);
    expect(returned.hasStint, "returnTime recorded as the new stint").toBe(true);
    expect(returned.stintAt, "the stint clock restarts on return").not.toBe(first.stintAt);
    expect(returned.runs, "runs carried through the return").toBe(first.runs);

    // NOTE: the app has three timestamps, not four. The retirement time and any
    // later dismissal time share crease_exited_at, which is written once and not
    // overwritten, so "retiredHurtTime" and "outTime" are not separable — recorded
    // in COVERAGE-MATRIX.md rather than asserted.
  });

  for (const [id, what, why] of [
    ["T20-199", "partnership duration with rain",
     "no wall-vs-active duration exists. MatchLiveAnnotation has " +
     "partnership_duration_seconds but no interruption time is ever subtracted."],
    ["T20-200", "drinks break timing",
     "no drinks-break concept and no active-vs-wall computation."],
  ] as const) {
    test(`${id} ${what}`, async () => { test.skip(true, `NOT-IMPLEMENTED: ${why}`); });
  }

  // ── Live notes ───────────────────────────────────────────────────────────
  test("T20-201 a note captures the match situation at the moment it is written", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2, 1] });
    const at = await m.api.state(m.matchPublicId);

    const res = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/annotations`,
      { noteText: "tightened his line after the boundary", category: "Bowling" });
    expect(res.status).toBe(200);

    const row = sql(
      `SELECT a.over_number, a.ball_number, a.team_score, a.team_wickets,
              a.partnership_runs, a.partnership_balls, a.category, a.created_by,
              st.public_id, ns.public_id, bo.public_id
       FROM match_live_annotations a
       JOIN cricket_matches m ON a.match_id=m.id
       LEFT JOIN match_team_players st ON a.striker_mtp_id=st.id
       LEFT JOIN match_team_players ns ON a.non_striker_mtp_id=ns.id
       LEFT JOIN match_team_players bo ON a.bowler_mtp_id=bo.id
       WHERE m.public_id='${m.matchPublicId}'`).split("|");
    const [over, ball, score, wkts, pRuns, pBalls, cat, by, striker, nonStriker, bowler] = row;

    // Workbook: "Note auto-captures match/innings/over/ball, score/wickets,
    // batters, bowler, partnership, timestamps, user."
    expect(Number(score), "team score at the moment of the note").toBe(at.inningsState.totalRuns);
    expect(Number(wkts)).toBe(at.inningsState.totalWickets);
    expect(Number(pRuns), "partnership runs").toBe(at.partnershipRuns);
    expect(Number(pBalls)).toBe(at.partnershipBalls);
    expect(striker, "striker at that moment").toBe(at.currentStrikerPublicId);
    expect(nonStriker).toBe(at.currentNonStrikerPublicId);
    expect(bowler).toBe(at.currentBowlerPublicId);
    expect(cat).toBe("Bowling");
    expect(by, "the user who wrote it").toBeTruthy();
    expect(Number(ball), "ball number within the over").toBe(at.inningsState.ballInOver);
    expect(Number(over)).toBeGreaterThanOrEqual(0);

    // Workbook: "Note does not alter score." And scoring on must not rewrite it.
    await m.advanceTo({ runs: [6, 6] });
    const again = sql(
      `SELECT a.team_score, a.partnership_runs FROM match_live_annotations a
       JOIN cricket_matches m ON a.match_id=m.id WHERE m.public_id='${m.matchPublicId}'`).split("|");
    expect(Number(again[0]), "the snapshot is frozen at write time").toBe(Number(score));
    expect(Number(again[1])).toBe(Number(pRuns));
  });

  test("T20-202 note category is stored and the note does not change the score", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4] });
    const before = await m.api.state(m.matchPublicId);

    for (const category of ["Batting", "Strategy", "Milestone"]) {
      const res = await m.api.raw("post",
        `/api/admin/cricket/matches/${m.matchPublicId}/scoring/annotations`,
        { noteText: `note about ${category}`, category });
      expect(res.status).toBe(200);
    }
    const cats = sql(
      `SELECT string_agg(a.category, ',' ORDER BY a.category) FROM match_live_annotations a
       JOIN cricket_matches m ON a.match_id=m.id WHERE m.public_id='${m.matchPublicId}'`);
    expect(cats).toBe("Batting,Milestone,Strategy");

    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalRuns, "notes never alter the score")
      .toBe(before.inningsState.totalRuns);
    expect(after.inningsState.totalBalls).toBe(before.inningsState.totalBalls);
  });

  test("T20-203 note client and server timestamps", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: only the server created_at is stored. No client timestamp " +
      "is sent by the UI or accepted by CreateAnnotationRequest, so the workbook's " +
      "'clientTimestamp + serverTimestamp; server authoritative' cannot be checked.");
  });

  test("T20-204 note survives a delivery correction", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: MatchLiveAnnotation has no delivery FK — it stores over and " +
      "ball numbers, not a delivery id — so 'note remains linked to delivery ID' " +
      "has nothing to hold on to.");
  });
});
