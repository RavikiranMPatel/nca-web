import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount } from "../fixtures/db";

/**
 * BUG-48 — a real ROLE_COACH token is refused every tournament write, and the
 * tournament is unchanged afterwards.
 *
 * This is the HTTP half of the fix. It is worth being honest about what it can
 * and cannot show: it passed BEFORE the service-layer checks existed, because
 * `SecurityConfig`'s `/api/admin/**` rule answers before any controller runs.
 * That is precisely the finding — the 403 was arriving from one place, and
 * `.claude/rules/multi-tenancy.md` says a write may not depend on a single
 * control. `TournamentWriteRoleCheckTest` is the half that fails without the
 * fix; this is the half that proves the route still refuses a coach, so the two
 * controls are both present rather than one having replaced the other.
 *
 * Desktop only. `AuthController` rotates `tokenVersion` on every non-admin
 * login, so three projects authenticating as the same coach race and the first
 * token starts answering 401 — the hazard SESSION-HANDOFF records.
 */

let admin: Api;
let coach: Api;
let tournamentPublicId: string;
let teamPublicId: string;
const TAG = String(Math.floor(Math.random() * 90000000) + 10000000);
const NAME = `RoleGate ${TAG}`;

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  admin = await Api.login(config().a);

  const t = await admin.raw("post", "/api/admin/cricket/tournaments", {
    name: NAME, format: "ROUND_ROBIN", venue: `${NAME} Ground`,
    startDate: "2026-03-01", endDate: "2026-04-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(t.status, "create the tournament to attack").toBe(200);
  tournamentPublicId = (t.body as any).publicId;

  const team = await admin.raw("post",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/teams`,
    { name: `Side ${TAG}`, shortName: "SID", colorHex: "#2563eb" });
  expect(team.status, "one team, so removeTeam has a target").toBe(200);
  teamPublicId = (team.body as any).publicId;

  coach = await Api.login(config().aCoach);
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  await coach?.dispose();
  if (tournamentPublicId) {
    await admin.raw("delete",
      `/api/admin/cricket/tournaments/${tournamentPublicId}`, {}).catch(() => {});
  }
  await admin?.dispose();
});

test.describe("BUG-48 — tournament writes refuse a coach", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop",
      "one coach token per run — concurrent logins rotate tokenVersion");
  });

  test("every write endpoint refuses a real coach token", async () => {
    const T = () => `/api/admin/cricket/tournaments/${tournamentPublicId}`;

    const writes: [string, string, Record<string, unknown>][] = [
      ["post",   `${T()}/teams`, { name: `Coach ${TAG}`, shortName: "CCH", colorHex: "#ff0000" }],
      ["delete", `${T()}/teams/${teamPublicId}`, {}],
      ["post",   `${T()}/teams/${teamPublicId}/squad`, { playerPublicId: "NOPE", playerRole: "ALL_ROUNDER" }],
      ["post",   `${T()}/fixtures/generate`, {}],
      ["delete", `${T()}/fixtures`, {}],
      ["post",   `${T()}/advance-knockout`, {}],
      ["patch",  `${T()}/settings`, { oversPerInnings: 5, minsPerOver: 4,
                                      inningsBreakMins: 10, groundGapMins: 30,
                                      dayStartTime: "08:00:00", dayEndTime: "20:00:00",
                                      maxMatchesPerDay: 9 }],
      ["put",    T(), { name: `Hijacked ${TAG}`, format: "ROUND_ROBIN",
                        venue: "x", startDate: "2026-03-01", endDate: "2026-04-01",
                        defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1 }],
    ];

    for (const [method, url, body] of writes) {
      const r = await coach.raw(method as never, url, body);
      expect([401, 403, 404],
        `${method.toUpperCase()} ${url.replace(tournamentPublicId, "<t>")} must refuse a coach, got ${r.status}`)
        .toContain(r.status);
    }
  });

  test("nothing a coach sent changed the tournament", async () => {
    // Still under its own name — the PUT tried to rename it to "Hijacked".
    expect(dbCount(`SELECT COUNT(*) FROM tournaments WHERE name = '${NAME}'`),
      "the tournament keeps its name").toBe(1);
    expect(dbCount(`SELECT COUNT(*) FROM tournaments WHERE name = 'Hijacked ${TAG}'`),
      "the coach's PUT did not rename it").toBe(0);

    // The settings PATCH asked for 5 overs and 9 matches a day.
    expect(dbOne(`SELECT COALESCE(overs_per_innings::text, 'null') FROM tournaments
                  WHERE name = '${NAME}'`),
      "oversPerInnings is not what the coach asked for").not.toBe("5");

    expect(dbCount(`SELECT COUNT(*) FROM tournament_teams tt
                    JOIN tournaments t ON t.id = tt.tournament_id WHERE t.name = '${NAME}'`),
      "the coach neither added nor removed a team").toBe(1);

    expect(dbCount(`SELECT COUNT(*) FROM fixtures f
                    JOIN tournaments t ON t.id = f.tournament_id WHERE t.name = '${NAME}'`),
      "the coach generated no fixtures").toBe(0);
  });
});
