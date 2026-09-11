import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Slice 4 — conflict detection, reschedule and postponement.
 *
 * Neither existed before: every "conflict" in the codebase was an unrelated
 * HttpStatus.CONFLICT, so two fixtures could share a ground at the same time, or
 * a team be asked to play two matches at once, and nothing said so.
 *
 * Ruling 4 is the spine of this file — a clash is refused, only a SUPER_ADMIN may
 * override it, only with a reason, and the override is audited. Each of those
 * four is asserted separately, including that a refusal writes nothing.
 *
 * Desktop only: API and database contracts.
 */

const RUN = `${Date.now() % 1000000}`;
let seq = 0;
const created: string[] = [];

const AT = (hhmm: string) => `2026-11-0${1}T${hhmm}:00+05:30`;

async function build(api: Api, label: string, teamCount = 4) {
  const name = `S4C-${RUN}-${label}-${seq++}`;
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name, format: "ROUND_ROBIN", venue: "Conflict Ground",
    startDate: "2026-11-01", endDate: "2026-12-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
    matchDurationMins: 90, groundGapMins: 30,
  });
  expect(t.status, "create tournament").toBe(200);
  const tid = (t.body as any).publicId as string;
  created.push(tid);

  const teams: any[] = [];
  for (let i = 0; i < teamCount; i++) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`,
      { name: `Club ${i} ${name}`, shortName: `C${i}`, colorHex: "#2563eb" });
    teams.push(r.body);
  }

  const v = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/venues`,
    { name: `Main Oval ${name}`, maxMatchesPerDay: 4 });
  const venueId = v.status === 200 ? (v.body as any).id : null;

  const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
  expect(fx.status, "generate").toBe(200);
  const fixtures = (fx.body as any[]).filter((f) => !f.byeTeam);

  return { tid, teams, fixtures, venueId, name };
}

const reschedule = (api: Api, tid: string, fid: string, body: Record<string, unknown>) =>
  api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/${fid}/reschedule`, body);

const auditCount = (tid: string, action: string) =>
  dbCount(`SELECT count(*) FROM audit_logs
           WHERE entity_public_id = '${tid}' AND action = '${action}'`);

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name LIKE 'S4C-${RUN}-%')`;
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL WHERE id IN ${t}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_venues WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  if (created.length) {
    dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN (${created.map((i) => `'${i}'`).join(",")})`);
  }
  dbExec(`DELETE FROM tournaments WHERE name LIKE 'S4C-${RUN}-%'`);
});

test.describe("Slice 4 — conflicts and reschedule", () => {

  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
  });

  // ── Rescheduling, when nothing clashes ──────────────────────────────────

  test("a move records the reason and keeps the original slot", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "move");
    const f = b.fixtures[0];

    const first = await reschedule(api, b.tid, f.publicId,
      { scheduledAt: AT("09:30"), reason: "Initial scheduling" });
    expect(first.status, JSON.stringify(first.body)).toBe(200);

    const second = await reschedule(api, b.tid, f.publicId,
      { scheduledAt: AT("14:00"), reason: "Ground waterlogged in the morning" });
    expect(second.status).toBe(200);

    const row = dbOne(`SELECT coalesce(original_scheduled_at::text,'NULL')
                       || '|' || coalesce(scheduled_at::text,'NULL')
                       || '|' || coalesce(reschedule_reason,'NULL')
                       || '|' || reschedule_count::text
                       FROM fixtures WHERE public_id = '${f.publicId}'`);
    const [original, current, reason, count] = row.split("|");

    expect(original, "the first slot is preserved").toContain("09:30");
    expect(current, "and the fixture now sits at the new one").toContain("14:00");
    expect(reason).toBe("Ground waterlogged in the morning");
    expect(count, "both moves counted").toBe("2");

    // A third move must not overwrite the original with the second slot.
    await reschedule(api, b.tid, f.publicId,
      { scheduledAt: AT("16:00"), reason: "Moved again" });
    expect(dbOne(`SELECT original_scheduled_at::text FROM fixtures WHERE public_id='${f.publicId}'`),
      "original still means original").toContain("09:30");

    expect(auditCount(b.tid, "FIXTURE_RESCHEDULED"), "each move audited").toBe(3);
    const details = dbOne(`SELECT details::text FROM audit_logs
                           WHERE entity_public_id='${b.tid}' AND action='FIXTURE_RESCHEDULED'
                           ORDER BY created_at DESC LIMIT 1`);
    expect(details, "the audit row carries both ends of the move").toContain("fromScheduledAt");
    expect(details).toContain("toScheduledAt");

    await api.dispose();
  });

  test("a postponement clears the slot and is its own action", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "postpone");
    const f = b.fixtures[0];

    await reschedule(api, b.tid, f.publicId, { scheduledAt: AT("09:30"), reason: "Scheduled" });

    const r = await reschedule(api, b.tid, f.publicId,
      { postpone: true, reason: "Opponent travel disrupted" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((r.body as any).status).toBe("POSTPONED");
    expect((r.body as any).scheduledAt, "the slot is given up").toBeNull();

    expect(dbOne(`SELECT original_scheduled_at::text FROM fixtures WHERE public_id='${f.publicId}'`),
      "but what it was is remembered").toContain("09:30");
    expect(auditCount(b.tid, "FIXTURE_POSTPONED")).toBe(1);

    await api.dispose();
  });

  test("a reason is required, and a completed fixture cannot be moved", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "guards");
    const f = b.fixtures[0];

    for (const bad of [{}, { reason: "" }, { reason: "   " }]) {
      const r = await reschedule(api, b.tid, f.publicId, { scheduledAt: AT("09:30"), ...bad });
      expect(r.status, `refused without a reason: ${JSON.stringify(bad)}`).toBe(400);
    }

    const noWhen = await reschedule(api, b.tid, f.publicId, { reason: "but to when?" });
    expect(noWhen.status, "a move needs a destination").toBe(400);

    dbExec(`UPDATE fixtures SET status='COMPLETED' WHERE public_id='${f.publicId}'`);
    const done = await reschedule(api, b.tid, f.publicId,
      { scheduledAt: AT("09:30"), reason: "too late" });
    expect(done.status, "a completed fixture is not reschedulable").toBe(400);

    expect(auditCount(b.tid, "FIXTURE_RESCHEDULED"), "and nothing was audited").toBe(0);

    await api.dispose();
  });

  // ── Ruling 4 ────────────────────────────────────────────────────────────

  test("a team cannot be in two places at once", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "teamclash");

    // Two fixtures sharing a side. A 4-team round robin guarantees one.
    const first = b.fixtures[0];
    const sharing = b.fixtures.find((f) =>
      f.publicId !== first.publicId &&
      [f.homeTeam.publicId, f.awayTeam.publicId].some((id) =>
        [first.homeTeam.publicId, first.awayTeam.publicId].includes(id)))!;
    expect(sharing, "a shared side exists").toBeTruthy();

    await reschedule(api, b.tid, first.publicId, { scheduledAt: AT("09:30"), reason: "first" });

    const clash = await reschedule(api, b.tid, sharing.publicId,
      { scheduledAt: AT("10:00"), reason: "overlapping" });

    expect(clash.status, "refused").toBe(409);
    expect((clash.body as any).message, "and says which team, and when")
      .toMatch(/is already playing/);

    expect(dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures
                  WHERE public_id='${sharing.publicId}'`),
      "the refused fixture was not moved").toBe("NULL");
    expect(auditCount(b.tid, "FIXTURE_RESCHEDULED"), "only the first move is audited").toBe(1);

    await api.dispose();
  });

  test("a ground cannot host two fixtures at once", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "venueclash");
    test.skip(!b.venueId, "no venue endpoint available in this build");

    // Two fixtures with no team in common, so only the ground can clash.
    const first = b.fixtures[0];
    const disjoint = b.fixtures.find((f) =>
      ![f.homeTeam.publicId, f.awayTeam.publicId].some((id) =>
        [first.homeTeam.publicId, first.awayTeam.publicId].includes(id)))!;
    expect(disjoint, "a disjoint pairing exists in a 4-team round robin").toBeTruthy();

    await reschedule(api, b.tid, first.publicId,
      { scheduledAt: AT("09:30"), venueId: b.venueId, reason: "first" });

    const clash = await reschedule(api, b.tid, disjoint.publicId,
      { scheduledAt: AT("10:00"), venueId: b.venueId, reason: "same ground" });

    expect(clash.status, "refused").toBe(409);
    expect((clash.body as any).message, "and names the ground")
      .toMatch(/is already hosting/);

    await api.dispose();
  });

  test("ADMIN cannot override a clash; SUPER_ADMIN can, with a reason, audited",
    async () => {
    const admin = await Api.login(config().a);
    const su = await Api.login(config().aSuperAdmin);
    const b = await build(admin, "override");

    const first = b.fixtures[0];
    const sharing = b.fixtures.find((f) =>
      f.publicId !== first.publicId &&
      [f.homeTeam.publicId, f.awayTeam.publicId].some((id) =>
        [first.homeTeam.publicId, first.awayTeam.publicId].includes(id)))!;

    await reschedule(admin, b.tid, first.publicId, { scheduledAt: AT("09:30"), reason: "first" });

    // ADMIN, asking to override.
    const byAdmin = await reschedule(admin, b.tid, sharing.publicId, {
      scheduledAt: AT("10:00"), reason: "double header",
      overrideConflicts: true, overrideReason: "the captains agreed",
    });
    expect(byAdmin.status, "an ADMIN may not override").toBe(403);

    // SUPER_ADMIN, but with no reason for the override.
    const noReason = await reschedule(su, b.tid, sharing.publicId, {
      scheduledAt: AT("10:00"), reason: "double header", overrideConflicts: true,
    });
    expect(noReason.status, "the override reason is mandatory").toBe(400);

    expect(dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures
                  WHERE public_id='${sharing.publicId}'`),
      "neither refusal moved anything").toBe("NULL");

    // SUPER_ADMIN, properly.
    const ok = await reschedule(su, b.tid, sharing.publicId, {
      scheduledAt: AT("10:00"), reason: "double header",
      overrideConflicts: true, overrideReason: "Both captains agreed to a double header",
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);

    const details = dbOne(`SELECT details::text FROM audit_logs
                           WHERE entity_public_id='${b.tid}' AND action='FIXTURE_RESCHEDULED'
                           ORDER BY created_at DESC LIMIT 1`);
    expect(details, "the override is recorded as one").toContain('"override": true');
    expect(details, "with its reason").toContain("Both captains agreed");
    expect(details, "and what was overridden").toContain("conflictsOverridden");

    await admin.dispose(); await su.dispose();
  });

  test("the conflicts endpoint reports what is already clashing", async () => {
    const api = await Api.login(config().a);
    const su = await Api.login(config().aSuperAdmin);
    const b = await build(api, "list");

    expect(((await api.raw("get", `/api/admin/cricket/tournaments/${b.tid}/conflicts`)).body as any[]),
      "a fresh tournament has none").toHaveLength(0);

    const first = b.fixtures[0];
    const sharing = b.fixtures.find((f) =>
      f.publicId !== first.publicId &&
      [f.homeTeam.publicId, f.awayTeam.publicId].some((id) =>
        [first.homeTeam.publicId, first.awayTeam.publicId].includes(id)))!;

    await reschedule(api, b.tid, first.publicId, { scheduledAt: AT("09:30"), reason: "first" });
    await reschedule(su, b.tid, sharing.publicId, {
      scheduledAt: AT("10:00"), reason: "second",
      overrideConflicts: true, overrideReason: "deliberate, for this test",
    });

    const conflicts = (await api.raw("get",
      `/api/admin/cricket/tournaments/${b.tid}/conflicts`)).body as any[];

    expect(conflicts.length, "the clash we deliberately created").toBeGreaterThan(0);
    expect(conflicts[0].type).toBe("TEAM");
    expect(conflicts[0].message).toBeTruthy();

    await api.dispose(); await su.dispose();
  });

  // ── Venues and officials: DTOs, and ruling 6 ────────────────────────────

  test("venues and officials come back as DTOs, and there is no scorer role",
    async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "venuedto");

    const venues = (await api.raw("get",
      `/api/admin/cricket/tournaments/${b.tid}/venues`)).body as any[];
    expect(venues.length).toBeGreaterThan(0);
    for (const leaked of ["academyId", "branchId", "tournament", "createdBy"]) {
      expect(venues[0], `${leaked} is not exposed`).not.toHaveProperty(leaked);
    }
    expect(venues[0], "but the id the UI filters by is").toHaveProperty("id");

    // Ruling 6: scoring happens in the app, so there is no scorer to appoint.
    const scorer = await api.raw("post",
      `/api/admin/cricket/tournaments/${b.tid}/officials-pool`,
      { name: "A Scorer", role: "SCORER" });
    expect(scorer.status, "SCORER is refused").toBe(400);
    expect((scorer.body as any).message).toContain("Valid roles");

    const umpire = await api.raw("post",
      `/api/admin/cricket/tournaments/${b.tid}/officials-pool`,
      { name: "A N Umpire", role: "umpire" });
    expect(umpire.status, "and a real role is accepted, case-insensitively").toBe(200);
    expect((umpire.body as any).role).toBe("UMPIRE");
    expect(umpire.body, "returned as a DTO").not.toHaveProperty("academyId");

    // A venue with no name is a 400 rather than a row called null.
    const unnamed = await api.raw("post",
      `/api/admin/cricket/tournaments/${b.tid}/venues`, { maxMatchesPerDay: 2 });
    expect(unnamed.status, "a venue needs a name").toBe(400);

    // And a number sent as a string is a 400, not the ClassCastException 500 the
    // hand-cast Map produced.
    const badNumber = await api.raw("post",
      `/api/admin/cricket/tournaments/${b.tid}/venues`,
      { name: "Oval Two", maxMatchesPerDay: "lots" });
    expect(badNumber.status, "a bad number is a 400").toBe(400);

    // Deleting another tournament's official used to return 200 and remove
    // nothing.
    const other = await build(api, "venueother");
    const foreign = await api.raw("delete",
      `/api/admin/cricket/tournaments/${other.tid}/officials-pool/${(umpire.body as any).id}`);
    expect(foreign.status, "refused, rather than a silent no-op").toBe(404);

    await api.dispose();
  });

  // ── Cross-tenant ────────────────────────────────────────────────────────

  test("Academy B is refused both new endpoints", async () => {
    const a = await Api.login(config().a);
    const b2 = await Api.login(config().b);
    const b = await build(a, "tenant");
    const f = b.fixtures[0];

    const resch = await reschedule(b2, b.tid, f.publicId,
      { scheduledAt: AT("09:30"), reason: "not mine to move" });
    expect([403, 404], "B on A's reschedule").toContain(resch.status);

    const conf = await b2.raw("get", `/api/admin/cricket/tournaments/${b.tid}/conflicts`);
    expect([403, 404], "B on A's conflicts").toContain(conf.status);

    expect(dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures
                  WHERE public_id='${f.publicId}'`), "nothing moved").toBe("NULL");
    expect(auditCount(b.tid, "FIXTURE_RESCHEDULED"), "nothing audited").toBe(0);

    expect((await a.raw("get", `/api/admin/cricket/tournaments/${b.tid}/conflicts`)).status,
      "A itself still works").toBe(200);

    await a.dispose(); await b2.dispose();
  });
});
