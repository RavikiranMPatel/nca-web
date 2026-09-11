import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";

/**
 * BUG-27 — tournament venues, officials and leaderboards were reachable by any
 * academy.
 *
 * TournamentVenueController resolved the tournament with a bare findByPublicId
 * and never checked the actor's academy on any of its eight endpoints, so a
 * foreign admin could read the venue and officials lists, and — worse — POST a
 * venue that attached to the victim's tournament while carrying the caller's
 * academy_id. TournamentStatsService had the same hole feeding three
 * leaderboards.
 *
 * The rule now enforced, taken from MatchService.createMatch, which has always
 * had it: cross-academy reach is real for KSCA-style tournaments but is not
 * unconditional. Participate to read, own to configure.
 *
 * Two tournaments are built:
 *   soloA — owned by A, B has no team in it. B must see nothing at all.
 *   kscaA — owned by A with a team entered by B. B may read, but not write.
 */

const RUN = `${Date.now() % 1000000}`;
const VENUE_EPS = (t: string) => ({
  reads: [
    { method: "get" as const, url: `/api/admin/cricket/tournaments/${t}/venues` },
    { method: "get" as const, url: `/api/admin/cricket/tournaments/${t}/officials-pool` },
  ],
  writes: [
    { method: "post" as const, url: `/api/admin/cricket/tournaments/${t}/venues`,
      body: { name: "Injected Ground", maxMatchesPerDay: 2 } },
    { method: "patch" as const, url: `/api/admin/cricket/tournaments/${t}/venues/${crypto.randomUUID()}`,
      body: { name: "Renamed" } },
    { method: "delete" as const, url: `/api/admin/cricket/tournaments/${t}/venues/${crypto.randomUUID()}` },
    { method: "post" as const, url: `/api/admin/cricket/tournaments/${t}/officials-pool`,
      body: { name: "Injected Umpire", role: "UMPIRE" } },
    { method: "delete" as const, url: `/api/admin/cricket/tournaments/${t}/officials-pool/${crypto.randomUUID()}` },
  ],
});
/**
 * Every tournament-scoped read Slice 5 leaves in place.
 *
 * `mvp` is gone: Slice 5 replaced it with the award candidate endpoints, which
 * are what an MVP list was ever used for. `fielding` and `teams` are new, and
 * `dashboard` is Phase 4's. All five go through the same TournamentAccessGuard,
 * so all five belong in this spec.
 */
const LEADERBOARDS = (t: string) => [
  ...["batting", "bowling", "fielding", "teams"].map(
    (k) => `/api/admin/cricket/tournaments/${t}/stats/${k}`,
  ),
  `/api/admin/cricket/tournaments/${t}/dashboard`,
  `/api/admin/cricket/tournaments/${t}/awards`,
  `/api/admin/cricket/tournaments/${t}/awards/slots`,
  `/api/admin/cricket/tournaments/${t}/awards/candidates`,
];

async function makeTournament(api: Api, name: string) {
  const r = await api.raw("post", "/api/admin/cricket/tournaments", {
    name, format: "ROUND_ROBIN", venue: "Test Ground",
    startDate: "2026-01-01", endDate: "2026-02-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(r.status, `create ${name}`).toBe(200);
  return (r.body as any).publicId as string;
}

/** Rows the foreign academy must never be able to create. */
function dbOne(sql: string): string {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", sql], { encoding: "utf8" }).trim();
}
function dbExec(sql: string): void {
  const { db } = config();
  execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
}
function countRows(sql: string): number { return Number(dbOne(sql)); }

/**
 * Tournaments created here are removed afterwards. There is no delete-tournament
 * endpoint, so this is a direct DELETE in the local test database only — the same
 * reason the participation row below is seeded that way.
 */
test.afterAll(() => {
  dbExec(`DELETE FROM tournament_venues WHERE tournament_id IN
            (SELECT id FROM tournaments WHERE name LIKE 'BUG27 %${RUN}')`);
  dbExec(`DELETE FROM tournament_officials_pool WHERE tournament_id IN
            (SELECT id FROM tournaments WHERE name LIKE 'BUG27 %${RUN}')`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN
            (SELECT id FROM tournaments WHERE name LIKE 'BUG27 %${RUN}')`);
  dbExec(`DELETE FROM tournaments WHERE name LIKE 'BUG27 %${RUN}'`);
});

test.describe("BUG-27 — tournament scoping", () => {
  test("Academy B is refused on every venue, officials and stats endpoint of A's tournament", async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const env = config();
    const a = await Api.login(env.a);
    const b = await Api.login(env.b);

    const soloA = await makeTournament(a, `BUG27 Solo ${RUN}`);

    // A can use its own tournament — the fix must not break the owner.
    const eps = VENUE_EPS(soloA);
    for (const r of eps.reads) {
      expect((await a.raw(r.method, r.url)).status, `owner ${r.url}`).toBe(200);
    }
    const created = await a.raw("post", `/api/admin/cricket/tournaments/${soloA}/venues`,
      { name: `Owner Ground ${RUN}`, maxMatchesPerDay: 2 });
    expect(created.status, "owner can add a venue").toBe(200);

    const venuesBefore = countRows(
      `SELECT count(*) FROM tournament_venues v JOIN tournaments t ON t.id=v.tournament_id
       WHERE t.public_id='${soloA}'`);
    const officialsBefore = countRows(
      `SELECT count(*) FROM tournament_officials_pool o JOIN tournaments t ON t.id=o.tournament_id
       WHERE t.public_id='${soloA}'`);

    // ── B, with no involvement, must get 404 on all eight ────────────────────
    for (const r of [...eps.reads, ...eps.writes]) {
      const res = await b.raw(r.method, r.url, (r as any).body);
      expect(res.status, `B → ${r.method.toUpperCase()} ${r.url}`).toBe(404);
      // 404, not 403: existence must not be revealed.
      expect(JSON.stringify(res.body)).toContain("not found");
    }
    for (const url of LEADERBOARDS(soloA)) {
      expect((await b.raw("get", url)).status, `B → ${url}`).toBe(404);
    }

    // ── and nothing was written ──────────────────────────────────────────────
    expect(countRows(
      `SELECT count(*) FROM tournament_venues v JOIN tournaments t ON t.id=v.tournament_id
       WHERE t.public_id='${soloA}'`), "no venue rows written by B").toBe(venuesBefore);
    expect(countRows(
      `SELECT count(*) FROM tournament_officials_pool o JOIN tournaments t ON t.id=o.tournament_id
       WHERE t.public_id='${soloA}'`), "no officials rows written by B").toBe(officialsBefore);
    // The original defect wrote a row whose academy disagreed with its tournament.
    expect(countRows(
      `SELECT count(*) FROM tournament_venues v JOIN tournaments t ON t.id=v.tournament_id
       WHERE v.academy_id IS DISTINCT FROM t.academy_id`), "no cross-academy venue rows").toBe(0);

    await a.dispose(); await b.dispose();
  });

  test("KSCA-style: a participating academy may read the tournament but not configure it", async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const env = config();
    const a = await Api.login(env.a);
    const b = await Api.login(env.b);

    const kscaA = await makeTournament(a, `BUG27 KSCA ${RUN}`);

    // B must have a team entered for the participation branch to apply.
    //
    // There is no API path that creates this state: TournamentService.addTeam is
    // owner-scoped (`getTournament(publicId, actor)`, :122) and stamps the row with
    // the caller's own academy (:130), so tournament_teams.academy_id can only ever
    // be the owner's. The participation test that MatchService.createMatch has
    // always used — and that the guard now uses — is therefore unreachable through
    // supported flows today. That is recorded against BUG-27 as a finding; the
    // branch is still asserted here so the guard is known-correct for when a
    // cross-academy entry flow is built.
    //
    // Seeded directly for that reason, in the local test database only, and
    // removed at the end of the test.
    const bAcademy = dbOne(
      `SELECT u.academy_id::text FROM users u WHERE u.email = '${env.b.email}'`);
    expect(bAcademy, "academy B id").toBeTruthy();
    dbExec(`INSERT INTO tournament_teams
              (id, public_id, academy_id, tournament_id, name, short_name, created_at, updated_at, version, is_deleted)
            SELECT gen_random_uuid(), 'TT-BUG27-${RUN}', '${bAcademy}', t.id,
                   'B Visiting XI', 'BVX', now(), now(), 0, false
            FROM tournaments t WHERE t.public_id = '${kscaA}'`);

    try {
      const eps = VENUE_EPS(kscaA);
      // Participant may READ.
      for (const r of eps.reads) {
        expect((await b.raw(r.method, r.url)).status, `participant read ${r.url}`).toBe(200);
      }
      for (const url of LEADERBOARDS(kscaA)) {
        expect((await b.raw("get", url)).status, `participant read ${url}`).toBe(200);
      }
      // Participant may NOT configure.
      for (const w of eps.writes) {
        expect((await b.raw(w.method, w.url, (w as any).body)).status,
               `participant must NOT write ${w.url}`).toBe(404);
      }
      // And still wrote nothing.
      expect(countRows(
        `SELECT count(*) FROM tournament_venues v JOIN tournaments t ON t.id=v.tournament_id
         WHERE t.public_id='${kscaA}' AND v.academy_id='${bAcademy}'`),
        "participant wrote no venue rows").toBe(0);
    } finally {
      dbExec(`DELETE FROM tournament_teams WHERE public_id = 'TT-BUG27-${RUN}'`);
    }

    await a.dispose(); await b.dispose();
  });
});
