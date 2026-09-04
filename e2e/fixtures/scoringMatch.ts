import { test as base, expect, type Page } from "@playwright/test";
import { Api } from "./api";
import { config, type Tenant } from "./env";

// Workbook baseline (WORKBOOK-EXTRACTED.md § Preamble):
// "India vs Australia • T20 • 20 overs • Virat Kohli striker • KL Rahul
//  non-striker • Bumrah bowler. Reset the match between independent tests."
export const BATTING_XI = [
  "Virat Kohli", "KL Rahul", "Rohit Sharma", "Shubman Gill", "Suryakumar Yadav",
  "Rishabh Pant", "Hardik Pandya", "Ravindra Jadeja", "Axar Patel", "Arshdeep Singh", "Mohammed Siraj",
];
export const BOWLING_XI = [
  "David Warner", "Travis Head", "Mitchell Marsh", "Glenn Maxwell", "Marcus Stoinis",
  "Matthew Wade", "Tim David", "Bumrah", "Pat Cummins", "Adam Zampa", "Josh Hazlewood",
];
const KEEPER_INDEX = 5;      // Pant / Wade
const BUMRAH_INDEX = 7;      // opening bowler per the workbook baseline

export interface Player { mtpPublicId: string; displayName: string; battingOrder: number }

export interface ScoringMatch {
  api: Api;
  matchPublicId: string;
  battingTeamPublicId: string;
  bowlingTeamPublicId: string;
  batters: Player[];
  bowlers: Player[];
  striker: Player;       // Virat
  nonStriker: Player;    // KL Rahul
  bowler: Player;        // Bumrah
  /** Open the live scorer page for this match in the browser. */
  open(page: Page): Promise<void>;
  /** Score deliveries via the API to reach a setup state (NEEDS-FIXTURE scenarios). */
  advanceTo(state: AdvanceSpec): Promise<void>;
}

export interface AdvanceSpec {
  /** Legal balls to bowl in the current over, as dots unless `runs` given. */
  legalBalls?: number;
  /** Runs to put on the striker's bat, one delivery each (used for milestones). */
  runs?: number[];
}

const xi = (names: string[], keeper: number) =>
  names.map((n, i) => ({
    externalName: n,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isWicketkeeper: i === keeper,
    isImpactPlayer: false,
    isForeign: false,
  }));

/**
 * Creates a fresh, fully-started match owned by test academy A, with openers and
 * the opening bowler already selected, and deletes it on teardown.
 *
 * Built through the API rather than the setup UI: MatchSetupPage is not under
 * test here, and a UI build would make every scoring test depend on it. Players
 * are guest entries (`externalName`), so no row is added to the academy's real
 * `players` table.
 */
export async function createScoringMatch(
  opts: { totalOvers?: number; tenant?: Tenant } = {},
): Promise<ScoringMatch> {
  const env = config();
  const api = await Api.login(opts.tenant ?? env.a);

  // Retry on the known public-id collision — BUGS-FOUND.md BUG-11.
  // MatchService.generateMatchPublicId() is "MCH-NCA-" + currentTimeMillis(), so
  // two matches created in the same millisecond violate the global unique
  // constraint. Two Playwright workers hit this routinely; two real admins would
  // hit it rarely. Retried here rather than serialising the suite, because
  // serialising would hide a real defect behind a slower test run.
  //
  // Matched on the generic message, not a constraint name: since b9a58a5 the API
  // no longer returns raw schema detail. Match creation has exactly one unique
  // constraint that a caller can trip, so "already exists" here is unambiguous —
  // but it does mean a client can no longer tell which constraint failed. Noted
  // against BUG-11.
  let match: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      match = await api.createMatch({
        title: `E2E T20 ${Date.now()}`,
        matchDate: new Date().toISOString().slice(0, 10),
        matchType: "INTERNAL",
        totalOvers: opts.totalOvers ?? 20,
        venue: "E2E Test Ground",
      });
      break;
    } catch (e) {
      const msg = String(e);
      const isCollision =
        msg.includes("cricket_matches_public_id_key") ||        // pre-b9a58a5 wording
        (msg.includes("400") && msg.includes("already exists")); // current wording
      if (!isCollision) throw e;
      await new Promise((r) => setTimeout(r, 15 + attempt * 10));
    }
  }
  if (!match) throw new Error("createMatch kept colliding on public_id (BUG-11)");
  const matchPublicId: string = match.publicId;

  await api.setTeams(matchPublicId, {
    teamAName: "India",
    teamBName: "Australia",
    teamAPlayers: xi(BATTING_XI, KEEPER_INDEX),
    teamBPlayers: xi(BOWLING_XI, KEEPER_INDEX),
  });

  const teams = await api.getTeams(matchPublicId);
  const battingTeamPublicId = teams[0].publicId;
  const bowlingTeamPublicId = teams[1].publicId;

  await api.toss(matchPublicId, { winnerTeamPublicId: battingTeamPublicId, decision: "BAT" });
  await api.start(matchPublicId);

  const batters: Player[] = await api.getXI(matchPublicId, battingTeamPublicId);
  const bowlers: Player[] = await api.getXI(matchPublicId, bowlingTeamPublicId);

  const striker = batters[0];
  const nonStriker = batters[1];
  const bowler = bowlers[BUMRAH_INDEX];
  expect(striker.displayName, "opener 1 must be Virat per the workbook baseline").toBe("Virat Kohli");
  expect(nonStriker.displayName, "opener 2 must be KL Rahul").toBe("KL Rahul");
  expect(bowler.displayName, "opening bowler must be Bumrah").toBe("Bumrah");

  await api.selectBatter(matchPublicId, striker.mtpPublicId, "striker");
  await api.selectBatter(matchPublicId, nonStriker.mtpPublicId, "nonstriker");
  // The workbook baseline also fixes the opening bowler ("Bumrah bowler"). There
  // is no dedicated "set opening bowler" endpoint — correct-bowler is the one
  // that installs innings.currentBowler, and it is legal here because no ball has
  // been bowled yet (ScoringService.correctBowler rejects when ballInOver != 0).
  // Without this the scorer UI shows "Select bowler" and score() refuses to post.
  await api.correctBowler(matchPublicId, bowler.mtpPublicId);

  return {
    api, matchPublicId, battingTeamPublicId, bowlingTeamPublicId,
    batters, bowlers, striker, nonStriker, bowler,

    async open(page: Page) {
      // Seed the session before any app code runs so the scorer loads straight
      // to the match. AuthContext reads these keys once, on boot, and
      // ProtectedRoute rejects on a missing userRole — the token alone is not
      // enough (src/auth/ProtectedRoute.tsx:21-30).
      await page.addInitScript((seed) => {
        for (const [k, v] of Object.entries(seed)) {
          window.localStorage.setItem(k, v as string);
        }
        // Turn off the shot-zone (wagon wheel) prompt. It is a real user
        // preference the app already reads (LiveScorerPage.tsx:343), and it opens
        // a full-screen `fixed inset-0 z-[60]` modal after ANY delivery with runs
        // > 0 (needsWagonWheel, L298-302), which covers the scoring pad and blocks
        // the next tap. Scenarios that are about shot zones (T20-387) re-enable it
        // explicitly; nothing else in the workbook involves shot tagging.
        window.localStorage.setItem("nca_ww_enabled", "false");
      }, api.storageSeed());
      await page.goto(`/admin/cricket/matches/${matchPublicId}/score`);
    },

    async advanceTo(spec: AdvanceSpec) {
      const seq = spec.runs ?? Array(spec.legalBalls ?? 0).fill(0);
      for (const r of seq) {
        const s = await api.state(matchPublicId);
        // After an over completes the server clears currentBowler, and the bowler
        // who just finished may not bowl the next one, so falling back to the
        // fixture's opening bowler would now be rejected. Pick the first bowler
        // who is not the preceding over's.
        let bowlerId = s.currentBowlerPublicId;
        if (!bowlerId) {
          bowlerId = (bowlers.find((b) => b.mtpPublicId !== s.lastBowlerPublicId)
            ?? bowlers[0]).mtpPublicId;
          await api.correctBowler(matchPublicId, bowlerId);
        }
        await api.postBall(matchPublicId, {
          bowlerPublicId: bowlerId,
          batsmanPublicId: s.currentStrikerPublicId!,
          nonStrikerPublicId: s.currentNonStrikerPublicId!,
          runsBatsman: r,
        });
      }
    },
  };
}

/**
 * Deletes the match and closes the API context.
 *
 * This goes through the real endpoint and nothing else. There used to be a
 * direct-to-database fallback here because no started match could be deleted
 * (BUG-10: deleteMatch left orphan innings_batting_stats / innings_bowling_stats
 * rows, whose FKs are NO ACTION). That is fixed, so the suite depends only on the
 * API — if teardown ever regresses, tests must fail rather than quietly clean up
 * behind the app's back.
 */
export async function destroyScoringMatch(m: ScoringMatch) {
  const res = await m.api.deleteMatch(m.matchPublicId);
  if (res.status >= 300) {
    throw new Error(
      `Teardown failed: DELETE ${m.matchPublicId} returned ${res.status} ` +
        `${JSON.stringify(res.body)}. The match has been left in the database.`,
    );
  }
  await m.api.dispose();
  return res;
}

export const test = base.extend<{ scoringMatch: ScoringMatch }>({
  scoringMatch: async ({}, use) => {
    const m = await createScoringMatch();
    await use(m);
    await destroyScoringMatch(m);
  },
});

export { expect };
