import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbCount, dbOne } from "../fixtures/db";
import { pdfText, flat, pdftotextAvailable } from "../fixtures/pdf";
import {
  createChampionship, purge, GROUP_A, GROUP_B, POINTS, TIE_BREAK_ORDER,
  type Championship, type Side,
} from "../fixtures/championship";
import {
  playFixture, playInnings, withCatch, nrrOf, pointsOf, inningsOf,
  createMatch, bug11,
  type Played, type FixtureScript,
} from "../fixtures/playFixture";

/**
 * Phases 31–34 — the closing end-to-end verification.
 *
 * Phase 34 names one flow, in order: create → add teams → select type → generate
 * fixtures → schedule → date/time/venue/officials → open match → existing scoring
 * module → score → complete → tournament result → points table → NRR → ranking →
 * statistics → Man of the Match → qualification → semi final → final → champion →
 * Man of the Series → complete tournament PDF. This spec walks exactly that,
 * once, against Phase 31's sample data, and then proves the same flow is
 * independent per academy and unreachable across academies.
 *
 * Three properties it holds itself to:
 *
 *  1. **Nothing is seeded.** Every row the assertions read was produced by the
 *     product's own endpoints — batch, players, tournament, sides, squads,
 *     qualification rules, grounds, officials, fixtures, matches, deliveries,
 *     results, awards. The database is used for reading facts back and, in
 *     teardown, for rows with no delete endpoint.
 *
 *  2. **Expected values are computed independently, not read from the endpoint
 *     under test.** Points and NRR are recomputed in `playFixture.ts` from the
 *     innings rows the scoring engine wrote, so the points table has something to
 *     disagree with. Ruling 3 (Super Over out of NRR) is asserted as a
 *     falsifiable pair: the endpoint must equal the excluding figure and must NOT
 *     equal the including one.
 *
 *  3. **The tenant matrix is generated, not typed.** Every tournament endpoint is
 *     called by academy B's ADMIN against academy A's tournament, and the table
 *     in the report is written out from what actually came back.
 *
 * Runs on desktop and iPhone 14. Each project builds its own championship, in
 * parallel, in the same database — which is also why teardown is keyed on the
 * tournament's public id and never on its name: Phase 31 fixes the name.
 */

test.describe.configure({ mode: "serial" });

const WORKER = process.env.TEST_WORKER_INDEX ?? "0";
const RUN = `${Date.now() % 1000000}${WORKER}`;

/** Academy A's full championship, and academy B's independent one. */
let A: Championship;
let B: Championship;

/** Group-stage results, in the order they were played. */
const played: Played[] = [];
/** Knockout results. */
const knockout: Played[] = [];

let groupFixtures: any[] = [];
let semiFixtures: any[] = [];
let finalFixture: any;
let bMatch: Played;

const startedAt = Date.now();

// ── Phase 31's scripted results ─────────────────────────────────────────────
//
// Keyed on the pairing rather than on fixture order, because the generator's
// round order is its own business and this spec must not encode a copy of it.
//
// Designed so that:
//   · Group A separates on POINTS at the top and on NRR in the middle —
//     Australia and England both finish on 3, and ruling 2's NRR term is what
//     decides which of them qualifies. A group decided purely on points would
//     never exercise the tie-break at all.
//   · Group B separates on points alone, so one group proves each path.
//   · One fixture is tied and decided on a Super Over, and one is abandoned.
//
// Every innings is six deliveries, so the NRR denominator is exactly 1.0 over
// and the arithmetic is checkable by hand.
const six = (n: number) => {
  // n runs off six legal deliveries — six is the most one delivery can carry off
  // the bat, so 36 is the ceiling. Exactly one over, which makes the NRR
  // denominator exactly 1.0 and the arithmetic checkable by hand.
  if (n > 36) throw new Error(`${n} runs cannot be made off six deliveries`);
  const out: number[] = [];
  let left = n;
  for (let i = 0; i < 6; i++) {
    const take = Math.min(6, left);
    out.push(take);
    left -= take;
  }
  return out;
};

// Every innings ends with a catch, so the bowling and fielding leaderboards and
// the wickets card have something in them. `withCatch` insists the delivery it
// converts is a dot, which is why every total below leaves a trailing zero.
const win = (home: number, away: number): FixtureScript =>
  ({ first: withCatch(six(home)), second: withCatch(six(away)), outcome: "WIN" });

const SCRIPTS: Record<string, FixtureScript> = {
  // ── Group A ───────────────────────────────────────────────────────────────
  "Australia|India": win(12, 30),          // India by 18
  "England|South Africa": win(24, 6),      // England by 18
  "England|India": win(10, 26),            // India by 16
  "Australia|South Africa": win(22, 8),    // Australia by 14
  "India|South Africa": {                  // tied, decided on the Super Over
    first: withCatch(six(18)), second: withCatch(six(18)), outcome: "SUPER_OVER",
    // The Super Over itself is wicketless: it is excluded from every statistic
    // by ruling 3, so a wicket in it would only make that harder to read.
    superOver: { first: six(12), second: six(2) },
  },
  "Australia|England": {                   // abandoned, no result
    first: [1, 2, 1], second: [], outcome: "ABANDONED",
  },
  // ── Group B ───────────────────────────────────────────────────────────────
  "New Zealand|Sri Lanka": win(28, 14),
  "Pakistan|West Indies": win(26, 12),
  "New Zealand|Pakistan": win(24, 20),
  "Sri Lanka|West Indies": win(22, 10),
  "New Zealand|West Indies": win(30, 8),
  "Pakistan|Sri Lanka": win(18, 16),
};

/** The scripted result for a pairing, whichever way round the generator drew it. */
function scriptFor(homeName: string, awayName: string): FixtureScript {
  const key = [homeName, awayName].sort().join("|");
  const s = SCRIPTS[key];
  if (!s) throw new Error(`no script for ${key}`);
  // The script's `first`/`second` are written home-then-away for the pairing in
  // ALPHABETICAL order. Flip them when the generator drew it the other way, so
  // the totals follow the team rather than the slot.
  const alphabeticalHomeIsHome = [homeName, awayName].sort()[0] === homeName;
  if (alphabeticalHomeIsHome) return s;
  return { ...s, first: s.second, second: s.first };
}

/** Expected points/NRR for one side, from the results this run actually produced. */
const expectedFor = (name: string, from: Played[]) => ({
  ...pointsOf(name, from, POINTS),
  nrr: nrrOf(name, from, { includeSuperOver: false }),
  nrrWithSuperOver: nrrOf(name, from, { includeSuperOver: true }),
});

// ═══════════════════════════════════════════════════════════════════════════
// Build
// ═══════════════════════════════════════════════════════════════════════════

test.beforeAll(async () => {
  test.setTimeout(600_000);
  // A and B built concurrently, which is the independence claim stated as a
  // race: 152 players, two batches, twelve sides and two tournaments created
  // through the same endpoints at the same time in two academies. If anything
  // tenant-scoped leaked, or BUG-33's player-id race came back, it surfaces here
  // rather than in an assertion written to look for it.
  [A, B] = await Promise.all([
    createChampionship({ tag: `A${RUN}` }),
    createChampionship({
      tenant: config().b, tag: `B${RUN}`,
      name: "RKMP T20 Championship",          // the same name, the other academy
      groups: [["India", "Australia"], ["England", "South Africa"]],
    }),
  ]);
});

test.afterAll(async () => {
  const runtimeMs = Date.now() - startedAt;
  const errors: string[] = [];
  for (const c of [A, B]) {
    if (!c) continue;
    try { await c.destroy(); } catch (e) { errors.push(String(e)); }
  }
  // Belt and braces: whatever the destroy() calls could not reach, by tag.
  try { await purge("", `A${RUN}`); await purge("", `B${RUN}`); } catch { /* best effort */ }

  const dir = path.resolve("e2e/report");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `tournament-e2e-runtime-${WORKER}.txt`),
    `worker=${WORKER} runtimeMs=${runtimeMs} runtime=${(runtimeMs / 1000).toFixed(1)}s `
    + `bug11Collisions=${bug11.collisions}\n`);

  // BUG-11 is fixed, so this run — two projects creating matches through the
  // real API at the same time, which is how the bug was reproduced in the first
  // place — must see none. It used to be two on the first such run.
  if (bug11.collisions > 0) {
    errors.push(`BUG-11 REGRESSION: ${bug11.collisions} public-id collision(s) `
      + `during this run; the generator is expected to be a random UUID`);
  }

  if (errors.length) throw new Error(`teardown: ${errors.join(" | ")}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 31/34 — the flow
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Phases 31–34 — RKMP T20 Championship, end to end", () => {

  test("the championship exists as Phase 31 describes it", async () => {
    const t = await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}`);
    expect(t.status).toBe(200);
    const body = t.body as any;

    expect(body.name).toBe("RKMP T20 Championship");
    expect(body.format, "Phase 31's format").toBe("GROUP_KNOCKOUT");
    expect(body.defaultOvers, "T20").toBe(20);
    expect(body.status, "a new tournament starts as a draft").toBe("DRAFT");
    // Ruling 11: derived from startDate, one year, so "2026" not "2026-27".
    expect(new Date(body.startDate).getUTCFullYear()).toBe(2026);

    // Ruling 1's scheme, stored per tournament.
    expect({
      win: body.winPoints, tie: body.tiePoints,
      noResult: body.noResultPoints, loss: body.lossPoints,
    }).toEqual(POINTS);

    // Eight sides, four to a group, eleven academy players each.
    const teams = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/teams`)).body as any[];
    expect(teams.length, "eight sides").toBe(8);
    expect(teams.filter((x) => x.groupName === "A").map((x) => x.name).sort())
      .toEqual([...GROUP_A].sort());
    expect(teams.filter((x) => x.groupName === "B").map((x) => x.name).sort())
      .toEqual([...GROUP_B].sort());

    const players = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/players`)).body as any[];
    expect(players.length, "8 × 11 registered players").toBe(88);

    // Ruling 2's tie-break order, as stored.
    const rules = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/qualification-rules`)).body as any;
    expect(rules.teamsAdvancingPerGroup).toBe(2);
    expect(rules.knockoutSeedingRule).toBe("CROSS_GROUP");
    expect(rules.tieBreakOrder).toEqual([...TIE_BREAK_ORDER]);
  });

  test("fixtures are previewed before they are saved, and the two agree", async () => {
    // Generation is destructive — it deletes every fixture and stage first — so
    // the preview is the only way to see what it will do.
    const preview = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/preview`,
      { teamsPerGroup: 4 });
    expect(preview.status, "preview").toBe(200);
    const p = preview.body as any;

    expect(p.teamCount).toBe(8);
    expect(p.matchCount, "two groups of four, six fixtures each").toBe(12);
    expect(p.byeCount, "eight teams need no bye").toBe(0);
    expect(p.existingFixtureCount, "nothing generated yet").toBe(0);
    expect(Object.keys(p.groupAssignments).length, "every side placed").toBe(8);
    // Two group stages plus the empty knockout stage the qualifiers draw into.
    expect(p.stages.map((s: any) => s.stageType))
      .toEqual(["GROUP", "GROUP", "KNOCKOUT"]);

    // Nothing was written by looking.
    expect(dbCount(`SELECT count(*) FROM fixtures WHERE tournament_id =
      (SELECT id FROM tournaments WHERE public_id = '${A.tournamentPublicId}')`),
      "preview writes no rows").toBe(0);

    const gen = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/generate`,
      { teamsPerGroup: 4 });
    expect(gen.status, "generate").toBe(200);
    groupFixtures = gen.body as any[];

    expect(groupFixtures.length, "generation matches its own preview").toBe(p.matchCount);

    // ── per group: six fixtures, three rounds, every pairing once ────────────
    for (const group of ["A", "B"]) {
      const mine = groupFixtures.filter((f) => f.stage.stageName === `Group ${group}`);
      expect(mine.length, `group ${group} has six fixtures`).toBe(6);
      expect([...new Set(mine.map((f) => f.roundNumber))].sort(),
        `group ${group} plays three rounds`).toEqual([1, 2, 3]);
      // Two matches per round, which is what a four-team round of a round robin is.
      for (const r of [1, 2, 3]) {
        expect(mine.filter((f) => f.roundNumber === r).length,
          `group ${group} round ${r}`).toBe(2);
      }

      const pairings = mine.map((f) => [f.homeTeam.name, f.awayTeam.name].sort().join(" v "));
      expect(new Set(pairings).size, `group ${group} has no duplicate pairing`)
        .toBe(pairings.length);

      // Every side plays the other three, and nobody plays across groups.
      const names = group === "A" ? GROUP_A : GROUP_B;
      for (const name of names) {
        expect(mine.filter((f) => f.homeTeam.name === name || f.awayTeam.name === name).length,
          `${name} plays three group matches`).toBe(3);
      }
      for (const f of mine) {
        expect(names, `${f.homeTeam.name} belongs to group ${group}`)
          .toContain(f.homeTeam.name);
        expect(names, `${f.awayTeam.name} belongs to group ${group}`)
          .toContain(f.awayTeam.name);
      }
    }

    // Nothing is scheduled yet: no scheduleStartDate was sent, so the scheduler
    // did not run. That is deliberate — the next test schedules by hand.
    expect(groupFixtures.every((f) => f.scheduledAt === null),
      "generation without a start date leaves every fixture unscheduled").toBe(true);
  });

  test("the first four fixtures take a date, time, ground and officials", async () => {
    const slots = [
      { at: "2026-03-05T09:30:00+05:30", venue: 0 },
      { at: "2026-03-05T14:00:00+05:30", venue: 1 },
      { at: "2026-03-06T09:30:00+05:30", venue: 0 },
      { at: "2026-03-06T14:00:00+05:30", venue: 1 },
    ];

    for (const [i, slot] of slots.entries()) {
      const f = groupFixtures[i];
      const r = await A.api.raw("patch",
        `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${f.publicId}`, {
          scheduledAt: slot.at,
          venueId: A.venues[slot.venue].id,
          matchNumber: i + 1,
          city: "Mysuru",
          umpire1Name: A.officials[0].name,
          umpire2Name: A.officials[1].name,
          refereeName: A.officials[2].name,
          notes: `Phase 31 slot ${i + 1}`,
        });
      expect(r.status, `schedule fixture ${i + 1}`).toBe(200);
      const dto = r.body as any;

      expect(new Date(dto.scheduledAt).toISOString(), `fixture ${i + 1} date and time`)
        .toBe(new Date(slot.at).toISOString());
      expect(dto.tournamentVenue?.name, `fixture ${i + 1} ground`)
        .toBe(A.venues[slot.venue].name);
      expect(dto.matchNumber).toBe(i + 1);
      expect(dto.city).toBe("Mysuru");
      expect(dto.umpire1Name).toBe(A.officials[0].name);
      expect(dto.umpire2Name).toBe(A.officials[1].name);
      expect(dto.refereeName).toBe(A.officials[2].name);
      // Ruling 6: no scorer role, so nothing appoints one.
      expect(dto.scorerName ?? null, "no scorer is appointed").toBeNull();
    }

    // Read them back, so this is persistence and not an echo of the request.
    const back = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
    const scheduled = back.filter((f) => f.scheduledAt !== null);
    expect(scheduled.length, "exactly four fixtures are scheduled").toBe(4);
    expect(scheduled.every((f) => f.tournamentVenue !== null),
      "each scheduled fixture has a real ground, not a free-text note").toBe(true);
    expect(new Set(scheduled.map((f) => f.matchNumber)).size,
      "match numbers are distinct").toBe(4);

    // No clash was created: the four are on two grounds at four different times.
    const conflicts = await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/conflicts`);
    expect(conflicts.status).toBe(200);
    expect(conflicts.body, "a well-spaced schedule has no conflicts").toEqual([]);

    groupFixtures = back;
  });

  test("a venue clash is refused with a message that names it, then resolved", async () => {
    // Move fixture 2 onto fixture 1's exact slot and ground.
    const first = groupFixtures.find((f) => f.matchNumber === 1)!;
    const second = groupFixtures.find((f) => f.matchNumber === 2)!;

    const clash = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${second.publicId}/reschedule`,
      {
        scheduledAt: first.scheduledAt,
        venueId: A.venues[0].id,
        reason: "Deliberate clash, Phase 9",
      });

    // Ruling 4: refused, not warned about.
    expect(clash.status, "a clashing move is refused").toBe(409);
    const message = String((clash.body as any)?.message ?? clash.body);
    expect(message, "the message names the ground").toContain(A.venues[0].name);
    expect(message.toLowerCase(), "the message says what the clash is")
      .toMatch(/ground|venue/);
    // An admin cannot act on "conflict detected", so the other fixture is named
    // and the time is given. It identifies the other fixture by its generated
    // label ("Group A · Round 1") rather than by the two sides.
    expect(message, "the message says the ground is already taken")
      .toContain("is already hosting");
    expect(message, "and names the fixture that has it")
      .toContain(first.label ?? "Group");
    // The structured form carries the instant, which is what the UI renders from.
    const dto = (clash.body as any);
    expect(String(dto?.message ?? message), "the 409 body is the message").toBeTruthy();
    // NOTE: the pre-rendered time inside `message` is formatted from the stored
    // OffsetDateTime after the driver has normalised it to UTC, so a slot booked
    // at 09:30+05:30 reads "04:00" in the sentence. Recorded as a finding in
    // FINAL-REPORT.md; asserted here only as "a time is present", because a test
    // that asserted 04:00 would be blessing it.
    expect(message, "a time is given").toMatch(/\d{1,2}:\d{2}/);

    // Nothing moved.
    const afterRefusal = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
    const stillThere = afterRefusal.find((f) => f.publicId === second.publicId)!;
    expect(new Date(stillThere.scheduledAt).toISOString(),
      "a refused reschedule does not move the fixture")
      .toBe(new Date(second.scheduledAt).toISOString());
    expect(stillThere.rescheduleCount, "and does not count as a reschedule").toBe(0);

    // An ADMIN may not override it either (ruling 4: SUPER_ADMIN only).
    const asAdmin = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${second.publicId}/reschedule`,
      {
        scheduledAt: first.scheduledAt, venueId: A.venues[0].id,
        reason: "Deliberate clash", overrideConflicts: true,
        overrideReason: "An ADMIN should not be able to do this",
      });
    expect(asAdmin.status, "an ADMIN cannot schedule over a clash").toBe(403);

    // ── resolve it: the other ground, same time ─────────────────────────────
    const resolved = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${second.publicId}/reschedule`,
      {
        scheduledAt: first.scheduledAt,
        venueId: A.venues[1].id,
        reason: "Moved to Ground 2 to clear the clash",
      });
    expect(resolved.status, "the same time on a different ground is accepted").toBe(200);
    expect((resolved.body as any).tournamentVenue.name).toBe(A.venues[1].name);

    const conflicts = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/conflicts`)).body as any[];
    expect(conflicts, "the schedule is clean again").toEqual([]);

    groupFixtures = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
  });

  test("a postponed fixture keeps its original slot, in the row and in the audit", async () => {
    const target = groupFixtures.find((f) => f.matchNumber === 3)!;
    const original = target.scheduledAt as string;
    expect(original, "the fixture has a slot to lose").toBeTruthy();

    const reason = "Ground waterlogged — postponed";
    const post = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${target.publicId}/reschedule`,
      { postpone: true, reason });
    expect(post.status, "postpone").toBe(200);
    const postponed = post.body as any;
    expect(postponed.status).toBe("POSTPONED");
    expect(postponed.scheduledAt, "a postponed fixture has no slot").toBeNull();
    expect(new Date(postponed.originalScheduledAt).toISOString(),
      "the original slot is preserved on the row").toBe(new Date(original).toISOString());
    expect(postponed.rescheduleReason).toBe(reason);
    expect(postponed.rescheduleCount).toBe(1);

    // ── put it back on a later day ──────────────────────────────────────────
    const newSlot = "2026-03-08T09:30:00+05:30";
    const re = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${target.publicId}/reschedule`,
      { scheduledAt: newSlot, venueId: A.venues[0].id, reason: "Rearranged for 8 March" });
    expect(re.status, "reschedule").toBe(200);
    const moved = re.body as any;
    expect(moved.status).toBe("SCHEDULED");
    expect(new Date(moved.scheduledAt).toISOString()).toBe(new Date(newSlot).toISOString());
    expect(moved.rescheduleCount, "two moves counted").toBe(2);
    // The whole point: the SECOND move must not claim the first move's time was
    // the original. It is set once and never overwritten.
    expect(new Date(moved.originalScheduledAt).toISOString(),
      "the original slot survives the second move")
      .toBe(new Date(original).toISOString());

    // ── and the full chain is in the audit log ───────────────────────────────
    const rows = dbOne(
      `SELECT coalesce(string_agg(action || ' :: ' || details::text, E'\\n'
                ORDER BY created_at), '')
       FROM audit_logs
       WHERE entity_public_id = '${A.tournamentPublicId}'
         AND action IN ('FIXTURE_POSTPONED', 'FIXTURE_RESCHEDULED')`);
    const lines = rows.split("\n").filter(Boolean);
    expect(lines.length, "one audit row per move, postpone and both reschedules")
      .toBeGreaterThanOrEqual(3);

    const postponeRow = lines.find((l) => l.startsWith("FIXTURE_POSTPONED"));
    expect(postponeRow, "the postponement is audited").toBeTruthy();
    expect(postponeRow!, "with its reason").toContain(reason);
    expect(postponeRow!, "and the slot it came from")
      .toContain(original.slice(0, 10));

    const lastMove = lines.filter((l) => l.startsWith("FIXTURE_RESCHEDULED")).at(-1)!;
    expect(lastMove, "the reschedule records where it started")
      .toContain(original.slice(0, 10));
    expect(lastMove, "and where it went").toContain("2026-03-08");

    groupFixtures = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
  });

  test("OPEN MATCH lands on the existing scorer, for the existing match id", async ({ page }) => {
    // Phase 10. The fixture is played first — through the same helper every other
    // fixture uses, which is the app's own prepare-match → create → setTeams →
    // toss → link-match → start sequence — and then the Fixtures tab is asked to
    // reopen it. The assertion is that it navigates to the match that already
    // exists, and does not offer to create a second one.
    // A plainly-won fixture: this one is finished by hand below, and the tie and
    // the abandonment have their own paths through `playFixture`.
    const f = groupFixtures
      .filter((x) => x.stage.stageType === "GROUP")
      .find((x) => scriptFor(x.homeTeam.name, x.awayTeam.name).outcome === "WIN")!;
    const home = A.sideByName.get(f.homeTeam.name)!;
    const away = A.sideByName.get(f.awayTeam.name)!;

    const result = await playOne(f, home, away, { stopBeforeResult: true });
    const matchId = result.matchPublicId;

    // link-match moved the fixture to IN_PROGRESS, which is what makes the tab
    // offer the scorer rather than "Start Match".
    const live = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
    const mine = live.find((x) => x.publicId === f.publicId)!;
    expect(mine.status, "a linked, started fixture is IN_PROGRESS").toBe("IN_PROGRESS");
    expect(mine.match?.publicId, "and points at the match that exists").toBe(matchId);

    await openTournament(page);
    await page.getByTestId("tournament-tab-fixtures").click();
    await expect(page.getByTestId("tournament-panel-fixtures")).toBeVisible();

    // There must be no "Start Match" on a fixture that already has one — that
    // button would create a SECOND match and rebind fixtures.match_id to it.
    await expect(
      page.getByTestId(`fixture-start-match-${f.publicId}`),
      "a fixture with a live match is not offered a second one",
    ).toHaveCount(0);

    const before = dbCount(
      `SELECT count(*) FROM cricket_matches WHERE fixture_id =
        (SELECT id FROM fixtures WHERE public_id = '${f.publicId}')`);
    expect(before, "exactly one match for this fixture").toBe(1);

    await page.getByTestId(`fixture-live-scorer-${f.publicId}`).click();

    // The existing scorer, at the existing match id — not /matches/new.
    await expect(page, "lands on the live scorer for the existing match")
      .toHaveURL(new RegExp(`/admin/cricket/matches/${matchId}/score$`));
    await expect(
      page.getByText(new RegExp(`${home.name}|${away.name}`)).first(),
      "and the scorer has really loaded this match",
    ).toBeVisible();

    expect(
      dbCount(`SELECT count(*) FROM cricket_matches WHERE fixture_id =
        (SELECT id FROM fixtures WHERE public_id = '${f.publicId}')`),
      "opening the scorer creates nothing",
    ).toBe(before);

    // Finish the match now that the UI has been through it, so the group stage
    // below sees a completed fixture like any other.
    await finishOne(result);
  });

  test("every group fixture is scored, and the table follows each one", async () => {
    test.setTimeout(900_000);

    const remaining = groupFixtures
      .filter((f) => f.stage.stageType === "GROUP")
      .filter((f) => !played.some((p) => p.fixturePublicId === f.publicId));

    for (const f of remaining) {
      const home = A.sideByName.get(f.homeTeam.name)!;
      const away = A.sideByName.get(f.awayTeam.name)!;
      const p = await playOne(f, home, away);

      // ── the fixture is completed exactly once ─────────────────────────────
      expect(dbCount(`SELECT count(*) FROM cricket_matches WHERE fixture_id =
        (SELECT id FROM fixtures WHERE public_id = '${f.publicId}')`),
        `${home.name} v ${away.name}: one match per fixture`).toBe(1);

      await assertStandings(`after ${home.name} v ${away.name}`);
    }

    expect(played.length, "twelve group fixtures played").toBe(12);
    expect(played.filter((p) => p.resultType === "SUPER_OVER").length,
      "one tie decided on a Super Over").toBe(1);
    expect(played.filter((p) => p.resultType === "ABANDONED").length,
      "one abandoned, no result").toBe(1);

    // ── ruling 3, stated so that it can fail ────────────────────────────────
    //
    // India played the Super Over. Its NRR from the main innings alone and its
    // NRR with the Super Over counted are different numbers, and the endpoint
    // must return the first and not the second. Without the inequality check the
    // assertion would pass even if the Super Over contributed nothing.
    const so = played.find((p) => p.resultType === "SUPER_OVER")!;
    const name = so.winner!.name;
    const excluding = nrrOf(name, played, { includeSuperOver: false });
    const including = nrrOf(name, played, { includeSuperOver: true });
    expect(including, `${name}'s NRR would change if the Super Over counted`)
      .not.toBeCloseTo(excluding, 3);

    const rows = await standings();
    const row = rows.find((r: any) => r.teamName === name)!;
    expect(row.nrr, `${name}'s NRR excludes the Super Over`).toBeCloseTo(excluding, 3);
    expect(row.nrr, `${name}'s NRR is not the including figure`)
      .not.toBeCloseTo(including, 3);

    // ── a result recorded twice changes nothing ─────────────────────────────
    const before = await standings();
    const again = await A.api.raw("post",
      `/api/admin/cricket/matches/${played[0].matchPublicId}/result`, {
        resultType: played[0].resultType,
        winnerTeamPublicId: (await A.api.getTeams(played[0].matchPublicId) as any[])
          .find((t) => t.name === played[0].winner?.name)?.publicId,
        resultMargin: Math.abs(played[0].homeRuns - played[0].awayRuns),
        resultDescription: "Re-posted, deliberately",
      });
    expect(again.status, "re-recording a result is accepted").toBe(200);
    const after = await standings();
    expect(after.map((r: any) => [r.teamName, r.played, r.points, r.nrr]),
      "re-recording a result does not double-count it")
      .toEqual(before.map((r: any) => [r.teamName, r.played, r.points, r.nrr]));
  });

  test("Man of the Match is given on two fixtures, from real candidates", async () => {
    const targets = played.filter((p) => p.resultType === "WIN").slice(0, 2);
    expect(targets.length, "two completed wins to award").toBe(2);

    for (const p of targets) {
      const cands = await A.api.raw("get",
        `/api/admin/cricket/tournaments/${A.tournamentPublicId}/matches/${p.matchPublicId}/award-candidates`);
      expect(cands.status, "candidate statistics for this match").toBe(200);
      const list = cands.body as any[];

      // Real candidates: the two XIs of THIS match, with this match's figures.
      expect(list.length, "candidates are offered").toBeGreaterThan(0);
      const squadIds = new Set([...p.home.squad, ...p.away.squad].map((x) => x.publicId));
      for (const c of list) {
        expect(squadIds, `${c.playerName} played in this match`).toContain(c.playerPublicId);
      }

      // The best performer by runs, chosen from the candidate list rather than
      // named by the test — that is what "from real candidates" means.
      const best = [...list].sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))[0];
      const side = p.home.squad.some((x) => x.publicId === best.playerPublicId)
        ? p.home : p.away;

      const give = await A.api.raw("post",
        `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards`, {
          awardType: "MAN_OF_THE_MATCH",
          playerPublicId: best.playerPublicId,
          teamPublicId: side.publicId,
          matchPublicId: p.matchPublicId,
          reason: `Top scorer with ${best.runs} runs`,
        });
      expect(give.status, `award MoM for ${p.home.name} v ${p.away.name}`).toBe(200);
      const award = give.body as any;
      // BUG-37: the award comes back with its own publicId, not a null from an
      // un-flushed save.
      expect(award.publicId, "the award has a public id").toBeTruthy();
      expect(award.playerPublicId).toBe(best.playerPublicId);
      expect(award.reason).toContain(String(best.runs));
      expect(award.awardedByName, "who gave it is recorded").toBeTruthy();
      expect(award.awardedAt, "and when").toBeTruthy();
    }

    const awards = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards`)).body as any[];
    expect(awards.filter((a) => a.awardType === "MAN_OF_THE_MATCH").length,
      "two Man of the Match awards stand").toBe(2);

    expect(dbCount(`SELECT count(*) FROM audit_logs
      WHERE action = 'TOURNAMENT_AWARD_GIVEN'
        AND entity_public_id IN (SELECT public_id FROM tournament_awards
          WHERE tournament_id = (SELECT id FROM tournaments
            WHERE public_id = '${A.tournamentPublicId}'))`),
      "each award is audited").toBe(2);
  });

  test("the knockout bracket follows the stored rule and ruling 2's ranking", async () => {
    // What the rules say should happen, computed here from this run's results.
    const rank = (names: readonly string[]) =>
      [...names].sort((x, y) => {
        const a = expectedFor(x, played), b = expectedFor(y, played);
        if (b.points !== a.points) return b.points - a.points;   // POINTS
        if (Math.abs(b.nrr - a.nrr) > 1e-9) return b.nrr - a.nrr; // NRR
        return b.wins - a.wins;                                   // WINS
      });

    const rankedA = rank(GROUP_A);
    const rankedB = rank(GROUP_B);

    // The middle of group A is separated by NRR, not by points — which is the
    // reason the scripts were written the way they were. Assert that the
    // tie-break was actually exercised, or this test silently stops testing it.
    const a2 = expectedFor(rankedA[1], played);
    const a3 = expectedFor(rankedA[2], played);
    expect(a2.points, "group A's 2nd and 3rd are level on points, so NRR decides")
      .toBe(a3.points);
    expect(a2.nrr, "and NRR separates them").toBeGreaterThan(a3.nrr);

    const qualA = rankedA.slice(0, 2);
    const qualB = rankedB.slice(0, 2);

    // CROSS_GROUP: adjacent groups cross, A1 v B2 and A2 v B1.
    const expectedTies = [
      [qualA[0], qualB[1]].sort().join(" v "),
      [qualA[1], qualB[0]].sort().join(" v "),
    ].sort();

    const adv = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/advance-knockout`, {});
    expect(adv.status, "advance to the knockout").toBe(200);
    semiFixtures = adv.body as any[];

    expect(semiFixtures.length, "top two from each of two groups is two semi-finals")
      .toBe(2);
    expect(semiFixtures.map((f) => [f.homeTeam.name, f.awayTeam.name].sort().join(" v ")).sort(),
      "the bracket is the cross-group draw over the ruling-2 ranking")
      .toEqual(expectedTies);

    for (const f of semiFixtures) {
      expect(f.stage.stageType, "the semis are in the knockout stage").toBe("KNOCKOUT");
      expect(f.roundNumber, "simultaneous ties share a round number").toBe(1);
      expect(f.status).toBe("SCHEDULED");
    }

    // And the eliminated sides are not in it.
    const advancing = new Set([...qualA, ...qualB]);
    for (const f of semiFixtures) {
      expect(advancing, `${f.homeTeam.name} qualified`).toContain(f.homeTeam.name);
      expect(advancing, `${f.awayTeam.name} qualified`).toContain(f.awayTeam.name);
    }
  });

  test("the semis and the final are played, and the champion is derived", async () => {
    test.setTimeout(600_000);

    // ── the semis: the better-placed side wins each ─────────────────────────
    for (const [i, f] of semiFixtures.entries()) {
      const home = A.sideByName.get(f.homeTeam.name)!;
      const away = A.sideByName.get(f.awayTeam.name)!;
      // Home wins the first semi, away the second, so the final is not decided
      // by which slot a side happened to take.
      const script = i === 0 ? win(30, 12) : win(14, 28);
      const p = await playFixture(A.api, A.tournamentPublicId, f, home, away, script,
        "2026-03-28");
      knockout.push(p);
      expect(p.winner, "a semi-final has a winner").not.toBeNull();
    }

    const finalists = knockout.map((p) => p.winner!);
    expect(finalists.length).toBe(2);

    // The tournament is still LIVE with no champion: nothing has been marked the
    // final yet, and Slice 3 only decides a champion from the final's result.
    const mid = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/result`)).body as any;
    expect(mid.championTeamName ?? null, "no champion before the final").toBeNull();

    // ── the final, added to the knockout stage and flagged as the final ─────
    //
    // There is no "advance to the next knockout round" endpoint —
    // advance-knockout always re-seeds round one from the groups — so the final
    // is added the way the Fixtures tab adds it, as a manual fixture. This is
    // recorded as a gap in the final report rather than worked around silently.
    const stages = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/stages`)).body as any[];
    const knockoutStage = stages.find((s) => s.stageType === "KNOCKOUT")!;

    const add = await A.api.raw("post",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/manual`, {
        stagePublicId: knockoutStage.publicId,
        homeTeamPublicId: finalists[0].publicId,
        awayTeamPublicId: finalists[1].publicId,
        venue: A.venues[0].name,
        scheduledAt: "2026-04-02T14:00:00+05:30",
      });
    expect(add.status, "add the final").toBe(200);
    finalFixture = add.body as any;

    const mark = await A.api.raw("patch",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${finalFixture.publicId}/final`,
      { isFinal: true });
    expect(mark.status, "mark it the final").toBeLessThan(400);

    // Marked BEFORE the result: the champion is decided in onFixtureCompleted,
    // which runs when the result is recorded and does not re-read the flag later.
    const p = await playFixture(A.api, A.tournamentPublicId, finalFixture,
      finalists[0], finalists[1], win(30, 17), "2026-04-02");
    knockout.push(p);

    // ── champion and runner-up, derived by the backend ──────────────────────
    const result = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/result`)).body as any;
    expect(result.championTeamName, "the champion is the final's winner")
      .toBe(p.winner!.name);
    expect(result.runnerUpTeamName, "and the runner-up is the side it beat")
      .toBe(p.loser!.name);
    expect(result.finalTied).toBe(false);
    expect(result.status, "completing the final closes the tournament").toBe("COMPLETED");

    // Nobody declared it — no declare-winner call was made anywhere above.
    const stored = dbOne(
      `SELECT coalesce(champ.name, '') || '|' || coalesce(run.name, '') || '|' || t.status
       FROM tournaments t
       LEFT JOIN tournament_teams champ ON t.champion_team_id = champ.id
       LEFT JOIN tournament_teams run   ON t.runner_up_team_id = run.id
       WHERE t.public_id = '${A.tournamentPublicId}'`);
    expect(stored, "the stored columns agree with the endpoint")
      .toBe(`${p.winner!.name}|${p.loser!.name}|COMPLETED`);

    // ── the audit trail says it was automatic ───────────────────────────────
    const completed = dbOne(
      `SELECT coalesce(string_agg(details::text, E'\\n' ORDER BY created_at), '')
       FROM audit_logs
       WHERE entity_public_id = '${A.tournamentPublicId}'
         AND action = 'TOURNAMENT_COMPLETED'`);
    expect(completed, "a TOURNAMENT_COMPLETED audit row exists").toBeTruthy();
    // jsonb::text puts a space after the colon, so this is matched as a pattern
    // rather than as a substring.
    expect(completed, "recorded as automatic").toMatch(/"automatic":\s*true/);
    expect(completed, "naming the champion").toContain(p.winner!.publicId);
    expect(completed, "and the deciding fixture").toContain(finalFixture.publicId);

    expect(dbCount(`SELECT count(*) FROM audit_logs
      WHERE entity_public_id = '${A.tournamentPublicId}'
        AND action = 'TOURNAMENT_RESULT_OVERRIDDEN'`),
      "nothing was declared by hand").toBe(0);
    expect(dbCount(`SELECT count(*) FROM audit_logs
      WHERE entity_public_id = '${A.tournamentPublicId}'
        AND action = 'TOURNAMENT_STATUS_CHANGED'`),
      "the LIVE transition was audited too").toBeGreaterThanOrEqual(1);
  });

  test("Man of the Series and a second award are given from tournament candidates", async () => {
    const all = [...played, ...knockout];

    const slots = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards/slots`)).body as any[];
    const types = slots.map((s) => s.awardType);
    expect(types, "Man of the Series is offered").toContain("MAN_OF_THE_SERIES");
    expect(types, "and the per-match award is not a tournament slot")
      .not.toContain("MAN_OF_THE_MATCH");

    const cands = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards/candidates`)).body as any[];
    expect(cands.length, "tournament-wide candidates").toBeGreaterThan(0);

    // Everyone offered must have played for one of the eight sides.
    const registered = new Map<string, Side>();
    for (const s of A.sides) for (const p of s.squad) registered.set(p.publicId, s);
    for (const c of cands) {
      expect(registered.has(c.playerPublicId),
        `${c.playerName} is a registered player`).toBe(true);
    }

    const give = async (awardType: string, c: any, reason: string) => {
      const r = await A.api.raw("post",
        `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards`, {
          awardType, playerPublicId: c.playerPublicId,
          teamPublicId: registered.get(c.playerPublicId)!.publicId,
          reason,
        });
      expect(r.status, `award ${awardType} to ${c.playerName}`).toBe(200);
      return r.body as any;
    };

    const mvp = [...cands].sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))[0];
    const mos = await give("MAN_OF_THE_SERIES", mvp,
      `${mvp.runs} runs across the championship`);
    expect(mos.playerPublicId).toBe(mvp.playerPublicId);
    expect(mos.matchPublicId ?? null,
      "a tournament award names no match — the DB check enforces it").toBeNull();

    // A second, different award, from the bowling side of the same candidate list.
    const bowler = [...cands].sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0))[0];
    const best = await give("BEST_BOWLER", bowler, `${bowler.wickets} wickets`);
    expect(best.awardType).toBe("BEST_BOWLER");

    const awards = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards`)).body as any[];
    expect(awards.length, "two MoM plus two tournament awards").toBe(4);
    expect(awards.map((a) => a.awardType).sort())
      .toEqual(["BEST_BOWLER", "MAN_OF_THE_MATCH", "MAN_OF_THE_MATCH", "MAN_OF_THE_SERIES"]);

    // Awarded-by, reason and timestamp persisted on every one.
    for (const a of awards) {
      expect(a.reason, `${a.awardType} has a reason`).toBeTruthy();
      expect(a.awardedAt, `${a.awardType} has a timestamp`).toBeTruthy();
      expect(a.playerName, `${a.awardType} names its player`).toBeTruthy();
    }

    expect(all.length, "fifteen fixtures played in all").toBe(15);
  });

  test("every tab renders, and the twelve cards match what the API computes", async ({ page }) => {
    // ── the twelve card values, derived from OTHER endpoints ────────────────
    const dash = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/dashboard`)).body as any;

    const teams = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/teams`)).body as any[];
    const fixtures = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
    // The three leaderboards are paged (PageDto), so the rows are in `content`.
    const batting = ((await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/stats/batting?size=100`))
      .body as any).content as any[];
    const bowling = ((await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/stats/bowling?size=100`))
      .body as any).content as any[];
    expect(batting.length, "the batting board is not empty").toBeGreaterThan(0);
    expect(bowling.length, "the bowling board is not empty").toBeGreaterThan(0);
    const table = await standings();

    // Counts, from the fixtures list rather than from the dashboard itself.
    expect(dash.teams, "card: Teams").toBe(teams.length);
    expect(dash.matches, "card: Matches").toBe(fixtures.length);
    expect(dash.completed, "card: Completed")
      .toBe(fixtures.filter((f) => f.status === "COMPLETED").length);
    expect(dash.upcoming, "card: Upcoming")
      .toBe(fixtures.filter((f) => f.status === "SCHEDULED").length);
    expect(dash.live, "card: Live")
      .toBe(fixtures.filter((f) => f.status === "IN_PROGRESS" || f.status === "LIVE").length);

    // Aggregates, from the innings rows of every completed fixture, Super Over
    // excluded — the same rule the statistics snapshot applies.
    const completedMatches = fixtures
      .filter((f) => f.status === "COMPLETED" && f.match)
      .map((f) => f.match.publicId as string);
    let runs = 0, wickets = 0;
    for (const m of completedMatches) {
      runs += dbCount(`SELECT coalesce(sum(i.total_runs), 0) FROM innings i
        JOIN cricket_matches cm ON i.match_id = cm.id
        WHERE cm.public_id = '${m}' AND NOT i.is_super_over`);
      wickets += dbCount(`SELECT coalesce(sum(i.total_wickets), 0) FROM innings i
        JOIN cricket_matches cm ON i.match_id = cm.id
        WHERE cm.public_id = '${m}' AND NOT i.is_super_over`);
    }
    expect(dash.totalRuns, "card: Runs").toBe(runs);
    expect(dash.totalWickets, "card: Wickets").toBe(wickets);

    // Headlines, each against the leaderboard that owns it.
    expect(dash.currentLeader.name, "card: Current Leader").toBe(table[0].teamName);
    expect(dash.currentLeader.value).toBe(`${table[0].points} pts`);
    expect(dash.topRunScorer.name, "card: Top Run Scorer").toBe(batting[0].playerName);
    expect(dash.topRunScorer.value).toBe(`${batting[0].runs} runs`);
    expect(dash.topWicketTaker.name, "card: Top Wicket Taker").toBe(bowling[0].playerName);
    expect(dash.topWicketTaker.value).toBe(`${bowling[0].wickets} wickets`);

    const bestInnings = [...batting].sort((a, b) => b.highScore - a.highScore)[0];
    expect(dash.highestIndividualScore.name, "card: Highest Individual Score")
      .toBe(bestInnings.playerName);

    const biggest = Math.max(...completedMatches.flatMap((m) =>
      inningsOf(m).filter((i) => !i.isSuperOver).map((i) => i.totalRuns)));
    expect(dash.highestTeamScore.value, "card: Highest Team Score")
      .toMatch(new RegExp(`^${biggest}/`));

    // ── the same twelve, as the Overview tab renders them ───────────────────
    await openTournament(page);
    const cards = page.getByTestId("tournament-dashboard");
    await expect(cards).toBeVisible();

    for (const [label, value] of [
      ["teams", dash.teams], ["matches", dash.matches], ["completed", dash.completed],
      ["upcoming", dash.upcoming], ["live", dash.live],
      ["runs", dash.totalRuns], ["wickets", dash.totalWickets],
    ] as const) {
      await expect(page.getByTestId(`dashboard-count-${label}`), `card ${label}`)
        .toContainText(String(value));
    }
    for (const [testId, h] of [
      ["dashboard-current-leader", dash.currentLeader],
      ["dashboard-highest-team-score", dash.highestTeamScore],
      ["dashboard-highest-individual-score", dash.highestIndividualScore],
      ["dashboard-top-run-scorer", dash.topRunScorer],
      ["dashboard-top-wicket-taker", dash.topWicketTaker],
    ] as const) {
      const card = page.getByTestId(testId);
      await expect(card, `${testId} names its holder`).toContainText(h.name);
      await expect(card, `${testId} shows its value`).toContainText(h.value);
    }

    // ── and every tab renders real, post-tournament content ─────────────────
    const result = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/result`)).body as any;

    const checks: [string, string[]][] = [
      // The Overview tab prints the format with its underscores replaced
      // (OverviewTab.tsx:43), so this is the rendered form, not the stored one.
      ["overview", ["Format", "GROUP KNOCKOUT", "Total Players", "88"]],
      ["teams", [GROUP_A[0], GROUP_B[0]]],
      ["players", [A.sides[0].squad[0].displayName.slice(0, 12)]],
      ["venues", [A.venues[0].name]],
      ["officials", [A.officials[0].name]],
      ["fixtures", ["Round 1"]],
      // P / W / L / T / Pts. The API row carries `nrr` and `noResult` and the
      // table renders NEITHER (StandingsTab.tsx has no such column), so an
      // abandoned match shows as P=3 W=1 L=1 T=0 and does not add up, and
      // Phase 12's NRR is invisible on the screen Phase 11 names. Reported in
      // FINAL-REPORT.md; asserted here as what the column set actually is.
      ["points-table", [result.championTeamName, "Pts", "Group A", "Group B"]],
      ["statistics", [batting[0].playerName]],
      ["awards", ["Man of the Series"]],
      ["reports", ["Complete Tournament Report"]],
      ["settings", ["Overs per Innings"]],
    ];
    for (const [key, needles] of checks) {
      await page.getByTestId(`tournament-tab-${key}`).click();
      const panel = page.getByTestId(`tournament-panel-${key}`);
      await expect(panel, `${key} panel`).toBeVisible();
      for (const needle of needles) {
        await expect(panel, `${key} shows "${needle}"`).toContainText(needle);
      }
    }

    // The champion banner, which is the header's own assertion of Phase 23.
    await expect(page.getByTestId("tournament-champion"))
      .toContainText(result.championTeamName);
  });

  test("the complete tournament PDF says who won, who played and who was capped", async () => {
    test.skip(!pdftotextAvailable(),
      "pdftotext (poppler) is not installed, so the PDF cannot be asserted by text");

    const res = await A.api.ctx.get(
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/reports/complete`);
    expect(res.status(), "complete report").toBe(200);
    const bytes = await res.body();
    expect(Buffer.from(bytes).subarray(0, 4).toString(), "%PDF magic").toBe("%PDF");
    expect(bytes.length, "a real document, not a stub").toBeGreaterThan(2048);

    const text = flat(pdfText(bytes));
    const result = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/result`)).body as any;
    const awards = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/awards`)).body as any[];

    expect(text, "names the tournament").toContain("RKMP T20 Championship");
    expect(text, "names the champion")
      .toContain(`CHAMPION: ${result.championTeamName}`);
    expect(text, "and the runner-up")
      .toContain(`Runner-up: ${result.runnerUpTeamName}`);

    // The final's own result line, both sides named.
    const decider = knockout.at(-1)!;
    expect(text, "carries the final's result").toContain(decider.winner!.name);
    expect(text, "and who it beat").toContain(decider.loser!.name);

    // Every one of the eight teams appears — the standings section is the whole
    // field, not just the qualifiers.
    for (const name of [...GROUP_A, ...GROUP_B]) {
      expect(text, `${name} appears in the report`).toContain(name);
    }

    // The two tournament awards, by name and by holder.
    const mos = awards.find((a) => a.awardType === "MAN_OF_THE_SERIES")!;
    const bb = awards.find((a) => a.awardType === "BEST_BOWLER")!;
    expect(text, "Man of the Series is printed").toContain("Man of the Series");
    expect(text, "with its holder").toContain(mos.playerName);
    expect(text, "Best Bowler is printed").toContain("Best Bowler");
    expect(text, "with its holder").toContain(bb.playerName);
  });

  test("the fixtures export respects a team filter", async () => {
    test.skip(!pdftotextAvailable(), "pdftotext (poppler) is not installed");

    const side = A.sideByName.get(GROUP_A[0])!;     // India
    const all = (await A.api.raw("get",
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures`)).body as any[];
    const theirs = all.filter((f) =>
      f.homeTeam?.name === side.name || f.awayTeam?.name === side.name);
    const others = [...GROUP_A, ...GROUP_B].filter((n) => n !== side.name);
    // Sides this team never met, so their absence from the filtered export is a
    // real statement rather than an accident of who happened to be on the page.
    const neverMet = others.filter((n) =>
      !theirs.some((f) => f.homeTeam?.name === n || f.awayTeam?.name === n));
    expect(neverMet.length, "there are sides India never played").toBeGreaterThan(0);

    const res = await A.api.ctx.get(
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/reports/fixtures`
      + `?teamPublicId=${side.publicId}`);
    expect(res.status(), "filtered fixtures export").toBe(200);
    const text = flat(pdfText(await res.body()));

    expect(text, "the filtered side is in it").toContain(side.name);
    for (const name of neverMet) {
      expect(text, `${name} never played India, so it is not in the export`)
        .not.toContain(name);
    }

    // And the unfiltered export does carry them, so the filter is what removed
    // them and not a report that simply prints nothing.
    const unfiltered = flat(pdfText(await (await A.api.ctx.get(
      `/api/admin/cricket/tournaments/${A.tournamentPublicId}/reports/fixtures`)).body()));
    for (const name of neverMet) {
      expect(unfiltered, `${name} is in the unfiltered export`).toContain(name);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tenant proof
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Phase 31 — two academies, independently", () => {

  test("academy B's championship is built and scored without touching A's", async () => {
    // B's tournament was created concurrently with A's, under the SAME name, from
    // B's own players. Nothing about A is visible in it.
    const bTeams = (await B.api.raw("get",
      `/api/admin/cricket/tournaments/${B.tournamentPublicId}/teams`)).body as any[];
    expect(bTeams.length, "B entered four sides").toBe(4);

    const gen = await B.api.raw("post",
      `/api/admin/cricket/tournaments/${B.tournamentPublicId}/fixtures/generate`,
      { teamsPerGroup: 2 });
    expect(gen.status).toBe(200);
    const bFixtures = gen.body as any[];
    expect(bFixtures.length, "two groups of two is one fixture each").toBe(2);

    const f = bFixtures[0];
    bMatch = await playFixture(B.api, B.tournamentPublicId, f,
      B.sideByName.get(f.homeTeam.name)!, B.sideByName.get(f.awayTeam.name)!,
      win(20, 10), "2026-03-15");

    // ── B's table is B's ────────────────────────────────────────────────────
    const bTable = (await B.api.raw("get",
      `/api/admin/cricket/tournaments/${B.tournamentPublicId}/standings`)).body as any[];
    expect(bTable.length, "four rows, B's four sides").toBe(4);
    expect(bTable.filter((r: any) => r.played > 0).length,
      "only the two that played").toBe(2);
    expect(bTable.find((r: any) => r.teamName === bMatch.winner!.name).points)
      .toBe(POINTS.win);

    // ── A's is unchanged, and its rows are still A's ────────────────────────
    const aTable = await standings();
    expect(aTable.length, "A still has eight rows").toBe(8);
    const aTeamIds = new Set(A.sides.map((s) => s.publicId));
    for (const r of aTable) {
      expect(aTeamIds, `${r.teamName} in A's table is one of A's sides`)
        .toContain(r.teamPublicId);
    }

    // ── and the two tournaments are genuinely different rows ────────────────
    expect(A.tournamentPublicId).not.toBe(B.tournamentPublicId);
    expect(dbCount(`SELECT count(*) FROM tournaments
      WHERE public_id IN ('${A.tournamentPublicId}', '${B.tournamentPublicId}')
        AND name = 'RKMP T20 Championship'`),
      "two tournaments share the name across two academies").toBe(2);
    expect(dbCount(`SELECT count(DISTINCT academy_id) FROM tournaments
      WHERE public_id IN ('${A.tournamentPublicId}', '${B.tournamentPublicId}')`),
      "in two different academies").toBe(2);

    // Neither list can see the other.
    const aList = (await A.api.raw("get",
      "/api/admin/cricket/tournaments?size=100")).body as any;
    const bList = (await B.api.raw("get",
      "/api/admin/cricket/tournaments?size=100")).body as any;
    const ids = (page: any) => (page.content ?? page).map((x: any) => x.publicId);
    expect(ids(aList), "A's list holds A's").toContain(A.tournamentPublicId);
    expect(ids(aList), "and not B's").not.toContain(B.tournamentPublicId);
    expect(ids(bList), "B's list holds B's").toContain(B.tournamentPublicId);
    expect(ids(bList), "and not A's").not.toContain(A.tournamentPublicId);
  });

  test("every tournament endpoint refuses B's ADMIN against A's tournament", async () => {
    const tid = A.tournamentPublicId;
    const team = A.sides[0].publicId;
    const fixture = groupFixtures[0].publicId;
    const player = A.sides[0].squad[0].publicId;
    const match = played[0].matchPublicId;
    const venue = A.venues[0].id;
    const award = ((await A.api.raw("get",
      `/api/admin/cricket/tournaments/${tid}/awards`)).body as any[])[0].publicId;

    const base = `/api/admin/cricket/tournaments/${tid}`;

    // `as` defaults to B's ADMIN and `expect` to 404. A SUPER_ADMIN-only endpoint
    // refuses an ADMIN with 403 from its role gate before it ever resolves the
    // tournament, which proves the ROLE boundary and says nothing about the TENANT
    // one — so those are probed as B's SUPER_ADMIN, where 404 is the real claim.
    type Probe = { label: string; method: "get" | "post" | "put" | "patch" | "delete";
                   url: string; body?: unknown;
                   as?: "admin" | "superadmin"; expect?: number };

    const probes: Probe[] = [
      { label: "list (A's tournament in B's list)", method: "get",
        url: "/api/admin/cricket/tournaments?size=100" },
      { label: "detail", method: "get", url: base },
      { label: "result", method: "get", url: `${base}/result` },
      { label: "teams", method: "get", url: `${base}/teams` },
      { label: "stages", method: "get", url: `${base}/stages` },
      { label: "fixtures", method: "get", url: `${base}/fixtures` },
      { label: "standings", method: "get", url: `${base}/standings` },
      { label: "players", method: "get", url: `${base}/players` },
      { label: "squad", method: "get", url: `${base}/teams/${team}/squad` },
      { label: "conflicts", method: "get", url: `${base}/conflicts` },
      { label: "qualification-rules (read)", method: "get", url: `${base}/qualification-rules` },
      { label: "venues", method: "get", url: `${base}/venues` },
      { label: "officials-pool", method: "get", url: `${base}/officials-pool` },
      { label: "dashboard", method: "get", url: `${base}/dashboard` },
      { label: "stats/batting", method: "get", url: `${base}/stats/batting` },
      { label: "stats/bowling", method: "get", url: `${base}/stats/bowling` },
      { label: "stats/fielding", method: "get", url: `${base}/stats/fielding` },
      { label: "stats/teams", method: "get", url: `${base}/stats/teams` },
      { label: "awards", method: "get", url: `${base}/awards` },
      { label: "awards/slots", method: "get", url: `${base}/awards/slots` },
      { label: "awards/candidates", method: "get", url: `${base}/awards/candidates` },
      { label: "match award-candidates", method: "get",
        url: `${base}/matches/${match}/award-candidates` },
      { label: "prepare-match", method: "get",
        url: `${base}/fixtures/${fixture}/prepare-match` },
      // Every report type.
      ...(["summary", "fixtures", "points-table", "results", "team-performance",
           "batting", "bowling", "fielding", "awards", "complete"] as const)
        .map((type) => ({ label: `report: ${type}`, method: "get" as const,
                          url: `${base}/reports/${type}` })),
      // Writes.
      { label: "update (PUT)", method: "put", url: base,
        body: { name: "Hijacked by B", format: "ROUND_ROBIN", defaultOvers: 20 } },
      { label: "settings", method: "patch", url: `${base}/settings`,
        body: { oversPerInnings: 5, minsPerOver: 4, inningsBreakMins: 5,
                groundGapMins: 5, dayStartTime: "09:00", dayEndTime: "18:00",
                maxMatchesPerDay: 9 } },
      { label: "status", method: "patch", url: `${base}/status`,
        body: { status: "CANCELLED" } },
      { label: "declare-winner (as B's SUPER_ADMIN)", method: "post",
        url: `${base}/declare-winner`, as: "superadmin",
        body: { winnerTeamPublicId: team, reason: "B should not be able to do this" } },
      { label: "qualification-rules (write)", method: "put",
        url: `${base}/qualification-rules`,
        body: { teamsAdvancingPerGroup: 4, knockoutSeedingRule: "GLOBAL_SEED",
                tieBreakOrder: ["POINTS"] } },
      { label: "add team", method: "post", url: `${base}/teams`,
        body: { name: "Intruder", shortName: "INT" } },
      { label: "remove team", method: "delete", url: `${base}/teams/${team}` },
      { label: "add to squad", method: "post", url: `${base}/teams/${team}/squad`,
        body: { playerPublicId: player, playerRole: "BATSMAN" } },
      { label: "remove from squad", method: "delete",
        url: `${base}/teams/${team}/squad/${player}` },
      { label: "preview fixtures", method: "post", url: `${base}/fixtures/preview`,
        body: { teamsPerGroup: 2 } },
      { label: "generate fixtures", method: "post", url: `${base}/fixtures/generate`,
        body: { teamsPerGroup: 2 } },
      { label: "manual fixture", method: "post", url: `${base}/fixtures/manual`,
        body: { homeTeamPublicId: team, awayTeamPublicId: A.sides[1].publicId } },
      { label: "update fixture", method: "patch", url: `${base}/fixtures/${fixture}`,
        body: { city: "Hijacked" } },
      { label: "reschedule", method: "post",
        url: `${base}/fixtures/${fixture}/reschedule`,
        body: { postpone: true, reason: "B should not be able to do this" } },
      { label: "mark final", method: "patch", url: `${base}/fixtures/${fixture}/final`,
        body: { isFinal: true } },
      { label: "delete fixture", method: "delete", url: `${base}/fixtures/${fixture}` },
      { label: "delete all fixtures", method: "delete", url: `${base}/fixtures` },
      { label: "advance knockout", method: "post", url: `${base}/advance-knockout`, body: {} },
      { label: "advance playoffs", method: "post", url: `${base}/advance-playoffs`, body: {} },
      { label: "give award", method: "post", url: `${base}/awards`,
        body: { awardType: "BEST_BATTER", playerPublicId: player, teamPublicId: team,
                reason: "B should not be able to do this" } },
      { label: "revoke award", method: "delete", url: `${base}/awards/${award}` },
      { label: "add venue", method: "post", url: `${base}/venues`,
        body: { name: "Intruder Ground" } },
      { label: "update venue", method: "patch", url: `${base}/venues/${venue}`,
        body: { name: "Hijacked Ground" } },
      { label: "delete venue", method: "delete", url: `${base}/venues/${venue}` },
      { label: "add official", method: "post", url: `${base}/officials-pool`,
        body: { name: "Intruder Umpire", role: "UMPIRE" } },
      { label: "delete tournament", method: "delete", url: base },
    ];

    // Everything A owns, before B tries anything.
    const census = () => ({
      tournament: dbOne(`SELECT name || '|' || status ||
          '|' || coalesce(champion_team_id::text, '') ||
          '|' || overs_per_innings || '|' || teams_advancing_per_group ||
          '|' || knockout_seeding_rule || '|' || tie_break_order
        FROM tournaments WHERE public_id = '${tid}'`),
      teams: dbOne(`SELECT coalesce(string_agg(name || ':' || coalesce(group_name, ''),
          ',' ORDER BY name), '') FROM tournament_teams
        WHERE tournament_id = (SELECT id FROM tournaments WHERE public_id = '${tid}')`),
      squad: dbCount(`SELECT count(*) FROM tournament_team_squad
        WHERE tournament_team_id IN (SELECT id FROM tournament_teams
          WHERE tournament_id = (SELECT id FROM tournaments WHERE public_id = '${tid}'))`),
      fixtures: dbOne(`SELECT coalesce(string_agg(public_id || ':' || status ||
          ':' || coalesce(city, '') || ':' || is_final, ',' ORDER BY public_id), '')
        FROM fixtures WHERE tournament_id =
          (SELECT id FROM tournaments WHERE public_id = '${tid}')`),
      awards: dbOne(`SELECT coalesce(string_agg(award_type, ',' ORDER BY award_type), '')
        FROM tournament_awards WHERE tournament_id =
          (SELECT id FROM tournaments WHERE public_id = '${tid}')`),
      venues: dbOne(`SELECT coalesce(string_agg(name, ',' ORDER BY name), '')
        FROM tournament_venues WHERE tournament_id =
          (SELECT id FROM tournaments WHERE public_id = '${tid}')`),
      officials: dbOne(`SELECT coalesce(string_agg(name, ',' ORDER BY name), '')
        FROM tournament_officials_pool WHERE tournament_id =
          (SELECT id FROM tournaments WHERE public_id = '${tid}')`),
      stages: dbCount(`SELECT count(*) FROM tournament_stages
        WHERE tournament_id = (SELECT id FROM tournaments WHERE public_id = '${tid}')`),
      audit: dbCount(`SELECT count(*) FROM audit_logs WHERE entity_public_id = '${tid}'`),
    });

    const before = census();

    // ── run every probe as academy B ────────────────────────────────────────
    //
    // Collected first and asserted afterwards, so one run reports EVERY endpoint
    // that answered something other than 404 rather than stopping at the first.
    const bSuper = await Api.login(config().bSuperAdmin);
    const rows: { label: string; method: string; url: string; actor: string;
                  status: number; want: number }[] = [];
    try {
      for (const probe of probes) {
        const actor = probe.as === "superadmin" ? bSuper : B.api;
        const r = await actor.raw(probe.method, probe.url, probe.body);
        rows.push({
          label: probe.label, method: probe.method.toUpperCase(),
          url: probe.url.replace(tid, "{A}").replace(/\?.*$/, ""),
          actor: probe.as === "superadmin" ? "B SUPER_ADMIN" : "B ADMIN",
          status: r.status, want: probe.expect ?? 404,
        });

        if (probe.label.startsWith("list")) {
          // The list is B's own and legitimately returns 200 — it just must not
          // contain A's tournament.
          const page = r.body as any;
          expect((page.content ?? page).map((x: any) => x.publicId),
            "B's list never contains A's tournament").not.toContain(tid);
        }
      }
    } finally {
      await bSuper.dispose();
    }

    // ── nothing was written ─────────────────────────────────────────────────
    expect(census(), "B's forty-odd attempts wrote nothing to A's tournament")
      .toEqual(before);

    // No stray rows anywhere, either — an INSERT that landed in B's academy but
    // pointed at A's tournament would not show up in the census above.
    expect(dbCount(`SELECT count(*) FROM tournament_teams
      WHERE tournament_id = (SELECT id FROM tournaments WHERE public_id = '${tid}')
        AND academy_id <> (SELECT academy_id FROM tournaments WHERE public_id = '${tid}')`),
      "no foreign-academy team row under A's tournament").toBe(0);
    expect(dbCount(`SELECT count(*) FROM tournament_venues
      WHERE name = 'Intruder Ground'`), "the intruder ground was never created").toBe(0);
    expect(dbCount(`SELECT count(*) FROM tournament_officials_pool
      WHERE name = 'Intruder Umpire'`), "nor the intruder umpire").toBe(0);
    expect(dbCount(`SELECT count(*) FROM tournaments WHERE name = 'Hijacked by B'`),
      "and A's tournament was not renamed").toBe(0);

    // ── the table in the report, written out from the run ───────────────────
    const dir = path.resolve("e2e/report");
    mkdirSync(dir, { recursive: true });
    const md = [
      `<!-- generated by tournament-e2e.spec.ts, worker ${WORKER}. Do not hand-edit. -->`,
      "",
      "| Endpoint | Method | Path | Actor | Status |",
      "|---|---|---|---|---|",
      ...rows.map((r) => `| ${r.label} | ${r.method} | \`${r.url}\` | ${r.actor} `
        + `| **${r.status}** |`),
      "",
      `Probes: ${rows.length}. `
      + `404: ${rows.filter((r) => r.status === 404).length}. `
      + `200 (B's own list, with A absent from it): `
      + `${rows.filter((r) => r.status === 200).length}. `
      + `Rows written to A: 0.`,
      "",
    ].join("\n");
    writeFileSync(path.join(dir, `tenant-matrix-${WORKER}.md`), md);

    // Every probe against its own expectation, in one message.
    const wrong = rows.filter((r) => !r.label.startsWith("list") && r.status !== r.want);
    expect(wrong.map((r) => `${r.label} [${r.actor}] → ${r.status}, wanted ${r.want}`),
      "every tournament endpoint refuses academy B").toEqual([]);
    expect(rows.length, "the matrix covers the whole tournament surface")
      .toBeGreaterThanOrEqual(50);
  });

  test("the run added no user, and owns every row it created", async () => {
    // Users are never created by this suite, so seven is an invariant, not a
    // baseline that teardown has to restore.
    expect(dbCount("SELECT count(*) FROM users"), "the seven users are untouched").toBe(7);

    // Every player, tournament and match this run can see is one it made. The
    // BASELINE itself — 7 users, 0 players, 0 tournaments — is asserted from the
    // shell after the whole suite, because other specs share this database and an
    // in-spec global count would be asserting their state as well as this one's.
    expect(dbCount(`SELECT count(*) FROM tournaments
      WHERE public_id IN ('${A.tournamentPublicId}', '${B.tournamentPublicId}')`),
      "both tournaments still exist, for afterAll to remove").toBe(2);
    expect(dbCount(`SELECT count(*) FROM players
      WHERE display_name LIKE 'T31 A${RUN} %' OR display_name LIKE 'T31 B${RUN} %'`),
      "88 + 44 players, all tagged to this run").toBe(88 + 44);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

async function standings() {
  const r = await A.api.raw("get",
    `/api/admin/cricket/tournaments/${A.tournamentPublicId}/standings`);
  expect(r.status, "standings").toBe(200);
  return r.body as any[];
}

/**
 * Points, NRR, played/won/lost/tied/no-result for every side, against figures
 * recomputed from the innings rows rather than read from the endpoint.
 */
async function assertStandings(when: string) {
  const rows = await standings();
  expect(rows.length, `${when}: eight rows`).toBe(8);

  for (const side of A.sides) {
    const row = rows.find((r: any) => r.teamPublicId === side.publicId)!;
    const e = expectedFor(side.name, played);
    expect(row.played, `${when}: ${side.name} played`).toBe(e.matches);
    expect(row.won, `${when}: ${side.name} won`).toBe(e.wins);
    expect(row.lost, `${when}: ${side.name} lost`).toBe(e.losses);
    expect(row.tied, `${when}: ${side.name} tied`).toBe(e.ties);
    expect(row.noResult, `${when}: ${side.name} no-result`).toBe(e.noResults);
    expect(row.points, `${when}: ${side.name} points`).toBe(e.points);
    expect(row.nrr, `${when}: ${side.name} NRR`).toBeCloseTo(e.nrr, 3);
  }

  // The table is ordered by points, then NRR.
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    expect(a.points >= b.points, `${when}: row ${i} is not above row ${i + 1} on points`)
      .toBe(true);
    if (a.points === b.points) {
      expect(a.nrr >= b.nrr - 1e-9,
        `${when}: level on points, so NRR must not be ascending`).toBe(true);
    }
  }

  // No result counted twice: every completed fixture contributes exactly two
  // appearances to the table, and no more.
  const completed = played.length;
  expect(rows.reduce((n: number, r: any) => n + r.played, 0),
    `${when}: ${completed} completed fixtures are counted once each`).toBe(completed * 2);
}

/** Play a fixture with its scripted result, recording it in `played`. */
async function playOne(f: any, home: Side, away: Side,
                       opts: { stopBeforeResult?: boolean } = {}) {
  const script = scriptFor(home.name, away.name);
  if (opts.stopBeforeResult) {
    // The OPEN MATCH test needs a fixture with a LIVE match, so the result is
    // withheld until the UI has been through it. Innings 1 only.
    return { fixture: f, home, away, script,
             ...(await startOnly(f, home, away, script)) };
  }
  const p = await playFixture(A.api, A.tournamentPublicId, f, home, away, script,
    (f.scheduledAt ?? "2026-03-10T09:30:00+05:30").slice(0, 10));
  played.push(p);
  return p as any;
}

/** Create, link and start a fixture's match without scoring or resulting it. */
async function startOnly(f: any, home: Side, away: Side, _script: FixtureScript) {
  const xi = (side: Side) => side.squad.map((p, i) => ({
    playerPublicId: p.publicId, battingOrder: i + 1,
    isCaptain: i === 0, isWicketkeeper: i === 5,
    isImpactPlayer: false, isForeign: false,
  }));

  const prep = await A.api.raw("get",
    `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${f.publicId}/prepare-match`);
  expect(prep.status, "prepare-match").toBe(200);

  const m = await createMatch(A.api, {
    title: (prep.body as any).suggestedTitle,
    matchDate: (f.scheduledAt ?? "2026-03-10T00:00:00Z").slice(0, 10),
    matchType: "INTERNAL", totalOvers: 20, venue: "RKMP Main Ground",
    tournamentPublicId: A.tournamentPublicId, fixturePublicId: f.publicId,
  });
  const matchPublicId = m.publicId as string;

  await A.api.setTeams(matchPublicId, {
    teamAName: home.name, teamBName: away.name,
    teamAPlayers: xi(home), teamBPlayers: xi(away),
  });
  const sides = (await A.api.getTeams(matchPublicId)) as any[];
  await A.api.toss(matchPublicId, { winnerTeamPublicId: sides[0].publicId, decision: "BAT" });
  await A.api.raw("post",
    `/api/admin/cricket/tournaments/${A.tournamentPublicId}/fixtures/${f.publicId}/link-match`,
    { matchPublicId });
  await A.api.start(matchPublicId);
  return { matchPublicId };
}

/**
 * Finish a fixture whose match was started by `startOnly`: score both innings and
 * record the result, then record it in `played`.
 */
async function finishOne(started: any) {
  const { fixture, home, away, script, matchPublicId } = started;
  const sides = (await A.api.getTeams(matchPublicId)) as any[];
  const homeSide = sides[0].publicId as string;
  const awaySide = sides[1].publicId as string;

  // The same `playInnings` every other fixture goes through, so the fixture the
  // UI test borrowed is not scored by a second, slightly different code path.
  await playInnings(A.api, matchPublicId, homeSide, awaySide, script.first);
  await playInnings(A.api, matchPublicId, awaySide, homeSide, script.second);

  const rows = inningsOf(matchPublicId);
  const homeRuns = rows.find((i) => i.battingTeamName === home.name)!.totalRuns;
  const awayRuns = rows.find((i) => i.battingTeamName === away.name)!.totalRuns;
  expect(homeRuns, "the borrowed fixture is a scripted win, not a tie").not.toBe(awayRuns);

  const winner = homeRuns > awayRuns ? home : away;
  const loser = winner === home ? away : home;
  const winnerSide = winner === home ? homeSide : awaySide;
  const margin = Math.abs(homeRuns - awayRuns);

  const rec = await A.api.raw("post",
    `/api/admin/cricket/matches/${matchPublicId}/result`, {
      resultType: "WIN", winnerTeamPublicId: winnerSide, resultMargin: margin,
      resultDescription: `${winner.name} won by ${margin} runs`,
    });
  expect(rec.status, "record the result after the UI visit").toBe(200);

  played.push({
    fixturePublicId: fixture.publicId, matchPublicId, home, away,
    homeRuns, awayRuns, resultType: "WIN", winner, loser,
    innings: inningsOf(matchPublicId),
  });
}

async function openTournament(page: Page) {
  const seed = A.api.storageSeed();
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
  }, seed);
  await page.goto(`/admin/cricket/tournaments/${A.tournamentPublicId}`);
  await expect(page.getByRole("heading", { name: A.tournamentName })).toBeVisible();
}
