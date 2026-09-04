import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";
import { config } from "../fixtures/env";
import { execFileSync } from "node:child_process";

/**
 * Workbook section 6 — Wickets & Dismissals (T20-110 … T20-126), plus EDGE-23
 * (undo after a wicket), pulled forward because it needs the same fixture.
 */

/** Reads innings_batting_stats straight from the DB — the crease timestamps are
 *  not exposed by any scoring API, so the workbook's timing checks can only be
 *  verified at the row level. */
function battingStatRow(matchPublicId: string, mtpPublicId: string) {
  const { db } = config();
  const out = execFileSync("psql", [
    "-h", db.host, "-p", db.port, "-U", db.user, "-d", db.name, "-tAc",
    `SELECT s.runs, s.balls, s.is_out, coalesce(s.dismissal_type,'-'),
            (s.crease_entered_at IS NOT NULL), (s.crease_exited_at IS NOT NULL),
            (s.current_stint_started_at IS NOT NULL),
            coalesce(to_char(s.current_stint_started_at,'YYYYMMDDHH24MISSMS'),'-')
     FROM innings_batting_stats s
     JOIN innings i ON s.innings_id = i.id
     JOIN cricket_matches m ON i.match_id = m.id
     JOIN match_team_players mtp ON s.mtp_id = mtp.id
     WHERE m.public_id = '${matchPublicId}' AND mtp.public_id = '${mtpPublicId}'`,
  ], { encoding: "utf8" }).trim();
  if (!out) return null;
  const [runs, balls, isOut, dismissal, entered, exited, stint, stintAt] = out.split("|");
  return {
    runs: +runs, balls: +balls, isOut: isOut === "t", dismissalType: dismissal,
    hasCreaseEntered: entered === "t", hasCreaseExited: exited === "t",
    hasCurrentStint: stint === "t", stintAt,
  };
}

test.describe("§6 Wickets & Dismissals", () => {

  /** Bowl a wicket through the API and return the state after it. */
  const takeWicket = async (m: any, opts: {
    dismissalType: string; victim?: "striker" | "nonstriker";
    fielder?: string; fielder2?: string; runs?: number;
  }) => {
    const s = await m.api.state(m.matchPublicId);
    const victim = opts.victim === "nonstriker"
      ? s.currentNonStrikerPublicId : s.currentStrikerPublicId;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: opts.runs ?? 0,
      isWicket: true,
      dismissalType: opts.dismissalType,
      dismissedPlayerPublicId: victim,
      fielderPublicId: opts.fielder,
      fielder2PublicId: opts.fielder2,
    } as any);
    return { before: s, victim };
  };

  // ── Bowler-credited dismissals ───────────────────────────────────────────
  for (const [id, dismissal, note] of [
    ["T20-110", "BOWLED", "Wicket +1; batter out; bowler wicket +1"],
    ["T20-112", "LBW",    "Wicket +1; bowler wicket +1"],
  ] as const) {
    test(`${id} ${dismissal.toLowerCase()} — ${note}`, async ({ scoringMatch }) => {
      const { victim } = await takeWicket(scoringMatch, { dismissalType: dismissal });
      await expectState(scoringMatch, {
        wickets: 1, balls: 1,
        bowlers: { Bumrah: { wickets: 1, legalBalls: 1 } },
      });
      const s = await scoringMatch.api.state(scoringMatch.matchPublicId);
      expect(s.dismissedMtpPublicIds).toContain(victim);
      // Workbook: "new batter required" — the dismissed end is vacated.
      expect(s.currentStrikerPublicId, "the dismissed batter's end is empty").toBeNull();
    });
  }

  test("T20-111 caught — bowler credited, fielder recorded", async ({ scoringMatch }) => {
    const catcher = scoringMatch.bowlers.find((b) => b.displayName === "Glenn Maxwell")!;
    const { victim } = await takeWicket(scoringMatch, {
      dismissalType: "CAUGHT", fielder: catcher.mtpPublicId,
    });
    await expectState(scoringMatch, { wickets: 1, bowlers: { Bumrah: { wickets: 1 } } });
    const s = await scoringMatch.api.state(scoringMatch.matchPublicId);
    expect(s.dismissedMtpPublicIds).toContain(victim);
  });

  test("T20-113 stumped — keeper recorded, bowler credited", async ({ scoringMatch }) => {
    const keeper = scoringMatch.bowlers.find((b) => b.displayName === "Matthew Wade")!;
    await takeWicket(scoringMatch, { dismissalType: "STUMPED", fielder: keeper.mtpPublicId });
    await expectState(scoringMatch, { wickets: 1, bowlers: { Bumrah: { wickets: 1 } } });
  });

  // ── Run outs ─────────────────────────────────────────────────────────────
  test("T20-114 run out — striker out, runs credited, bowler not credited", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const fielder = m.bowlers.find((b) => b.displayName === "Travis Head")!;
    // One run completed before the throw, then the striker is out.
    const { before, victim } = await takeWicket(m, {
      dismissalType: "RUN_OUT", victim: "striker", runs: 1, fielder: fielder.mtpPublicId,
    });
    expect(victim).toBe(before.currentStrikerPublicId);

    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Correct batter out; run attribution correct; no bowler wicket."
    expect(s.inningsState.totalRuns, "the completed run counts").toBe(1);
    expect(s.inningsState.totalWickets).toBe(1);
    expect(s.dismissedMtpPublicIds).toContain(victim);
    expect(s.bowlerStats[m.bowler.mtpPublicId].wickets, "a run out is never the bowler's").toBe(0);
    expect(s.batterStats[victim!].runs, "the run is credited to the batter who made it").toBe(1);

    // One run was completed, so the batters crossed: the survivor is now at the
    // striker's end and the vacated end is the non-striker's.
    expect(s.currentStrikerPublicId).toBe(before.currentNonStrikerPublicId);
    expect(s.currentNonStrikerPublicId, "the dismissed end is empty").toBeNull();
  });

  test("T20-115 run out — non-striker out at the bowler's end", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { before, victim } = await takeWicket(m, { dismissalType: "RUN_OUT", victim: "nonstriker" });
    expect(victim).toBe(before.currentNonStrikerPublicId);

    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Correct batter out and end state."
    expect(s.dismissedMtpPublicIds).toContain(victim);
    expect(s.currentStrikerPublicId, "the striker is untouched").toBe(before.currentStrikerPublicId);
    expect(s.currentNonStrikerPublicId, "the non-striker's end is vacated").toBeNull();
    expect(s.bowlerStats[m.bowler.mtpPublicId].wickets).toBe(0);
  });

  test("T20-116 run out — direct hit", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: there is no direct-hit flag on Delivery — only fielder and " +
      "fielder2 — so a direct hit cannot be distinguished from a throw plus a " +
      "receiver. See COVERAGE-MATRIX.md T20-116.");
  });

  for (const [id, label, second] of [
    ["T20-117", "throw + keeper", "Matthew Wade"],
    ["T20-118", "throw + bowler", "Pat Cummins"],
    ["T20-119", "multiple fielders", "Marcus Stoinis"],
  ] as const) {
    test(`${id} run out — ${label} (API only: no UI for a second fielder)`, async ({ scoringMatch }) => {
      // TESTABLE-BACKEND-ONLY. BallRequest carries fielder2PublicId but the wicket
      // modal exposes a single fielder picker, so this cannot be entered in the UI.
      const m = scoringMatch;
      const thrower = m.bowlers.find((b) => b.displayName === "Travis Head")!;
      const receiver = m.bowlers.find((b) => b.displayName === second)!;
      const { victim } = await takeWicket(m, {
        dismissalType: "RUN_OUT", fielder: thrower.mtpPublicId, fielder2: receiver.mtpPublicId,
      });
      const s = await m.api.state(m.matchPublicId);
      expect(s.inningsState.totalWickets).toBe(1);
      expect(s.dismissedMtpPublicIds).toContain(victim);
      expect(s.bowlerStats[m.bowler.mtpPublicId].wickets).toBe(0);

      // Both fielders are persisted on the delivery.
      const { db } = config();
      const row = execFileSync("psql", [
        "-h", db.host, "-p", db.port, "-U", db.user, "-d", db.name, "-tAc",
        `SELECT f1.public_id, f2.public_id FROM deliveries d
         JOIN innings i ON d.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
         LEFT JOIN match_team_players f1 ON d.fielder_id=f1.id
         LEFT JOIN match_team_players f2 ON d.fielder2_id=f2.id
         WHERE mm.public_id='${m.matchPublicId}' AND d.is_wicket ORDER BY d.sequence_number DESC LIMIT 1`,
      ], { encoding: "utf8" }).trim();
      expect(row, "both fielders must be stored").toBe(`${thrower.mtpPublicId}|${receiver.mtpPublicId}`);
    });
  }

  test("T20-126 Mankad — non-striker run out, event stored", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { before, victim } = await takeWicket(m, { dismissalType: "RUN_OUT", victim: "nonstriker" });
    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Correct batter out; event stored."
    expect(victim).toBe(before.currentNonStrikerPublicId);
    expect(s.dismissedMtpPublicIds).toContain(victim);
    expect(s.bowlerStats[m.bowler.mtpPublicId].wickets).toBe(0);
  });

  // ── Retirements ──────────────────────────────────────────────────────────
  test("T20-120 retired hurt — no wicket, status recorded, replacement enters", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Score first so there is something to preserve.
    await m.advanceTo({ runs: [4, 2] });
    const s0 = await m.api.state(m.matchPublicId);
    const virat = m.striker.mtpPublicId;
    expect(s0.currentStrikerPublicId).toBe(virat);
    const runsBefore = s0.batterStats[virat].runs;
    const ballsBefore = s0.batterStats[virat].balls;

    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s0.currentBowlerPublicId!,
      batsmanPublicId: virat,
      nonStrikerPublicId: s0.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT",
      dismissedPlayerPublicId: virat,
    });

    const s1 = await m.api.state(m.matchPublicId);
    // Workbook: "No wicket; status RETIRED_HURT; replacement batter enters."
    expect(s1.inningsState.totalWickets, "a retirement is not a wicket").toBe(0);
    expect(s1.inningsState.totalBalls, "a retirement is not a ball bowled").toBe(2);
    expect(s1.dismissedMtpPublicIds, "not marked out").not.toContain(virat);

    const row = battingStatRow(m.matchPublicId, virat)!;
    expect(row.dismissalType).toBe("RETIRED_HURT");
    expect(row.isOut, "RETIRED_HURT must not set is_out").toBe(false);
    expect(row.runs).toBe(runsBefore);
    expect(row.balls).toBe(ballsBefore);
    expect(row.hasCreaseEntered, "crease_entered_at set on first entry").toBe(true);
    expect(row.hasCreaseExited, "crease_exited_at set when leaving").toBe(true);

    // A replacement can take the vacated end.
    const replacement = m.batters[2];
    const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/select-batter`,
      { batterPublicId: replacement.mtpPublicId, position: "striker" });
    expect(res.status).toBe(200);
  });

  test("T20-121 retired hurt returns — runs and balls preserved, stint restarted", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2] });
    const virat = m.striker.mtpPublicId;
    const s0 = await m.api.state(m.matchPublicId);
    const runsBefore = s0.batterStats[virat].runs;
    const ballsBefore = s0.batterStats[virat].balls;

    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s0.currentBowlerPublicId!,
      batsmanPublicId: virat, nonStrikerPublicId: s0.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT",
      dismissedPlayerPublicId: virat,
    });
    const outRow = battingStatRow(m.matchPublicId, virat)!;
    const stintBefore = outRow.stintAt;

    // Replacement bats, then Virat comes back.
    await m.api.selectBatter(m.matchPublicId, m.batters[2].mtpPublicId, "striker");
    await m.advanceTo({ runs: [1] });          // rotates the replacement away
    const mid = await m.api.state(m.matchPublicId);
    if (mid.currentStrikerPublicId !== null && mid.currentNonStrikerPublicId !== null) {
      // both ends occupied — retire the replacement so Virat can return
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: mid.currentBowlerPublicId!,
        batsmanPublicId: mid.currentStrikerPublicId!,
        nonStrikerPublicId: mid.currentNonStrikerPublicId!,
        runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT",
        dismissedPlayerPublicId: mid.currentStrikerPublicId!,
      });
    }
    const back = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/select-batter`,
      { batterPublicId: virat, position: "striker" });
    expect(back.status, "a retired-hurt batter may return").toBe(200);

    // Workbook: "Previous runs/balls retained; return timestamp saved."
    const row = battingStatRow(m.matchPublicId, virat)!;
    expect(row.runs, "runs preserved across the retirement").toBe(runsBefore);
    expect(row.balls, "balls preserved across the retirement").toBe(ballsBefore);
    expect(row.isOut).toBe(false);
    expect(row.hasCreaseEntered, "crease_entered_at is first entry only").toBe(true);
    expect(row.hasCurrentStint, "current_stint_started_at populated").toBe(true);
    expect(row.stintAt, "the new stint restarts the clock (V87)").not.toBe(stintBefore);
  });

  test("T20-122 retired out — counts as a wicket, not credited to the bowler", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [2] });
    const s0 = await m.api.state(m.matchPublicId);
    const victim = s0.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s0.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: s0.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_OUT",
      dismissedPlayerPublicId: victim,
    });
    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Dismissal/wicket state recorded; return restricted by rules."
    expect(s.inningsState.totalWickets, "RETIRED_OUT is a wicket").toBe(1);
    expect(s.bowlerStats[m.bowler.mtpPublicId].wickets, "but not the bowler's").toBe(0);
    expect(battingStatRow(m.matchPublicId, victim)!.isOut).toBe(true);

    const back = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/select-batter`,
      { batterPublicId: victim, position: "striker" });
    expect(back.status, "a retired-out batter cannot return").toBe(400);
  });

  test("T20-123 obstructing the field — dismissal recorded", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { victim } = await takeWicket(m, { dismissalType: "OBSTRUCTING_FIELD" });
    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.totalWickets).toBe(1);
    expect(s.dismissedMtpPublicIds).toContain(victim);
    expect(battingStatRow(m.matchPublicId, victim!)!.dismissalType).toBe("OBSTRUCTING_FIELD");
  });

  test("T20-124 hit ball twice", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: not in the app's dismissal list. The backend would accept " +
      "the string but applyBall would credit the bowler a wicket, which is wrong.");
  });

  test("T20-125 timed out", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: not in the app's dismissal list, and no arrival timer " +
      "exists. Named in the V22 comment but never built.");
  });

  // ── EDGE-23, pulled forward: undo after a wicket ─────────────────────────
  test("EDGE-23 undo after a wicket restores the batter, their runs and the partnership", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Even runs only, so the striker keeps strike and the batter who is dismissed
    // is one who has actually faced deliveries — that is what the workbook's
    // "runs/balls intact" is about.
    await m.advanceTo({ runs: [4, 2] });
    const before = await m.api.state(m.matchPublicId);
    const victim = before.currentStrikerPublicId!;
    expect(victim, "Virat should still be on strike after two even scores")
      .toBe(m.striker.mtpPublicId);
    const runsBefore = before.batterStats[victim].runs;
    const ballsBefore = before.batterStats[victim].balls;

    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: victim,
    });
    const outState = await m.api.state(m.matchPublicId);
    expect(outState.inningsState.totalWickets).toBe(1);
    expect(outState.partnershipRuns, "a wicket zeroes the partnership").toBe(0);

    const after = await m.api.undo(m.matchPublicId);

    // Workbook EDGE-23: "Wicket/new batter/partnership/strike restored."
    expect(after.inningsState.totalWickets, "the wicket is gone").toBe(0);
    expect(after.dismissedMtpPublicIds, "the batter is no longer out").not.toContain(victim);
    expect(after.currentStrikerPublicId, "restored to the crease").toBe(victim);
    expect(after.currentNonStrikerPublicId).toBe(before.currentNonStrikerPublicId);
    expect(after.batterStats[victim].runs, "runs intact").toBe(runsBefore);
    expect(after.batterStats[victim].balls, "balls intact").toBe(ballsBefore);
    expect(after.partnershipRuns, "partnership restored").toBe(before.partnershipRuns);
    expect(after.partnershipBalls).toBe(before.partnershipBalls);
    expect(after.bowlerStats[m.bowler.mtpPublicId].wickets).toBe(0);
    expect(battingStatRow(m.matchPublicId, victim)!.isOut).toBe(false);
  });

  test("undo returns every batter at the crease in batterStats", async ({ scoringMatch }) => {
    test.fail(true, "BUG-13: replayInnings persists the stub row but omits it from the response");
    const m = scoringMatch;
    // Rotate strike so the non-striker has faced nothing, then dismiss them and
    // undo. Their stat row is rebuilt in the database as a stub but is left out of
    // the map the response is built from.
    await m.advanceTo({ runs: [1] });
    const before = await m.api.state(m.matchPublicId);
    const victim = before.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: victim,
    });
    const after = await m.api.undo(m.matchPublicId);

    expect(after.currentStrikerPublicId, "restored to the crease").toBe(victim);
    expect(battingStatRow(m.matchPublicId, victim), "the row exists in the database").toBeTruthy();
    expect(after.batterStats[victim],
      "a batter at the crease with a persisted stat row must appear in batterStats")
      .toBeTruthy();
  });
});
