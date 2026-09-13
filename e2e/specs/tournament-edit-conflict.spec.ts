import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Ruling 4 on BOTH write paths — finding 4 of the closing pass.
 *
 * `FixtureScheduleService.reschedule` implemented ruling 4 in full: it refuses a
 * clash with 409, allows a SUPER_ADMIN override only with a reason, and audits
 * it. `TournamentService.updateFixture` — the endpoint the **Edit Fixture** form
 * posts to — set `scheduledAt` and `tournamentVenue` with no conflict check at
 * all. So the same clash was refused through one form and accepted through the
 * other, and an admin who wanted the clash simply used Edit instead of
 * Reschedule. Verified against the running backend before the fix:
 *
 * ```
 * PATCH /fixtures/{f1}  -> ground G1, 2026-11-01T09:30:00+05:30 : 200
 * PATCH /fixtures/{f2}  -> THE SAME ground and slot             : 200   <-- the hole
 * POST  /fixtures/{f2}/reschedule -> the same ground and slot   : 409
 * ```
 *
 * The first assertion below is that second line, and it is the one that fails
 * without the fix. The rest assert that PATCH did not get its own weaker copy of
 * the rule: the SAME message, the same 403 for an ADMIN, the same mandatory
 * reason, and an audit row for an override that goes through.
 *
 * Desktop only: API and database contracts, no viewport dimension.
 */

const RUN = `${Date.now() % 1000000}`;
let seq = 0;
const created: string[] = [];

const AT = (hhmm: string) => `2026-11-01T${hhmm}:00+05:30`;

async function build(api: Api, label: string) {
  const name = `EDCONF-${RUN}-${label}-${seq++}`;
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name, format: "ROUND_ROBIN", venue: "Edit Conflict Ground",
    startDate: "2026-11-01", endDate: "2026-12-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
    matchDurationMins: 90, groundGapMins: 30,
  });
  expect(t.status, "create tournament").toBe(200);
  const tid = (t.body as any).publicId as string;
  created.push(tid);

  for (let i = 0; i < 4; i++) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`,
      { name: `Side ${i} ${name}`, shortName: `S${i}`, colorHex: "#2563eb" });
    expect(r.status, `add side ${i}`).toBe(200);
  }

  const v = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/venues`,
    { name: `Edit Oval ${name}`, maxMatchesPerDay: 4 });
  expect(v.status, "add a ground").toBe(200);
  const venueId = (v.body as any).id as string;
  const venueName = (v.body as any).name as string;

  const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
  expect(fx.status, "generate").toBe(200);
  const fixtures = (fx.body as any[]).filter((f) => !f.byeTeam);

  // Two fixtures with no side in common, so the GROUND is the only thing that
  // can clash and the message is about one thing rather than three.
  const first = fixtures[0];
  const disjoint = fixtures.find((f) =>
    ![f.homeTeam.publicId, f.awayTeam.publicId].some((id) =>
      [first.homeTeam.publicId, first.awayTeam.publicId].includes(id)))!;
  expect(disjoint, "a disjoint pairing exists in a 4-team round robin").toBeTruthy();

  return { tid, first, disjoint, venueId, venueName, name };
}

const patch = (api: Api, tid: string, fid: string, body: Record<string, unknown>) =>
  api.raw("patch", `/api/admin/cricket/tournaments/${tid}/fixtures/${fid}`, body);

const reschedule = (api: Api, tid: string, fid: string, body: Record<string, unknown>) =>
  api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/${fid}/reschedule`, body);

const slotOf = (fid: string) =>
  dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures WHERE public_id='${fid}'`);

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name LIKE 'EDCONF-${RUN}-%')`;
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL WHERE id IN ${t}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_venues WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  if (created.length) {
    dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN (${created.map((i) => `'${i}'`).join(",")})`);
  }
  dbExec(`DELETE FROM tournaments WHERE name LIKE 'EDCONF-${RUN}-%'`);
});

test.describe("PATCH /fixtures/{id} — ruling 4, the same rule as reschedule", () => {

  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
  });

  test("the clashing edit that used to return 200 returns 409, and says the same thing",
    async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "refuse");

    // Park the first fixture on the ground. Through PATCH, because that is the
    // path under test and because it proves an edit that does NOT clash is
    // unaffected by the new check.
    const parked = await patch(api, b.tid, b.first.publicId,
      { scheduledAt: AT("09:30"), venueId: b.venueId });
    expect(parked.status, `an uncontested edit still succeeds: ${JSON.stringify(parked.body)}`)
      .toBe(200);

    // The same ground, inside the same 90+30 minute slot. This returned 200.
    const clash = await patch(api, b.tid, b.disjoint.publicId,
      { scheduledAt: AT("10:00"), venueId: b.venueId });
    expect(clash.status,
      `the Edit form must refuse what the Reschedule form refuses: ${JSON.stringify(clash.body)}`)
      .toBe(409);
    expect((clash.body as any).message, "and name the ground and the slot")
      .toMatch(/is already hosting/);

    // Nothing was written. A refusal that half-applies is worse than no check.
    expect(slotOf(b.disjoint.publicId), "the refused fixture was not moved").toBe("NULL");
    expect(dbOne(`SELECT coalesce(venue_id::text,'NULL') FROM fixtures
                  WHERE public_id='${b.disjoint.publicId}'`),
      "and was not given the ground either").toBe("NULL");

    // The two paths must not drift into two different refusals.
    const viaReschedule = await reschedule(api, b.tid, b.disjoint.publicId,
      { scheduledAt: AT("10:00"), venueId: b.venueId, reason: "same move, other form" });
    expect(viaReschedule.status, "the other form refuses it too").toBe(409);
    expect((clash.body as any).message,
      "one implementation of ruling 4, so one message")
      .toBe((viaReschedule.body as any).message);

    await api.dispose();
  });

  test("an ADMIN may not override, and a SUPER_ADMIN must give a reason", async () => {
    const admin = await Api.login(config().a);
    const su = await Api.login(config().aSuperAdmin);
    const b = await build(admin, "guards");

    await patch(admin, b.tid, b.first.publicId,
      { scheduledAt: AT("09:30"), venueId: b.venueId });

    const byAdmin = await patch(admin, b.tid, b.disjoint.publicId, {
      scheduledAt: AT("10:00"), venueId: b.venueId,
      overrideConflicts: true, overrideReason: "the captains agreed",
    });
    expect(byAdmin.status, "an ADMIN may not schedule over a clash here either").toBe(403);

    const noReason = await patch(su, b.tid, b.disjoint.publicId, {
      scheduledAt: AT("10:00"), venueId: b.venueId, overrideConflicts: true,
    });
    expect(noReason.status, "the override reason is mandatory on this path too").toBe(400);

    expect(slotOf(b.disjoint.publicId), "neither refusal moved anything").toBe("NULL");
    expect(dbCount(`SELECT count(*) FROM audit_logs
                    WHERE entity_public_id='${b.tid}' AND action='FIXTURE_UPDATED'`),
      "and neither was audited as an override").toBe(0);

    await admin.dispose(); await su.dispose();
  });

  test("a SUPER_ADMIN with a reason goes through, and the override is audited", async () => {
    const admin = await Api.login(config().a);
    const su = await Api.login(config().aSuperAdmin);
    const b = await build(admin, "override");

    await patch(admin, b.tid, b.first.publicId,
      { scheduledAt: AT("09:30"), venueId: b.venueId });

    const ok = await patch(su, b.tid, b.disjoint.publicId, {
      scheduledAt: AT("10:00"), venueId: b.venueId,
      overrideConflicts: true,
      overrideReason: "Both captains agreed to a double header on the main oval",
    });
    expect(ok.status, `the override is allowed: ${JSON.stringify(ok.body)}`).toBe(200);

    // The slot it was given, in the offset it was given in. (This response
    // echoes the value just set in memory, so it read correctly even before
    // finding 3 was fixed — what finding 3 broke is the value read BACK from the
    // database, which `tournament-fixture-timezone.spec.ts` asserts.)
    expect((ok.body as any).scheduledAt, "the slot it was moved to")
      .toBe("2026-11-01T10:00:00+05:30");
    expect(slotOf(b.disjoint.publicId), "and the move really happened")
      .toContain("10:00");

    const details = dbOne(`SELECT details::text FROM audit_logs
                           WHERE entity_public_id='${b.tid}' AND action='FIXTURE_UPDATED'
                           ORDER BY created_at DESC LIMIT 1`);
    expect(details, "the override is recorded").toContain('"override": true');
    expect(details, "with the clash it was taken over")
      .toContain("conflictsOverridden");
    expect(details, "and the reason the SUPER_ADMIN gave")
      .toContain("Both captains agreed");

    await admin.dispose(); await su.dispose();
  });

  test("Academy B cannot edit A's fixture", async () => {
    const a = await Api.login(config().a);
    const bApi = await Api.login(config().b);
    const b = await build(a, "tenant");

    const foreign = await patch(bApi, b.tid, b.first.publicId,
      { scheduledAt: AT("09:30"), venueId: b.venueId });
    expect(foreign.status, "B is refused A's fixture").toBe(404);
    expect(slotOf(b.first.publicId), "and wrote nothing").toBe("NULL");

    await a.dispose(); await bApi.dispose();
  });
});
