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

/**
 * Waits until the server reflects every cheap scalar the scenario pins, so the
 * detailed assertions below never read a pre-write state.
 *
 * It must cover strike as well as the score. A scenario like T20-080 asserts only
 * that strike rotated; with the predicate keyed on runs/balls alone there would be
 * nothing to wait for, and the assertion would race the in-flight POST.
 *
 * On timeout it returns the last read anyway and lets the individual assertions
 * report the real field-level mismatch, which is a far better message than a bare
 * poll timeout.
 */
async function settle(m: ScoringMatch, want: ExpectedState, timeoutMs = 5000) {
  const settled = (s: any) => {
    const st = s.inningsState;
    return (
      (want.runs === undefined || st.totalRuns === want.runs) &&
      (want.wickets === undefined || st.totalWickets === want.wickets) &&
      (want.balls === undefined || st.totalBalls === want.balls) &&
      (want.over === undefined || st.overNumber === want.over) &&
      (want.ballInOver === undefined || st.ballInOver === want.ballInOver) &&
      (want.freeHit === undefined || !!s.isFreeHit === want.freeHit) &&
      (want.striker === undefined || nameOf(m, s.currentStrikerPublicId) === want.striker) &&
      (want.nonStriker === undefined || nameOf(m, s.currentNonStrikerPublicId) === want.nonStriker)
    );
  };

  const deadline = Date.now() + timeoutMs;
  let last = await m.api.state(m.matchPublicId);
  while (!settled(last) && Date.now() < deadline) {
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

  if (page) await expectUiMatchesServer(page, m);
  return s;
}

/**
 * Compares what the browser is showing against the server, polling BOTH sides
 * together until they agree.
 *
 * Re-reading the server on every attempt is the point. A UI-driven delivery is an
 * async POST, and a scenario that pins only strike (T20-080/081) gives `settle()`
 * no runs/balls change to wait on — so a single up-front server read can be taken
 * before the write lands and then compared against an already-updated DOM,
 * producing a mismatch that is pure test timing. Polling both sides removes that
 * class of false failure while still failing on a real, persistent divergence,
 * which is a genuine bug: the backend is authoritative.
 */
export async function expectUiMatchesServer(page: Page, m: ScoringMatch) {
  const perOver = 6;
  const textOf = async (testId: string) => {
    const loc = page.getByTestId(testId);
    return (await loc.count()) ? ((await loc.first().textContent()) ?? "").trim() : null;
  };

  await expect
    .poll(
      async () => {
        const s = await m.api.state(m.matchPublicId);
        const st = s.inningsState;
        const server: Record<string, unknown> = {
          score: `${st.totalRuns}/${st.totalWickets}`,
          overs: `${Math.floor(st.totalBalls / perOver)}.${st.totalBalls % perOver} ov`,
          freeHit: !!s.isFreeHit,
        };
        const ui: Record<string, unknown> = {
          score: await textOf("team-score"),
          overs: await textOf("over-count"),
          freeHit: (await page.getByTestId("free-hit-indicator").count()) > 0,
        };
        for (const [key, id, pid] of [
          ["striker", "striker-name", s.currentStrikerPublicId],
          ["nonStriker", "nonstriker-name", s.currentNonStrikerPublicId],
          ["bowler", "bowler-name", s.currentBowlerPublicId],
        ] as const) {
          const name = nameOf(m, pid);
          if (!name) continue;   // nothing selected server-side; the UI shows a placeholder
          server[key] = name;
          ui[key] = await textOf(id);
        }

        const mismatches: Record<string, { ui: unknown; server: unknown }> = {};
        for (const k of Object.keys(server)) {
          if (ui[k] !== server[k]) mismatches[k] = { ui: ui[k], server: server[k] };
        }
        return mismatches;
      },
      { timeout: 10_000, message: "UI and server disagree (backend is authoritative)" },
    )
    .toEqual({});
}
