import { test, expect } from "../fixtures/scoringMatch";
import { config } from "../fixtures/env";
import { execFileSync } from "node:child_process";

/**
 * BUG-15 regression — the bowler is credited only for dismissals they earned.
 *
 * Credited: BOWLED, CAUGHT, LBW, STUMPED, HIT_WICKET.
 * Not credited: RUN_OUT, OBSTRUCTING_FIELD, HANDLED_BALL, HIT_TWICE, TIMED_OUT,
 * RETIRED_OUT, RETIRED_HURT.
 *
 * `dismissal_type` is a free VARCHAR with no enum, so the rule is an allow-list:
 * a string nobody has heard of must not be credited. The three deny-lists this
 * replaced disagreed with each other and all defaulted to crediting.
 */

const CREDITED = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"] as const;
const NOT_CREDITED = [
  "RUN_OUT", "OBSTRUCTING_FIELD", "HANDLED_BALL", "HIT_TWICE", "TIMED_OUT", "RETIRED_OUT",
] as const;

test.describe("BUG-15 bowler wicket credit", () => {

  const dismiss = async (m: any, dismissalType: string) => {
    const s = await m.api.state(m.matchPublicId);
    const keeper = m.bowlers.find((b: any) => b.displayName === "Matthew Wade")!;
    const fielder = m.bowlers.find((b: any) => b.displayName === "Glenn Maxwell")!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType,
      dismissedPlayerPublicId: s.currentStrikerPublicId!,
      fielderPublicId: dismissalType === "STUMPED" ? keeper.mtpPublicId : fielder.mtpPublicId,
    } as any);
    return m.api.state(m.matchPublicId);
  };

  for (const type of CREDITED) {
    test(`${type} is credited to the bowler`, async ({ scoringMatch }) => {
      const after = await dismiss(scoringMatch, type);
      expect(after.inningsState.totalWickets, "the team loses a wicket").toBe(1);
      expect(after.bowlerStats[scoringMatch.bowler.mtpPublicId].wickets,
        `${type} is the bowler's wicket`).toBe(1);
    });
  }

  for (const type of NOT_CREDITED) {
    test(`${type} is not credited to the bowler`, async ({ scoringMatch }) => {
      // HANDLED_BALL, HIT_TWICE and TIMED_OUT are not offered by the UI, but the
      // column accepts any string, so the server must still refuse them credit.
      const after = await dismiss(scoringMatch, type);
      expect(after.inningsState.totalWickets, "the team still loses a wicket").toBe(1);
      expect(after.bowlerStats[scoringMatch.bowler.mtpPublicId]?.wickets ?? 0,
        `${type} is not the bowler's wicket`).toBe(0);
    });
  }

  test("an unknown dismissal string is not credited", async ({ scoringMatch }) => {
    // The allow-list is the point: dismissal_type has no enum and no check
    // constraint, so a deny-list would credit anything it had not heard of.
    const after = await dismiss(scoringMatch, "SOMETHING_NOBODY_HAS_HEARD_OF");
    expect(after.inningsState.totalWickets).toBe(1);
    expect(after.bowlerStats[scoringMatch.bowler.mtpPublicId]?.wickets ?? 0,
      "an unrecognised dismissal must not be credited by default").toBe(0);
  });

  test("RETIRED_HURT is neither a team wicket nor the bowler's", async ({ scoringMatch }) => {
    const after = await dismiss(scoringMatch, "RETIRED_HURT");
    expect(after.inningsState.totalWickets, "a retirement hurt is not a wicket at all").toBe(0);
    expect(after.bowlerStats[scoringMatch.bowler.mtpPublicId]?.wickets ?? 0).toBe(0);
  });

  test("live state, the scorecard and the SQL recomputations agree on wickets", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // One credited, one not, so the two rules would give different answers if any
    // path had been missed.
    await dismiss(m, "BOWLED");
    await m.api.selectBatter(m.matchPublicId, m.batters[2].mtpPublicId, "striker");
    await dismiss(m, "OBSTRUCTING_FIELD");
    await m.api.selectBatter(m.matchPublicId, m.batters[3].mtpPublicId, "striker");
    await dismiss(m, "CAUGHT");

    const live = await m.api.state(m.matchPublicId);
    const liveWickets = Object.values(live.bowlerStats as Record<string, { wickets: number }>)
      .reduce((n, b) => n + b.wickets, 0);
    expect(live.inningsState.totalWickets, "three batters are out").toBe(3);
    expect(liveWickets, "but only two are the bowler's").toBe(2);

    const card = await m.api.raw("get", `/api/public/scorecard/${m.matchPublicId}`);
    expect(card.status).toBe(200);
    const cardWickets = card.body.innings[0].bowlingCard
      .reduce((n: number, b: any) => n + b.wickets, 0);
    expect(cardWickets, "the scorecard recomputes the same figure").toBe(liveWickets);

    // And the predicate the career/tournament paths use, against the same rows.
    const { db } = config();
    const sqlWickets = Number(execFileSync("psql", [
      "-h", db.host, "-p", db.port, "-U", db.user, "-d", db.name, "-tAc",
      `SELECT count(*) FROM deliveries d
       JOIN innings i ON d.innings_id=i.id JOIN cricket_matches m ON i.match_id=m.id
       WHERE m.public_id='${m.matchPublicId}' AND d.is_wicket
         AND d.dismissal_type IN ('BOWLED','CAUGHT','LBW','STUMPED','HIT_WICKET')`,
    ], { encoding: "utf8" }).trim());
    expect(sqlWickets, "the career/tournament SQL predicate agrees too").toBe(liveWickets);

    // And innings_bowling_stats, which the live path writes.
    const storedWickets = Number(execFileSync("psql", [
      "-h", db.host, "-p", db.port, "-U", db.user, "-d", db.name, "-tAc",
      `SELECT coalesce(sum(s.wickets),0) FROM innings_bowling_stats s
       JOIN innings i ON s.innings_id=i.id JOIN cricket_matches m ON i.match_id=m.id
       WHERE m.public_id='${m.matchPublicId}'`,
    ], { encoding: "utf8" }).trim());
    expect(storedWickets, "innings_bowling_stats agrees with all of them").toBe(liveWickets);
  });

  test("replay preserves bowler wickets", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await dismiss(m, "BOWLED");
    await m.api.selectBatter(m.matchPublicId, m.batters[2].mtpPublicId, "striker");
    await dismiss(m, "OBSTRUCTING_FIELD");
    await m.api.selectBatter(m.matchPublicId, m.batters[3].mtpPublicId, "striker");
    const before = await m.api.state(m.matchPublicId);

    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 1,
    });
    const after = await m.api.undo(m.matchPublicId);

    expect(after.bowlerStats).toEqual(before.bowlerStats);
    expect(after.inningsState.totalWickets).toBe(before.inningsState.totalWickets);
  });
});
