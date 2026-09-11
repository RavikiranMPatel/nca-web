import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Slice 3 — status automation and result integration.
 *
 * Covers the three things the slice changed and the one it removed:
 *
 *  - `updateStatus` used to write whatever string arrived. It is now an enum
 *    with transition rules, so the illegal cases are enumerated rather than
 *    sampled.
 *  - A tournament now completes itself when the fixture marked as the final is
 *    decided, setting champion and runner-up from the recorded winner.
 *  - A final that ties leaves no champion and the tournament LIVE, deliberately.
 *  - `declareWinner` used to take a winner and silently throw it away. It is now
 *    a SUPER_ADMIN override that records both sides and demands a reason.
 *
 * Desktop only: API and database contracts, no viewport dimension. The UI that
 * surfaces them is covered by tournament-tabs.spec.ts.
 */

const RUN = `${Date.now() % 1000000}`;
let seq = 0;
const tag = () => `S3-${RUN}-${seq++}`;

interface Built {
  api: Api;
  tid: string;
  name: string;
  teams: any[];
  fixturePublicId: string;
}

/** A tournament with two teams and one generated fixture. */
async function build(api: Api, label: string): Promise<Built> {
  const name = `${label} ${tag()}`;
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name,
    format: "ROUND_ROBIN",
    venue: "S3 Ground",
    startDate: "2026-05-01",
    endDate: "2026-06-01",
    defaultOvers: 20,
    winPoints: 2,
    tiePoints: 1,
    noResultPoints: 1,
  });
  expect(t.status, "create tournament").toBe(200);
  const tid = (t.body as any).publicId as string;

  const teams: any[] = [];
  for (const [n, short] of [["Titans", "TIT"], ["Rovers", "ROV"]]) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`, {
      name: `${n} ${tag()}`,
      shortName: short,
      colorHex: "#2563eb",
    });
    expect(r.status, `add team ${n}`).toBe(200);
    teams.push(r.body);
  }

  const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
  expect(fx.status, "generate fixtures").toBe(200);
  return { api, tid, name, teams, fixturePublicId: (fx.body as any[])[0].publicId };
}

/**
 * Play the fixture to a recorded result.
 *
 * @param winnerIndex index into `teams`, or null for a result with no winner.
 */
async function playFixture(b: Built, winnerIndex: number | null, resultType: string) {
  const m = await b.api.createMatch({
    title: `S3 match ${tag()}`,
    matchDate: "2026-05-10",
    matchType: "INTERNAL",
    totalOvers: 20,
    venue: "S3 Ground",
    tournamentPublicId: b.tid,
    fixturePublicId: b.fixturePublicId,
  });
  const matchPublicId = m.publicId as string;

  await b.api.setTeams(matchPublicId, {
    teamAName: b.teams[0].name,
    teamBName: b.teams[1].name,
    teamAPlayers: [],
    teamBPlayers: [],
  }).catch(() => { /* an empty XI may be rejected; the CricketTeam rows are what matter */ });

  const sides = (await b.api.getTeams(matchPublicId)) as any[];
  const body: Record<string, unknown> = {
    resultType,
    resultDescription: `${resultType} for ${b.name}`,
  };
  if (winnerIndex !== null) body.winnerTeamPublicId = sides[winnerIndex].publicId;

  const res = await b.api.raw("post", `/api/admin/cricket/matches/${matchPublicId}/result`, body);
  expect(res.status, "record result").toBe(200);
  return matchPublicId;
}

const status = async (api: Api, tid: string) =>
  ((await api.raw("get", `/api/admin/cricket/tournaments/${tid}`)).body as any).status;

const result = async (api: Api, tid: string) =>
  (await api.raw("get", `/api/admin/cricket/tournaments/${tid}/result`)).body as any;

const auditCount = (tid: string, action: string) =>
  dbCount(`SELECT count(*) FROM audit_logs
           WHERE entity_public_id = '${tid}' AND action = '${action}'`);

test.afterAll(() => {
  const tourneys = `(SELECT id FROM tournaments WHERE name LIKE '%S3-${RUN}%')`;
  const matches = `(SELECT id FROM cricket_matches WHERE title LIKE '%S3-${RUN}%')`;

  // V99 added three links that have to be released before the rows they point
  // at can go: tournaments -> tournament_teams (champion, runner-up) and
  // cricket_matches -> cricket_teams (winner). All three are NO ACTION, checked
  // at the end of each statement, so pointing at a row deleted by a *later*
  // statement is not enough.
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL
          WHERE id IN ${tourneys}`);
  dbExec(`UPDATE cricket_matches SET winner_team_id = NULL WHERE id IN ${matches}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${tourneys}`);

  // cricket_teams cascades from cricket_matches, so the match delete takes them.
  dbExec(`DELETE FROM cricket_matches WHERE title LIKE '%S3-${RUN}%'`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
            (SELECT public_id FROM tournaments WHERE name LIKE '%S3-${RUN}%')`);
  dbExec(`DELETE FROM tournaments WHERE name LIKE '%S3-${RUN}%'`);
});

test.describe("Slice 3 — tournament status and result", () => {

  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
  });

  // ── Status transitions ──────────────────────────────────────────────────

  test("the legal manual transitions are accepted and audited", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "Transitions");

    expect(await status(api, b.tid), "starts as DRAFT").toBe("DRAFT");

    for (const next of ["UPCOMING", "SUSPENDED", "LIVE"]) {
      const r = await api.raw("patch", `/api/admin/cricket/tournaments/${b.tid}/status`,
        { status: next, reason: `moving to ${next}` });
      expect(r.status, `DRAFT-chain -> ${next}`).toBe(200);
      expect((r.body as any).status, "response reports the new status").toBe(next);
      expect(await status(api, b.tid), `persisted as ${next}`).toBe(next);
    }

    // One row per transition, each carrying the old and new value.
    expect(auditCount(b.tid, "TOURNAMENT_STATUS_CHANGED"),
      "an audit row per transition").toBe(3);
    const first = dbOne(
      `SELECT details::text FROM audit_logs
       WHERE entity_public_id = '${b.tid}' AND action = 'TOURNAMENT_STATUS_CHANGED'
       ORDER BY created_at LIMIT 1`);
    expect(first, "old value recorded").toContain("DRAFT");
    expect(first, "new value recorded").toContain("UPCOMING");
    expect(first, "reason recorded").toContain("moving to UPCOMING");

    await api.dispose();
  });

  test("every illegal transition is refused with 400", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "Illegal");

    // From DRAFT, only UPCOMING and CANCELLED are legal.
    for (const bad of ["LIVE", "COMPLETED", "SUSPENDED", "DRAFT"]) {
      const r = await api.raw("patch", `/api/admin/cricket/tournaments/${b.tid}/status`,
        { status: bad });
      expect(r.status, `DRAFT -> ${bad} refused`).toBe(400);
    }

    // Not a member of the enum at all. The old endpoint wrote this verbatim.
    for (const junk of ["ACTIVE", "COMPLETE", "banana", ""]) {
      const r = await api.raw("patch", `/api/admin/cricket/tournaments/${b.tid}/status`,
        { status: junk });
      expect(r.status, `'${junk}' refused`).toBe(400);
    }

    expect(await status(api, b.tid), "nothing was written").toBe("DRAFT");
    expect(auditCount(b.tid, "TOURNAMENT_STATUS_CHANGED"),
      "a refused transition writes no audit row").toBe(0);

    await api.dispose();
  });

  test("COMPLETED and CANCELLED are terminal", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "Terminal");

    expect((await api.raw("patch", `/api/admin/cricket/tournaments/${b.tid}/status`,
      { status: "CANCELLED" })).status).toBe(200);

    for (const bad of ["DRAFT", "UPCOMING", "LIVE", "SUSPENDED"]) {
      const r = await api.raw("patch", `/api/admin/cricket/tournaments/${b.tid}/status`,
        { status: bad });
      expect(r.status, `CANCELLED -> ${bad} refused`).toBe(400);
    }
    expect(await status(api, b.tid)).toBe("CANCELLED");

    await api.dispose();
  });

  // ── The automatic path ──────────────────────────────────────────────────

  test("completing the fixture marked as the final sets champion, runner-up and COMPLETED",
    async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "AutoFinal");

    const mark = await api.raw("patch",
      `/api/admin/cricket/tournaments/${b.tid}/fixtures/${b.fixturePublicId}/final`,
      { isFinal: true });
    expect(mark.status, "mark the final").toBeLessThan(400);

    await playFixture(b, 0, "WON_BY_RUNS");

    expect(await status(api, b.tid), "tournament completed itself").toBe("COMPLETED");

    const res = await result(api, b.tid);
    expect(res.championTeamPublicId, "champion is the recorded winner")
      .toBe(b.teams[0].publicId);
    expect(res.runnerUpTeamPublicId, "runner-up is the other side")
      .toBe(b.teams[1].publicId);
    expect(res.finalTied, "not a tie").toBe(false);

    // Straight from the row, not just the DTO.
    expect(dbOne(`SELECT tt.public_id FROM tournaments t
                  JOIN tournament_teams tt ON tt.id = t.champion_team_id
                  WHERE t.public_id = '${b.tid}'`),
      "champion persisted as a link").toBe(b.teams[0].publicId);

    expect(auditCount(b.tid, "TOURNAMENT_COMPLETED"), "completion audited").toBe(1);
    const row = dbOne(`SELECT details::text FROM audit_logs
                       WHERE entity_public_id = '${b.tid}' AND action = 'TOURNAMENT_COMPLETED'`);
    expect(row).toContain(b.teams[0].publicId);
    expect(row, "recorded as automatic, not an operator action").toContain("automatic");

    await api.dispose();
  });

  test("a fixture that is not the final does not complete the tournament", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "NotFinal");

    await playFixture(b, 0, "WON_BY_RUNS");

    // It still moves to LIVE — play has started — but no further.
    expect(await status(api, b.tid), "LIVE, not COMPLETED").toBe("LIVE");
    const res = await result(api, b.tid);
    expect(res.championTeamPublicId, "no champion").toBeFalsy();
    expect(res.finalTied, "and not reported as a tie either").toBe(false);

    await api.dispose();
  });

  test("a tied final leaves no champion and the tournament LIVE", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "TiedFinal");

    await api.raw("patch",
      `/api/admin/cricket/tournaments/${b.tid}/fixtures/${b.fixturePublicId}/final`,
      { isFinal: true });

    // A tie has no winning team, so none is sent.
    await playFixture(b, null, "TIE");

    expect(await status(api, b.tid), "stays LIVE — it genuinely is not finished")
      .toBe("LIVE");

    const res = await result(api, b.tid);
    expect(res.championTeamPublicId, "no champion").toBeFalsy();
    expect(res.runnerUpTeamPublicId, "no runner-up").toBeFalsy();
    expect(res.finalTied, "reported as tied, not as undecided").toBe(true);

    expect(auditCount(b.tid, "TOURNAMENT_FINAL_UNDECIDED"), "the tie is audited").toBe(1);
    expect(auditCount(b.tid, "TOURNAMENT_COMPLETED"), "and it did not complete").toBe(0);

    await api.dispose();
  });

  // ── The override ────────────────────────────────────────────────────────

  test("a SUPER_ADMIN may override the result, with a reason", async () => {
    const admin = await Api.login(config().a);
    const b = await build(admin, "Override");
    const su = await Api.login(config().aSuperAdmin);

    const r = await su.raw("post", `/api/admin/cricket/tournaments/${b.tid}/declare-winner`, {
      winnerTeamPublicId: b.teams[1].publicId,
      runnerUpTeamPublicId: b.teams[0].publicId,
      reason: "Opponent forfeited after the toss",
    });
    expect(r.status, "override accepted").toBe(200);
    expect((r.body as any).championTeamPublicId).toBe(b.teams[1].publicId);

    expect(await status(admin, b.tid), "override completes the tournament").toBe("COMPLETED");

    expect(auditCount(b.tid, "TOURNAMENT_RESULT_OVERRIDDEN"), "audited").toBe(1);
    const row = dbOne(`SELECT details::text FROM audit_logs
                       WHERE entity_public_id = '${b.tid}'
                         AND action = 'TOURNAMENT_RESULT_OVERRIDDEN'`);
    expect(row, "reason recorded").toContain("forfeited");
    expect(row, "old value recorded alongside the new").toContain("oldChampionPublicId");

    await admin.dispose(); await su.dispose();
  });

  test("the override is refused without a reason, and to a plain ADMIN", async () => {
    const admin = await Api.login(config().a);
    const b = await build(admin, "OverrideGuards");
    const su = await Api.login(config().aSuperAdmin);

    // No reason.
    for (const bad of [{}, { reason: "" }, { reason: "   " }]) {
      const r = await su.raw("post", `/api/admin/cricket/tournaments/${b.tid}/declare-winner`,
        { winnerTeamPublicId: b.teams[0].publicId, ...bad });
      expect(r.status, `refused without a reason (${JSON.stringify(bad)})`).toBe(400);
    }

    // Right shape, wrong role. SecurityConfig lets ADMIN reach the endpoint, so
    // this is the service-layer check and nothing else.
    const asAdmin = await admin.raw("post",
      `/api/admin/cricket/tournaments/${b.tid}/declare-winner`, {
        winnerTeamPublicId: b.teams[0].publicId,
        reason: "I would like to win",
      });
    expect(asAdmin.status, "ADMIN is refused the override").toBe(403);

    // A team from another tournament is not a candidate.
    const other = await build(admin, "OverrideOther");
    const foreign = await su.raw("post",
      `/api/admin/cricket/tournaments/${b.tid}/declare-winner`, {
        winnerTeamPublicId: other.teams[0].publicId,
        reason: "wrong tournament",
      });
    expect(foreign.status, "a team from another tournament is refused").toBe(400);

    expect(await status(admin, b.tid), "nothing was written").toBe("DRAFT");
    expect(auditCount(b.tid, "TOURNAMENT_RESULT_OVERRIDDEN"), "no audit row").toBe(0);

    await admin.dispose(); await su.dispose();
  });

  // ── Result integration (Phase 10/14) — BUG-30 ───────────────────────────

  test("a match created from a fixture now counts towards the standings (BUG-30)",
    async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "Standings");

    await playFixture(b, 0, "WON_BY_RUNS");

    // The link the standings walk. Before BUG-30 only linkMatchToFixture wrote
    // it, so a match created *from* a fixture left it null for ever.
    expect(dbOne(`SELECT coalesce(match_id::text, 'NULL') FROM fixtures
                  WHERE public_id = '${b.fixturePublicId}'`),
      "fixtures.match_id is populated").not.toBe("NULL");

    const rows = (await api.raw("get",
      `/api/admin/cricket/tournaments/${b.tid}/standings`)).body as any[];

    const winner = rows.find((r) => r.teamPublicId === b.teams[0].publicId);
    const loser = rows.find((r) => r.teamPublicId === b.teams[1].publicId);

    // The whole symptom: both of these were 0 for every fixture-created match,
    // so the points table stayed empty however many games were played.
    expect(winner.played, "winner played 1").toBe(1);
    expect(winner.won, "winner won 1").toBe(1);
    expect(winner.points, "winner has the win points").toBe(2);
    expect(loser.played, "loser played 1").toBe(1);
    expect(loser.lost, "loser lost 1").toBe(1);
    expect(loser.points, "loser has the loss points").toBe(0);

    await api.dispose();
  });

  // ── Deletion, with the new links in place ───────────────────────────────

  test("a decided tournament can still be deleted", async () => {
    const admin = await Api.login(config().a);
    const b = await build(admin, "DeleteDecided");
    const su = await Api.login(config().aSuperAdmin);

    await su.raw("post", `/api/admin/cricket/tournaments/${b.tid}/declare-winner`, {
      winnerTeamPublicId: b.teams[0].publicId,
      runnerUpTeamPublicId: b.teams[1].publicId,
      reason: "checking the delete path",
    });

    // champion_team_id and runner_up_team_id are FKs into tournament_teams, and
    // deleteTournament removes those teams in their own statement — so without
    // releasing the links first this is a constraint violation, not a delete.
    const del = await admin.raw("delete", `/api/admin/cricket/tournaments/${b.tid}`);
    expect(del.status, "delete succeeds").toBeLessThan(400);

    expect(dbCount(`SELECT count(*) FROM tournaments WHERE public_id = '${b.tid}'`),
      "tournament is gone").toBe(0);

    await admin.dispose(); await su.dispose();
  });

  // ── Cross-tenant ────────────────────────────────────────────────────────

  test("Academy B is refused every one of A's new endpoints", async () => {
    const a = await Api.login(config().a);
    const b2 = await Api.login(config().b);
    const b = await build(a, "CrossTenant");

    const calls: Array<[string, "get" | "post" | "patch", string, unknown]> = [
      ["status",        "patch", `/api/admin/cricket/tournaments/${b.tid}/status`,
        { status: "UPCOMING" }],
      ["result",        "get",   `/api/admin/cricket/tournaments/${b.tid}/result`, undefined],
      ["declare-winner","post",  `/api/admin/cricket/tournaments/${b.tid}/declare-winner`,
        { winnerTeamPublicId: b.teams[0].publicId, reason: "not mine to decide" }],
      ["mark-final",    "patch",
        `/api/admin/cricket/tournaments/${b.tid}/fixtures/${b.fixturePublicId}/final`,
        { isFinal: true }],
    ];

    for (const [label, method, url, body] of calls) {
      const r = await b2.raw(method, url, body);
      // declare-winner is SUPER_ADMIN-only, so B's ADMIN is refused on role
      // before scoping is even reached; either way it must not succeed or leak.
      expect([403, 404], `B on A's ${label}`).toContain(r.status);
    }

    // A's tournament is untouched.
    expect(await status(a, b.tid), "status unchanged").toBe("DRAFT");
    expect(dbCount(`SELECT count(*) FROM fixtures f
                    JOIN tournaments t ON t.id = f.tournament_id
                    WHERE t.public_id = '${b.tid}' AND f.is_final`),
      "no fixture was marked").toBe(0);
    expect(auditCount(b.tid, "TOURNAMENT_STATUS_CHANGED"), "nothing audited").toBe(0);

    // And the correct-tenant actor still works.
    expect((await a.raw("get", `/api/admin/cricket/tournaments/${b.tid}/result`)).status).toBe(200);

    await a.dispose(); await b2.dispose();
  });
});
