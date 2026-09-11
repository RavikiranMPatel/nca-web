import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createKitPlayers, type KitFixture } from "../fixtures/kitPlayers";
import { dbExec, dbOne } from "../fixtures/db";

/**
 * BUG-34 — the BUG-31 family, audited across both repos.
 *
 * Lombok generates `isX()` for a primitive `boolean isX`, so Jackson strips the
 * prefix and the wire key is `x`. A boxed `Boolean isX` gets `getIsX()` and keeps
 * `isX`. That is why the trap catches some fields and not the one beside them.
 *
 * `BooleanJsonKeyTest` guards the DTO classes at the unit level. What only a live
 * call can show is that the payload the browser actually receives has the keys the
 * browser actually reads — and, for the playing XI, that a round trip through the
 * UI's own code path no longer destroys data.
 *
 * Assertions here are on KEYS and on round-tripped VALUES. A bare value assertion
 * would have passed throughout the bug: `undefined` and `false` are both falsy.
 *
 * Desktop only — a JSON contract is not viewport-dependent.
 */

const RUN = `${Date.now() % 1000000}`;

const XI = (prefix: string) =>
  Array.from({ length: 11 }, (_, i) => ({
    externalName: `${prefix}${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isWicketkeeper: i === 5,
    isImpactPlayer: i === 7,
    isForeign: i === 3,
  }));

async function setupMatch(api: Api) {
  const match = await api.createMatch({
    title: `B34-${RUN}-${Math.random().toString(36).slice(2, 8)}`,
    matchDate: new Date().toISOString().slice(0, 10),
    matchType: "INTERNAL",
    totalOvers: 20,
    venue: "B34 Ground",
  });
  await api.setTeams(match.publicId, {
    teamAName: "Alpha", teamBName: "Beta",
    teamAPlayers: XI("A"), teamBPlayers: XI("B"),
  });
  return match.publicId as string;
}

test.describe("BUG-34 — JSON boolean keys on the wire", () => {

  test("playing XI sends isCaptain, not captain", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "JSON contract, not viewport-dependent");
    const api = await Api.login(config().a);
    const id = await setupMatch(api);
    try {
      const teams = await api.getTeams(id);
      const xi = await api.getXI(id, teams[0].publicId);
      const raw = JSON.stringify(xi[0]);

      for (const k of ["isCaptain", "isWicketkeeper", "isImpactPlayer", "isForeign",
                       "isSubstitutedOut", "isSubstitute", "isFieldingSubstitute"]) {
        expect(raw, `${k} must be on the wire`).toContain(`"${k}"`);
      }
      // The stripped forms must be gone, or both spellings would be live at once
      // and a later reader could pick either.
      for (const k of ["captain", "wicketkeeper", "impactPlayer", "foreign",
                       "substitutedOut", "substitute", "fieldingSubstitute"]) {
        expect(raw, `stripped key "${k}" must not be on the wire`).not.toContain(`"${k}":`);
      }
      // ...and the flags are readable by the key the frontend uses.
      expect(xi.filter((p: any) => p.isCaptain).length, "exactly one captain").toBe(1);
      expect(xi.filter((p: any) => p.isWicketkeeper).length, "exactly one keeper").toBe(1);
      expect(xi.filter((p: any) => p.isForeign).length, "exactly one overseas player").toBe(1);
      expect(xi.filter((p: any) => p.isImpactPlayer).length, "exactly one impact player").toBe(1);
    } finally {
      await api.deleteMatch(id);
      await api.dispose();
    }
  });

  /**
   * The defect this closes: MatchReportPage's "Edit Playing XI" rebuilt the picker
   * from `p.isCaptain ?? false` over a payload whose key was `captain`, so every
   * flag read `false` and saving wrote that back. Opening the modal and pressing
   * Save — changing nothing — cleared captain, keeper, impact and overseas on both
   * sides. Measured before the fix as 1/1/1/1 in, 0/0/0/0 out.
   */
  test("Edit Playing XI round trip preserves the flags", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "JSON contract, not viewport-dependent");
    const api = await Api.login(config().a);
    const id = await setupMatch(api);
    try {
      const teams = await api.getTeams(id);
      const beforeA = await api.getXI(id, teams[0].publicId);
      const beforeB = await api.getXI(id, teams[1].publicId);

      // MatchReportPage.handleEditPlayingXI, verbatim (src/pages/scoring/MatchReportPage.tsx:604)
      const rebuild = (xs: any[]) => xs.map((p: any, i: number) => ({
        playerPublicId: p.playerPublicId ?? "",
        externalName: p.playerPublicId ? undefined : p.displayName,
        battingOrder: p.battingOrder ?? i + 1,
        isCaptain: p.isCaptain ?? false,
        isWicketkeeper: p.isWicketkeeper ?? false,
        isImpactPlayer: p.isImpactPlayer ?? false,
        isForeign: p.isForeign ?? false,
      }));
      await api.setTeams(id, {
        teamAName: "Alpha", teamBName: "Beta",
        teamAPlayers: rebuild(beforeA), teamBPlayers: rebuild(beforeB),
      });

      // setTeams rebuilds both CricketTeam rows, so the publicIds change.
      const teams2 = await api.getTeams(id);
      const afterA = await api.getXI(id, teams2[0].publicId);

      const count = (xs: any[], k: string) => xs.filter((p: any) => p[k]).length;
      for (const k of ["isCaptain", "isWicketkeeper", "isImpactPlayer", "isForeign"]) {
        expect(count(afterA, k), `${k} survived the round trip`).toBe(count(beforeA, k));
        expect(count(afterA, k), `${k} is still set at all`).toBe(1);
      }
      // The flags are on the same players, not merely the same count.
      const named = (xs: any[], k: string) =>
        xs.filter((p: any) => p[k]).map((p: any) => p.displayName).sort();
      for (const k of ["isCaptain", "isWicketkeeper", "isImpactPlayer", "isForeign"]) {
        expect(named(afterA, k), `${k} on the same player`).toEqual(named(beforeA, k));
      }
    } finally {
      await api.deleteMatch(id);
      await api.dispose();
    }
  });

  /**
   * `/scoring/this-over` returned the Delivery entity, whose primitive isWicket
   * serialised as `wicket` — so LiveScorerPage's `mapToBallDTO` read undefined and
   * the over strip rendered a wicket ball as its run count instead of "W".
   */
  test("this-over sends isWicket and no entity internals", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "JSON contract, not viewport-dependent");
    const api = await Api.login(config().a);
    const id = await setupMatch(api);
    try {
      const teams = await api.getTeams(id);
      await api.toss(id, { winnerTeamPublicId: teams[0].publicId, decision: "BAT" });
      await api.start(id);
      const bat = await api.getXI(id, teams[0].publicId);
      const bowl = await api.getXI(id, teams[1].publicId);
      await api.selectBatter(id, bat[0].mtpPublicId, "striker");
      await api.selectBatter(id, bat[1].mtpPublicId, "nonstriker");
      await api.correctBowler(id, bowl[0].mtpPublicId);

      const s = await api.state(id);
      await api.postBall(id, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        runsBatsman: 0,
        isWicket: true,
        dismissalType: "BOWLED",
        dismissedPlayerPublicId: s.currentStrikerPublicId!,
      });

      const over = await api.raw("get",
        `/api/admin/cricket/matches/${id}/scoring/this-over`);
      expect(over.status).toBe(200);
      const balls = over.body as any[];
      expect(balls.length, "one delivery in the over").toBe(1);
      const raw = JSON.stringify(balls[0]);

      expect(raw, "isWicket on the wire").toContain('"isWicket"');
      expect(raw, "isLegalBall on the wire").toContain('"isLegalBall"');
      expect(raw, "stripped key must be gone").not.toContain('"wicket":');
      expect(raw, "stripped key must be gone").not.toContain('"legalBall":');
      // This is what the over strip reads to decide whether to render "W".
      expect(balls[0].isWicket, "the wicket is visible to mapToBallDTO").toBe(true);

      // The raw entity used to send these to the browser on every over refresh.
      for (const leaked of ["academyId", "branchId", "createdBy", "updatedBy", "version"]) {
        expect(raw, `${leaked} must not reach the browser`).not.toContain(`"${leaked}"`);
      }
    } finally {
      await api.deleteMatch(id);
      await api.dispose();
    }
  });

  /**
   * Not a Lombok case — a hand-built Map that simply omitted the key on one side.
   * prepareMatchFromFixture put `isForeign` on the away squad and not the home one,
   * so MatchSetupPage flagged only half the overseas players.
   *
   * Note: nothing can set `tournament_team_squad.is_foreign` through the API today
   * (AddSquadPlayerRequest has no such field), so this was latent rather than
   * user-visible. The value is set directly here so the key is proven to carry a
   * true, not merely to exist.
   */
  test("prepare-match sends isForeign for the home squad, not only the away one",
    async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "JSON contract, not viewport-dependent");
    const api = await Api.login(config().a);
    let kit: KitFixture | null = null;
    let tid = "";
    try {
      kit = await createKitPlayers({ count: 2, label: `B34${RUN}` });
      const t = await api.raw("post", "/api/admin/cricket/tournaments", {
        name: `B34-${RUN}-prep`, format: "ROUND_ROBIN", venue: "B34 Ground",
        startDate: "2026-09-01", endDate: "2026-10-01",
        defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
      });
      expect(t.status).toBe(200);
      tid = (t.body as any).publicId;

      const teamIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`, {
          name: `B34 Side ${i} ${RUN}`, shortName: `B${i}`, colorHex: "#2563eb",
        });
        expect(r.status).toBe(200);
        teamIds.push((r.body as any).publicId);
      }
      for (let i = 0; i < 2; i++) {
        const r = await api.raw("post",
          `/api/admin/cricket/tournaments/${tid}/teams/${teamIds[i]}/squad`,
          { playerPublicId: kit.players[i].publicId, playerRole: "BATTER" });
        expect(r.status, `squad add ${i}: ${JSON.stringify(r.body)}`).toBe(200);
      }
      // No API sets this flag; drive it directly so the key carries a real value.
      dbExec(`UPDATE tournament_team_squad SET is_foreign = true
              WHERE tournament_team_id IN (
                SELECT id FROM tournament_teams WHERE public_id = '${teamIds[0]}')`);

      const g = await api.raw("post",
        `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
      expect(g.status, `generate: ${JSON.stringify(g.body)}`).toBe(200);
      const fixtures = g.body as any[];
      const played = fixtures.find((f) => f.homeTeam && f.awayTeam);
      expect(played, "a real pairing was generated").toBeTruthy();

      const prep = await api.raw("get",
        `/api/admin/cricket/tournaments/${tid}/fixtures/${played.publicId}/prepare-match`);
      expect(prep.status, `prepare: ${JSON.stringify(prep.body)}`).toBe(200);
      const body = prep.body as any;

      for (const side of ["homeTeam", "awayTeam"]) {
        for (const p of body[side].squad) {
          expect(Object.keys(p), `${side} squad entry carries isForeign`)
            .toContain("isForeign");
        }
      }
      // The side whose flag was set is the home side of this fixture, or the away
      // one — either way exactly one of the two squads reports it.
      const flagged = [...body.homeTeam.squad, ...body.awayTeam.squad]
        .filter((p: any) => p.isForeign);
      expect(flagged.length, "the overseas player is reported, whichever side it is on")
        .toBe(1);
    } finally {
      if (tid) {
        dbExec(`DELETE FROM fixtures WHERE tournament_id IN
                (SELECT id FROM tournaments WHERE public_id = '${tid}')`);
        dbExec(`DELETE FROM tournament_team_squad WHERE tournament_team_id IN
                (SELECT id FROM tournament_teams WHERE tournament_id IN
                 (SELECT id FROM tournaments WHERE public_id = '${tid}'))`);
        dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN
                (SELECT id FROM tournaments WHERE public_id = '${tid}')`);
        dbExec(`DELETE FROM tournaments WHERE public_id = '${tid}'`);
      }
      if (kit) await kit.destroy();
      await api.dispose();
    }
  });
});
