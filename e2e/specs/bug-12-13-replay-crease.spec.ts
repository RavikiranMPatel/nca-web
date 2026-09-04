import { test, expect } from "../fixtures/scoringMatch";
import { config } from "../fixtures/env";
import { execFileSync } from "node:child_process";

/**
 * BUG-12, BUG-13 and BUG-16 regression — one root cause.
 *
 * `replayInnings` rebuilt everything about who is at the crease from the delivery
 * stream. But a batter selection is state in its own right: `selectBatter` and
 * `correctBowler` put a player on with no delivery behind them, so the stream
 * cannot re-derive them. Three symptoms followed:
 *
 *   BUG-12  undoing to zero deliveries nulled striker, non-striker and bowler
 *   BUG-13  a batter at the crease with a stat row was omitted from batterStats
 *   BUG-16  an undone dismissal left a stale crease_exited_at on the batter
 *
 * A batter is at the crease when their stat row says not out and carries no exit
 * time. These assert that the API and the database both agree with that.
 */

function creaseRows(matchPublicId: string) {
  const { db } = config();
  const out = execFileSync("psql", [
    "-h", db.host, "-p", db.port, "-U", db.user, "-d", db.name, "-tAc",
    `SELECT mtp.public_id, s.is_out, (s.crease_exited_at IS NULL)
     FROM innings_batting_stats s
     JOIN innings i ON s.innings_id = i.id
     JOIN cricket_matches m ON i.match_id = m.id
     JOIN match_team_players mtp ON s.mtp_id = mtp.id
     WHERE m.public_id = '${matchPublicId}' ORDER BY 1`,
  ], { encoding: "utf8" }).trim();
  const rows: Record<string, { isOut: boolean; atCrease: boolean }> = {};
  for (const line of out.split("\n").filter(Boolean)) {
    const [id, isOut, noExit] = line.split("|");
    rows[id] = { isOut: isOut === "t", atCrease: isOut !== "t" && noExit === "t" };
  }
  return rows;
}

test.describe("BUG-12/13/16 replay and the crease", () => {

  test("BUG-12 undoing to zero deliveries keeps the openers and the bowler", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const before = await m.api.state(m.matchPublicId);
    expect(before.currentStrikerPublicId).toBe(m.striker.mtpPublicId);
    expect(before.currentNonStrikerPublicId).toBe(m.nonStriker.mtpPublicId);
    expect(before.currentBowlerPublicId).toBe(m.bowler.mtpPublicId);

    // One delivery, then undo it — the innings is back to no deliveries at all.
    await m.advanceTo({ runs: [2] });
    const after = await m.api.undo(m.matchPublicId);

    expect(after.inningsState.totalBalls).toBe(0);
    expect(after.inningsState.totalRuns).toBe(0);
    // The selection was never a delivery, so it must survive.
    expect(after.currentStrikerPublicId, "striker survives an undo to zero").toBe(m.striker.mtpPublicId);
    expect(after.currentNonStrikerPublicId, "non-striker survives").toBe(m.nonStriker.mtpPublicId);
    expect(after.currentBowlerPublicId, "bowler survives").toBe(m.bowler.mtpPublicId);

    // And scoring continues without re-selecting anybody.
    await m.advanceTo({ runs: [1] });
    const resumed = await m.api.state(m.matchPublicId);
    expect(resumed.inningsState.totalRuns).toBe(1);
    expect(resumed.inningsState.totalBalls).toBe(1);
  });

  test("BUG-13 every batter with a stat row appears in batterStats", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Rotate strike so the new striker has faced nothing, dismiss them, undo.
    await m.advanceTo({ runs: [1] });
    const before = await m.api.state(m.matchPublicId);
    const victim = before.currentStrikerPublicId!;

    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: victim,
      nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: victim,
    });
    const after = await m.api.undo(m.matchPublicId);

    expect(after.currentStrikerPublicId, "restored to the crease").toBe(victim);
    const db = creaseRows(m.matchPublicId);
    expect(db[victim], "the row exists in the database").toBeTruthy();
    expect(after.batterStats[victim], "and must appear in the response").toBeTruthy();

    // The API and the database must list the same batters.
    expect(Object.keys(after.batterStats).sort(), "API and DB must agree on who has a row")
      .toEqual(Object.keys(db).sort());
  });

  test("BUG-16 an undone dismissal clears the exit time as well as is_out", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [2, 2] });
    const before = await m.api.state(m.matchPublicId);
    const victim = before.currentStrikerPublicId!;

    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: victim,
      nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: victim,
    });
    const out = creaseRows(m.matchPublicId);
    expect(out[victim].isOut, "out while the dismissal stands").toBe(true);
    expect(out[victim].atCrease).toBe(false);

    await m.api.undo(m.matchPublicId);

    const back = creaseRows(m.matchPublicId);
    expect(back[victim].isOut, "is_out reverts").toBe(false);
    expect(back[victim].atCrease,
      "and so does crease_exited_at — a batter back at the crease has no exit time")
      .toBe(true);

    // Every batter the server says is at the crease agrees with the row-level view.
    const s = await m.api.state(m.matchPublicId);
    for (const id of [s.currentStrikerPublicId, s.currentNonStrikerPublicId]) {
      if (id) expect(back[id]?.atCrease, `${id} is at the crease per the DB`).toBe(true);
    }
  });

  test("a dismissal that still stands keeps its original exit time", async ({ scoringMatch }) => {
    // The counterpart: the restore must still preserve the original timestamp for a
    // dismissal that survives the replay, rather than stamping it with now().
    const m = scoringMatch;
    await m.advanceTo({ runs: [2] });
    const s = await m.api.state(m.matchPublicId);
    const victim = s.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: victim,
    });
    await m.api.selectBatter(m.matchPublicId, m.batters[2].mtpPublicId, "striker");

    const { db } = config();
    const exitedAt = () => execFileSync("psql", [
      "-h", db.host, "-p", db.port, "-U", db.user, "-d", db.name, "-tAc",
      `SELECT to_char(s.crease_exited_at,'YYYYMMDDHH24MISSMS') FROM innings_batting_stats s
       JOIN innings i ON s.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
       JOIN match_team_players mtp ON s.mtp_id=mtp.id
       WHERE mm.public_id='${m.matchPublicId}' AND mtp.public_id='${victim}'`,
    ], { encoding: "utf8" }).trim();
    const original = exitedAt();
    expect(original, "the dismissal has an exit time").toBeTruthy();

    // Force a replay that leaves the dismissal in place.
    await m.advanceTo({ runs: [1] });
    await m.api.undo(m.matchPublicId);

    expect(exitedAt(), "the original exit time is preserved across a replay").toBe(original);
  });
});
