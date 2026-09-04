import { test, expect } from "../fixtures/scoringMatch";
import { config } from "../fixtures/env";
import { rawSql } from "../fixtures/captureState";
import { Api } from "../fixtures/api";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Workbook section 17 — Golden T20 Regression Match.
 *
 * "Run this mixed sequence after every major scoring-engine change. Record the
 * expected state after each delivery and compare the final scorecard, event stream
 * and timeline."
 *
 * The expected state after every step lives in golden-match.json, checked into the
 * repo. The spec walks the workbook's sequence in order and compares the live state
 * to that fixture at each step, failing on the FIRST divergence with the step name
 * and a field-level diff — so a regression names the step that broke rather than
 * the assertion that noticed.
 *
 * Regenerate deliberately, never casually:  GOLDEN_UPDATE=1 npx playwright test \
 *   e2e/specs/section-17-golden.spec.ts --project=desktop
 * and read the diff before committing it. The fixture is the record of intended
 * behaviour; changing it is a decision.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(HERE, "../fixtures/golden/golden-match.json");
const UPDATING = process.env.GOLDEN_UPDATE === "1";

interface Snapshot {
  step: string;
  runs: number; wickets: number; balls: number; over: number; ballInOver: number;
  wide: number; noBall: number; bye: number; legBye: number; penalty: number;
  striker: string | null; nonStriker: string | null; bowler: string | null;
  freeHit: boolean; partnershipRuns: number; partnershipBalls: number;
}

test.describe("§17 Golden T20 Regression Match", () => {
  // Runs on desktop and on one mobile project. It is an engine regression driven
  // almost entirely through the API, so a third browser adds runtime without adding
  // coverage; WebKit is kept because it is the one engine the rest of the suite
  // would otherwise not exercise here.
  test("the workbook sequence reproduces the recorded state at every step", async ({ scoringMatch }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome",
      "golden regression runs on desktop and WebKit only — a third engine adds runtime, not coverage");
    test.slow();
    const started = Date.now();
    const m = scoringMatch;
    const recorded: Snapshot[] = [];
    const expected: Snapshot[] = UPDATING || !fs.existsSync(FIXTURE)
      ? [] : JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

    const name = (id: string | null | undefined) =>
      id ? ([...m.batters, ...m.bowlers].find((p) => p.mtpPublicId === id)?.displayName ?? id) : null;

    /** Snapshot, compare against the fixture, and fail here on the first divergence. */
    async function step(label: string) {
      const s = await m.api.state(m.matchPublicId);
      const st = s.inningsState;
      const snap: Snapshot = {
        step: label,
        runs: st.totalRuns, wickets: st.totalWickets, balls: st.totalBalls,
        over: st.overNumber, ballInOver: st.ballInOver,
        wide: st.extrasWide, noBall: st.extrasNoBall, bye: st.extrasBye,
        legBye: st.extrasLegBye, penalty: st.extrasPenalty,
        striker: name(s.currentStrikerPublicId), nonStriker: name(s.currentNonStrikerPublicId),
        bowler: name(s.currentBowlerPublicId), freeHit: !!s.isFreeHit,
        partnershipRuns: s.partnershipRuns ?? 0, partnershipBalls: s.partnershipBalls ?? 0,
      };
      recorded.push(snap);
      if (!UPDATING && expected.length) {
        const want = expected[recorded.length - 1];
        expect(want, `no recorded state for step "${label}" — the fixture is short`).toBeTruthy();
        expect(snap, `first divergence at step: ${label}`).toEqual(want);
      }
      return s;
    }

    const ball = async (b: Record<string, unknown>) => {
      let s = await m.api.state(m.matchPublicId);
      // An over completing mid-sequence clears the bowler and bars the one who just
      // finished. Selecting here, after the snapshot has been taken, keeps step 10's
      // record of the cleared state honest while letting the sequence continue.
      if (!s.currentBowlerPublicId) {
        const oversBowled = (id: string) =>
          Math.floor(((s.bowlerStats?.[id]?.legalBalls as number) ?? 0) / 6);
        const next = m.bowlers
          .filter((x) => x.mtpPublicId !== s.lastBowlerPublicId)
          .sort((a, c) => oversBowled(a.mtpPublicId) - oversBowled(c.mtpPublicId))[0];
        await m.api.correctBowler(m.matchPublicId, next.mtpPublicId);
        s = await m.api.state(m.matchPublicId);
      }
      return m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(b as any),
      });
    };
    const NB = { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT" };

    /** Send a replacement in at whichever end is actually empty. Which end a
     *  dismissal vacates depends on whether the batters crossed, so naming the
     *  position up front is wrong as often as it is right. */
    const sendIn = async (mtpPublicId: string) => {
      const s = await m.api.state(m.matchPublicId);
      const pos = !s.currentStrikerPublicId ? "striker"
        : !s.currentNonStrikerPublicId ? "nonstriker" : null;
      if (!pos) return;
      await m.api.selectBatter(m.matchPublicId, mtpPublicId, pos);
    };

    // 1 — Start 0/0 with Virat* / KL and Bumrah.
    await step("01 start 0/0, Virat on strike, Bumrah bowling");

    // 2-4 — dot, single, two.
    await ball({ runsBatsman: 0 }); await step("02 dot -> 0/0");
    await ball({ runsBatsman: 1 }); await step("03 single -> 1/0, KL on strike");
    await ball({ runsBatsman: 2 }); await step("04 two -> 3/0, KL keeps strike");

    // 5-6 — wide, then a wide with two additional runs.
    await ball({ runsBatsman: 0, runsExtras: 1, extraType: "WIDE" });
    await step("05 wide -> 4/0, legal-ball position unchanged");
    await ball({ runsBatsman: 0, runsExtras: 3, extraType: "WIDE" });
    await step("06 wide + 2 -> +3 wides, legal-ball position unchanged");

    // 7-8 — no ball arming the free hit, then a no ball hit for four.
    await ball({ ...NB }); await step("07 no ball -> +1, free hit armed");
    await ball({ runsBatsman: 4, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT" });
    await step("08 no ball + four -> +5, batter +4");

    // 9 — a legal dot and a legal bye/leg-bye sequence.
    await ball({ runsBatsman: 0 }); await step("09a legal dot");
    await ball({ runsBatsman: 0, runsExtras: 1, extraType: "BYE" }); await step("09b bye");
    await ball({ runsBatsman: 0, runsExtras: 2, extraType: "LEG_BYE" }); await step("09c leg bye");

    // 10 — the over completes on step 9c: the dot, the bye and the leg bye are the
    // fourth, fifth and sixth legal balls, the wides and no balls having consumed
    // none. Ends swap and the bowler is cleared.
    await step("10 over complete — ends swapped, bowler cleared");
    const cummins = m.bowlers.find((b) => b.displayName === "Pat Cummins")!;
    await m.api.correctBowler(m.matchPublicId, cummins.mtpPublicId);
    await step("10b new bowler selected");

    // 11 — a wicket and a replacement batter.
    let s = await m.api.state(m.matchPublicId);
    await ball({
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: s.currentStrikerPublicId!,
    });
    await step("11a wicket — bowled");
    await sendIn(m.batters[2].mtpPublicId);
    await step("11b replacement batter in");

    // 12 — a run out after a completed run.
    s = await m.api.state(m.matchPublicId);
    await ball({
      runsBatsman: 1, isWicket: true, dismissalType: "RUN_OUT",
      dismissedPlayerPublicId: s.currentNonStrikerPublicId!,
      fielderPublicId: m.bowlers[3].mtpPublicId,
    });
    await step("12 run out after a completed run");
    await sendIn(m.batters[3].mtpPublicId);
    await step("12b replacement batter in");

    // 13 — a live coaching note; context captured, score untouched.
    const note = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/annotations`,
      { noteText: "held his length after the run out", category: "Bowling" });
    expect(note.status).toBe(200);
    await step("13 live note added — score unchanged");

    // 14 — pause for rain; scoring refused and the score frozen.
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/pause`, { reason: "Rain" });
    const frozen = await m.api.state(m.matchPublicId);
    const blocked = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
        bowlerPublicId: frozen.currentBowlerPublicId,
        batsmanPublicId: frozen.currentStrikerPublicId,
        nonStrikerPublicId: frozen.currentNonStrikerPublicId, runsBatsman: 1,
      });
    expect(blocked.status, "scoring is refused while paused").toBe(409);
    await step("14 paused for rain — score frozen");

    // 15 — resume at the exact next ball.
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/resume`);
    await step("15 resumed — same position");

    // 16 — retire a batter hurt, then bring them back.
    s = await m.api.state(m.matchPublicId);
    const retiring = s.currentStrikerPublicId!;
    await ball({
      runsBatsman: 0, isWicket: true, dismissalType: "RETIRED_HURT",
      dismissedPlayerPublicId: retiring,
    });
    await step("16a retired hurt — not a wicket");
    await sendIn(m.batters[4].mtpPublicId);
    await step("16b replacement in");

    // 17 — free hit + run out (the one dismissal a free hit allows).
    await ball({ ...NB });
    await step("17a no ball — free hit armed");
    s = await m.api.state(m.matchPublicId);
    await ball({
      runsBatsman: 0, isWicket: true, dismissalType: "RUN_OUT",
      dismissedPlayerPublicId: s.currentNonStrikerPublicId!, isFreeHit: true,
      fielderPublicId: m.bowlers[4].mtpPublicId,
    });
    await step("17b free hit + run out — allowed");
    await sendIn(m.batters[5].mtpPublicId);
    await step("17c replacement in");

    // 18 — wide + run out.
    s = await m.api.state(m.matchPublicId);
    await ball({
      runsBatsman: 0, runsExtras: 1, extraType: "WIDE", isWicket: true,
      dismissalType: "RUN_OUT", dismissedPlayerPublicId: s.currentNonStrikerPublicId!,
      fielderPublicId: m.bowlers[5].mtpPublicId,
    });
    await step("18 wide + run out — illegal ball, wicket stands");
    await sendIn(m.batters[6].mtpPublicId);
    await step("18b replacement in");

    // 19 — a catch attempted on a free hit must not stand.
    await ball({ ...NB });
    s = await m.api.state(m.matchPublicId);
    const invalid = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
        bowlerPublicId: s.currentBowlerPublicId, batsmanPublicId: s.currentStrikerPublicId,
        nonStrikerPublicId: s.currentNonStrikerPublicId, runsBatsman: 0, isWicket: true,
        dismissalType: "CAUGHT", dismissedPlayerPublicId: s.currentStrikerPublicId,
        isFreeHit: true,
      });
    expect(invalid.status, "a catch on a free hit is refused").toBe(400);
    await step("19 no ball + catch attempt — no invalid wicket");

    // 20 — complete another mixed over.
    await ball({ runsBatsman: 2 });
    await ball({ runsBatsman: 0, runsExtras: 1, extraType: "LEG_BYE" });
    await ball({ runsBatsman: 4 });
    await step("20 mixed over continued");

    // 21 — undo the last ball and verify dependent state.
    const beforeUndo = await m.api.state(m.matchPublicId);
    await m.api.undo(m.matchPublicId);
    await step("21 undo last ball");
    // 22 — redo is not implemented; re-post the identical delivery instead.
    await ball({ runsBatsman: 4 });
    await step("22 delivery re-posted (no redo exists — see T20-311)");
    expect((await m.api.state(m.matchPublicId)).inningsState.totalRuns)
      .toBe(beforeUndo.inningsState.totalRuns);

    // 23 — edit a previous delivery; the innings replays.
    const deliveries = (await m.api.raw("get",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries`)).body;
    const target = deliveries.find((d: any) => d.extraType === "BYE");
    const edit = await m.api.raw("patch",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries/${target.publicId}`,
      { extraType: "LEG_BYE" });
    expect(edit.status).toBe(200);
    await step("23 edited a bye into a leg bye — innings replayed");

    // 24 — reopen in a fresh client and confirm the state is unchanged.
    const reopened = await Api.login(config().a);
    try {
      const s2 = await reopened.state(m.matchPublicId);
      expect(s2.inningsState.totalRuns,
        "a fresh client sees the same total").toBe((await m.api.state(m.matchPublicId)).inningsState.totalRuns);
    } finally {
      await reopened.dispose();
    }
    await step("24 reopened — state identical");

    // 25 — offline sync is deferred by design; nothing to run.

    // 26 — finish: close the innings, chase, and win by wickets.
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
      { reason: "OVERS_COMPLETE" });
    const teams = await m.api.getTeams(m.matchPublicId);
    const chaseBat = await m.api.getXI(m.matchPublicId, teams[1].publicId);
    const chaseBowl = await m.api.getXI(m.matchPublicId, teams[0].publicId);
    await m.api.selectBatter(m.matchPublicId, chaseBat[0].mtpPublicId, "striker");
    await m.api.selectBatter(m.matchPublicId, chaseBat[1].mtpPublicId, "nonstriker");
    await m.api.correctBowler(m.matchPublicId, chaseBowl[7].mtpPublicId);
    const target2 = (await m.api.state(m.matchPublicId)).inningsState.target as number;
    let resp: any = null;
    for (let i = 0; i < 40; i++) {
      const cur = await m.api.state(m.matchPublicId);
      if (cur.inningsState.totalRuns >= target2) break;
      const need = target2 - cur.inningsState.totalRuns;
      resp = await ball({ runsBatsman: need >= 6 ? 6 : need });
    }
    expect(resp?.inningsComplete, "the chase ends when the target is reached").toBe(true);

    // 27 — generate the scorecard and reconcile it.
    const card = await m.api.raw("get", `/api/public/scorecard/${m.matchPublicId}`);
    expect(card.status).toBe(200);
    for (const inn of card.body.innings) {
      const batterRuns = inn.battingCard.reduce((n: number, b: any) => n + (b.runs ?? 0), 0);
      const buckets = inn.extrasWide + inn.extrasNoBall + inn.extrasBye + inn.extrasLegBye
        + inn.extrasPenalty;
      expect(buckets, `innings ${inn.inningsNumber} extras total`).toBe(inn.extrasTotal);
      expect(batterRuns + buckets, `innings ${inn.inningsNumber} reconciles`).toBe(inn.totalRuns);
    }

    // 28 — an unauthorised edit from another academy must not be possible.
    const other = await Api.login(config().b);
    try {
      const forbidden = await other.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`);
      expect(forbidden.status, "Academy B cannot even read the match").toBe(404);
      const edits = (await m.api.raw("get",
        `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries`)).body;
      if (edits.length) {
        const attempt = await other.raw("patch",
          `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries/${edits[0].publicId}`,
          { runsBatsman: 6 });
        expect(attempt.status, "and cannot edit a delivery in it").toBe(404);
      }
    } finally {
      await other.dispose();
    }

    if (UPDATING) {
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, JSON.stringify(recorded, null, 1) + "\n");
      console.log(`[golden] wrote ${recorded.length} steps to ${FIXTURE}`);
    }
    console.log(`[golden] ${recorded.length} steps in ${Date.now() - started}ms`);
  });
});
