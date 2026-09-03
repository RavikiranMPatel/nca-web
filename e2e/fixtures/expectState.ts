import { expect, type Page } from "@playwright/test";
import type { ScoringMatch } from "./scoringMatch";

/**
 * The fields the workbook says to verify on every delivery
 * (WORKBOOK-EXTRACTED.md § "For every delivery verify"). Every field is
 * optional — assert only what a scenario actually pins down.
 */
export interface ExpectedState {
  runs?: number;
  wickets?: number;
  /** Legal balls bowled in the innings. `over`/`ball` are derived from it. */
  balls?: number;
  /** Display over number, 1-indexed, as the API reports it. */
  over?: number;
  /** Legal balls bowled in the current over. */
  ballInOver?: number;
  striker?: string;
  nonStriker?: string;
  batters?: Record<string, { runs?: number; balls?: number; fours?: number; sixes?: number }>;
  bowlers?: Record<string, {
    legalBalls?: number; runsConceded?: number; wickets?: number;
    maidens?: number; dots?: number; wides?: number; noBalls?: number;
  }>;
  extras?: { wide?: number; noBall?: number; bye?: number; legBye?: number };
  partnership?: { runs?: number; balls?: number };
  freeHit?: boolean;
}

async function settle(m: ScoringMatch, want: ExpectedState, timeoutMs = 5000) {
  const headline = (st: any) =>
    (want.runs === undefined || st.totalRuns === want.runs) &&
    (want.wickets === undefined || st.totalWickets === want.wickets) &&
    (want.balls === undefined || st.totalBalls === want.balls);

  const deadline = Date.now() + timeoutMs;
  let last = await m.api.state(m.matchPublicId);
  while (!headline(last.inningsState) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
    last = await m.api.state(m.matchPublicId);
  }
  return last;
}

const nameOf = (m: ScoringMatch, mtpPublicId: string | null | undefined) => {
  if (!mtpPublicId) return null;
  const p = [...m.batters, ...m.bowlers].find((x) => x.mtpPublicId === mtpPublicId);
  return p?.displayName ?? mtpPublicId;
};

const byName = (m: ScoringMatch, name: string) => {
  const p = [...m.batters, ...m.bowlers].find((x) => x.displayName === name);
  if (!p) throw new Error(`No player named "${name}" in this match`);
  return p.mtpPublicId;
};

/**
 * Asserts the scoring state in one call.
 *
 * The backend is authoritative (CLAUDE.md § Architecture), so every expectation
 * is checked against `GET .../scoring/state`. When a `page` is supplied, the
 * UI-visible subset is ALSO read from the DOM and compared to the same server
 * response — a UI/API divergence is itself a bug and fails here.
 *
 * Not checkable in the UI, so API-only:
 *  - the extras breakdown (the live scorer renders no extras panel at all)
 *  - partnership runs/balls (not rendered)
 *  - per-batter fours/sixes (only shown once non-zero)
 */
export async function expectState(
  m: ScoringMatch,
  want: ExpectedState,
  page?: Page,
) {
  // A UI-driven delivery is an async POST, so poll until the server reflects the
  // headline numbers before asserting in detail. On timeout we fall through and
  // let the individual assertions report the real mismatch, which gives a far
  // better message than a bare poll timeout.
  const s = await settle(m, want);
  const st = s.inningsState;

  if (want.runs !== undefined) expect(st.totalRuns, "team runs").toBe(want.runs);
  if (want.wickets !== undefined) expect(st.totalWickets, "team wickets").toBe(want.wickets);
  if (want.balls !== undefined) expect(st.totalBalls, "legal balls").toBe(want.balls);
  if (want.over !== undefined) expect(st.overNumber, "over number").toBe(want.over);
  if (want.ballInOver !== undefined) expect(st.ballInOver, "ball in over").toBe(want.ballInOver);

  if (want.striker !== undefined)
    expect(nameOf(m, s.currentStrikerPublicId), "striker").toBe(want.striker);
  if (want.nonStriker !== undefined)
    expect(nameOf(m, s.currentNonStrikerPublicId), "non-striker").toBe(want.nonStriker);

  if (want.freeHit !== undefined) expect(s.isFreeHit, "free hit").toBe(want.freeHit);

  if (want.partnership) {
    if (want.partnership.runs !== undefined)
      expect(s.partnershipRuns, "partnership runs").toBe(want.partnership.runs);
    if (want.partnership.balls !== undefined)
      expect(s.partnershipBalls, "partnership balls").toBe(want.partnership.balls);
  }

  if (want.extras) {
    const e = want.extras;
    if (e.wide !== undefined) expect(st.extrasWide, "extras: wide").toBe(e.wide);
    if (e.noBall !== undefined) expect(st.extrasNoBall, "extras: no ball").toBe(e.noBall);
    if (e.bye !== undefined) expect(st.extrasBye, "extras: bye").toBe(e.bye);
    if (e.legBye !== undefined) expect(st.extrasLegBye, "extras: leg bye").toBe(e.legBye);
    // NOTE: extras_penalty exists on the Innings row but is absent from
    // InningsStateDTO, so it cannot be asserted here — BUGS-FOUND.md BUG-04.
  }

  for (const [name, want_] of Object.entries(want.batters ?? {})) {
    const got = s.batterStats?.[byName(m, name)];
    expect(got, `no batting stats for ${name}`).toBeTruthy();
    for (const k of ["runs", "balls", "fours", "sixes"] as const)
      if (want_[k] !== undefined) expect(got[k], `${name} ${k}`).toBe(want_[k]);
  }

  for (const [name, want_] of Object.entries(want.bowlers ?? {})) {
    const got = s.bowlerStats?.[byName(m, name)];
    expect(got, `no bowling stats for ${name}`).toBeTruthy();
    for (const k of ["legalBalls", "runsConceded", "wickets", "maidens", "dots", "wides", "noBalls"] as const)
      if (want_[k] !== undefined) expect(got[k], `${name} ${k}`).toBe(want_[k]);
  }

  if (page) await expectUiMatchesServer(page, m, s);
  return s;
}

/**
 * Compares what the browser is showing against the same server response.
 * Anything the UI renders and the API also reports must agree.
 */
export async function expectUiMatchesServer(page: Page, m: ScoringMatch, s: any) {
  const st = s.inningsState;

  await expect(page.getByTestId("team-score"), "UI score vs server")
    .toHaveText(`${st.totalRuns}/${st.totalWickets}`);

  // The header renders overs as floor(balls/6).(balls%6) — note this is the
  // workbook's "0.6" convention only until the over completes; the API's
  // overNumber is 1-indexed. Derive from the same totalBalls to compare like
  // with like.
  const perOver = 6;
  await expect(page.getByTestId("over-count"), "UI overs vs server")
    .toHaveText(`${Math.floor(st.totalBalls / perOver)}.${st.totalBalls % perOver} ov`);

  const striker = nameOf(m, s.currentStrikerPublicId);
  const nonStriker = nameOf(m, s.currentNonStrikerPublicId);
  if (striker) await expect(page.getByTestId("striker-name"), "UI striker vs server").toHaveText(striker);
  if (nonStriker) await expect(page.getByTestId("nonstriker-name"), "UI non-striker vs server").toHaveText(nonStriker);

  const bowler = nameOf(m, s.currentBowlerPublicId);
  if (bowler) await expect(page.getByTestId("bowler-name"), "UI bowler vs server").toHaveText(bowler);

  await expect(page.getByTestId("free-hit-indicator"), "UI free-hit vs server")
    .toHaveCount(s.isFreeHit ? 1 : 0);
}
