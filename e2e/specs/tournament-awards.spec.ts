import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbCount, dbExec, dbOne } from "../fixtures/db";
import { createScoredTournament, SCORED, type ScoredTournament } from "../fixtures/scoredTournament";

/**
 * Slice 5, Phases 15 and 16 — Man of the Match, Man of the Series, and the
 * configurable additional awards.
 *
 * Four things this proves that a shape assertion would not:
 *
 *  - candidates for a Man of the Match are the two XIs of THAT match, with the
 *    figures those players actually produced, so the opener comes back on 12 off
 *    3 rather than merely being present in a list;
 *  - an award cannot name a player who is not in the team it names;
 *  - giving the same award twice REPLACES it rather than creating a second, and
 *    the audit row carries the old holder as well as the new one — which is what
 *    Phase 15's "allow authorized editing with audit" actually asks for;
 *  - Academy B is refused every endpoint and writes nothing.
 *
 * Desktop only: this is an API contract. The tab that drives it is covered on
 * both viewports by tournament-dashboard-ui.spec.ts.
 */

let s: ScoredTournament;

// The whole file is desktop-only, so the fixture is built only for desktop.
// Without this guard beforeAll still runs for iPhone 14 and Pixel 7 even though
// every test in them skips — three scored tournaments instead of one, built
// concurrently, and the database assertions below then see each other's rows.
test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  s = await createScoredTournament({ label: "Awards" });
});

test.afterAll(async () => {
  if (s) await s.destroy();
  // Award audit rows are keyed by the AWARD's public id, not the tournament's, so
  // the fixture's teardown cannot find them — and a revoked award leaves one with
  // no row left to join back to at all. This spec is the only producer of
  // TournamentAward audit rows in the test database, so clearing them by type is
  // both safe and the only thing that reaches the orphans.
  dbExec(`DELETE FROM audit_logs WHERE entity_type = 'TournamentAward'`);
});

const base = () => `/api/admin/cricket/tournaments/${s.tournamentPublicId}`;

const auditCount = (action: string) =>
  dbCount(`SELECT count(*) FROM audit_logs
           WHERE action = '${action}' AND entity_type = 'TournamentAward'`);

/** Award rows belonging to THIS tournament — never a global count, since other
 *  specs create tournaments of their own at the same time. */
const awardCount = (where = "TRUE") =>
  dbCount(`SELECT count(*) FROM tournament_awards a
           JOIN tournaments t ON t.id = a.tournament_id
           WHERE t.public_id = '${s.tournamentPublicId}' AND ${where}`);

test.describe("Slice 5 — tournament awards", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "an API contract");
  });

  // ── PHASE 15 — candidates ───────────────────────────────────────────────

  test("Man of the Match candidates are the two XIs, with that match's figures", async () => {
    const r = await s.api.raw("get", `${base()}/matches/${s.matchPublicId}/award-candidates`);
    expect(r.status).toBe(200);
    const candidates = r.body as any[];

    expect(candidates.length, "eleven a side, and nobody else").toBe(22);

    const opener = candidates.find((c) => c.playerName === s.opener.displayName);
    expect(opener, "the opener is a candidate").toBeTruthy();
    expect(opener.runs).toBe(SCORED.openerRuns);
    expect(opener.balls).toBe(SCORED.openerBalls);
    expect(opener.fours).toBe(SCORED.openerFours);
    expect(opener.strikeRate).toBe(SCORED.openerStrikeRate);
    expect(opener.notOut).toBe(true);
    expect(opener.teamName).toContain("Home");

    const bowler = candidates.find((c) => c.playerName === s.wicketTaker.displayName);
    expect(bowler.wickets).toBe(1);
    expect(bowler.runsConceded).toBe(2);
    expect(bowler.overs).toBe("0.2");

    const catcher = candidates.find((c) => c.playerName === s.catcher.displayName);
    expect(catcher.catches).toBe(1);

    // A player who did nothing is still offered — dropping them would make the
    // award unofferable to anyone who batted at eleven.
    const idle = candidates.filter((c) => c.runs === 0 && c.wickets === 0 && c.catches === 0);
    expect(idle.length, "most of both XIs did nothing and are still candidates")
      .toBeGreaterThan(15);

    // Ordered by impact, so the list opens on the people worth considering.
    expect(candidates[0].impactPoints).toBeGreaterThanOrEqual(candidates[1].impactPoints);
  });

  test("tournament-level candidates carry tournament-wide figures", async () => {
    const r = await s.api.raw("get", `${base()}/awards/candidates`);
    expect(r.status).toBe(200);
    const candidates = r.body as any[];

    // Only players who actually appeared in a completed match.
    const opener = candidates.find((c) => c.playerName === s.opener.displayName);
    expect(opener.runs).toBe(SCORED.openerRuns);
    const bowler = candidates.find((c) => c.playerName === s.wicketTaker.displayName);
    expect(bowler.wickets).toBe(1);
  });

  test("the award slots say which awards exist and which are unfilled", async () => {
    const r = await s.api.raw("get", `${base()}/awards/slots`);
    expect(r.status).toBe(200);
    const slots = r.body as any[];

    const types = slots.map((x) => x.awardType);
    expect(types, "Phase 16's list, Man of the Match excluded — it is per match")
      .toEqual([
        "MAN_OF_THE_SERIES", "BEST_BATTER", "BEST_BOWLER", "BEST_FIELDER",
        "EMERGING_PLAYER", "PLAYER_OF_TOURNAMENT", "BEST_CATCH", "BEST_PERFORMANCE",
      ]);
    expect(slots.find((x) => x.awardType === "BEST_BOWLER").candidateSource).toBe("BOWLING");
    expect(slots.find((x) => x.awardType === "BEST_FIELDER").candidateSource).toBe("FIELDING");
    expect(slots.find((x) => x.awardType === "MAN_OF_THE_SERIES").candidateSource)
      .toBe("ALL_ROUND");
    expect(slots.every((x) => x.award === null), "nothing given yet").toBe(true);
  });

  // ── PHASE 15 — giving, editing, auditing ────────────────────────────────

  test("Man of the Match is stored in full, and editing it audits old and new", async () => {
    // Deltas, not absolutes: audit history outlives the entity by design here, so
    // an absolute count makes the spec depend on what ran before it.
    const givenBefore = auditCount("TOURNAMENT_AWARD_GIVEN");
    const updatedBefore = auditCount("TOURNAMENT_AWARD_UPDATED");

    const give = await s.api.raw("post", `${base()}/awards`, {
      awardType: "MAN_OF_THE_MATCH",
      playerPublicId: s.opener.publicId,
      teamPublicId: s.homeTeamPublicId,
      matchPublicId: s.matchPublicId,
      reason: "12* off 3 with three fours",
    });
    expect(give.status).toBe(200);
    const award = give.body as any;

    expect(award.awardType).toBe("MAN_OF_THE_MATCH");
    expect(award.awardLabel).toBe("Man of the Match");
    expect(award.playerName).toBe(s.opener.displayName);
    expect(award.teamPublicId).toBe(s.homeTeamPublicId);
    expect(award.matchPublicId).toBe(s.matchPublicId);
    expect(award.reason).toBe("12* off 3 with three fours");
    expect(award.awardedByName, "who gave it").toBeTruthy();
    expect(award.awardedAt, "when").toBeTruthy();
    expect(JSON.stringify(award), "no tenant column").not.toContain('"academyId"');

    expect(auditCount("TOURNAMENT_AWARD_GIVEN"), "one audit row").toBe(givenBefore + 1);

    // ── editing: the same slot, a different player ──
    const edit = await s.api.raw("post", `${base()}/awards`, {
      awardType: "MAN_OF_THE_MATCH",
      playerPublicId: s.wicketTaker.publicId,
      teamPublicId: s.homeTeamPublicId,
      matchPublicId: s.matchPublicId,
      reason: "1/2 and the breakthrough",
    });
    expect(edit.status).toBe(200);
    expect((edit.body as any).playerName).toBe(s.wicketTaker.displayName);
    expect((edit.body as any).publicId, "the same award, not a second one")
      .toBe(award.publicId);

    expect(awardCount("a.award_type = 'MAN_OF_THE_MATCH'"),
      "still exactly one Man of the Match").toBe(1);
    expect(auditCount("TOURNAMENT_AWARD_UPDATED"), "the edit is audited")
      .toBe(updatedBefore + 1);

    // The audit carries who it was taken FROM, not just who it went to.
    const details = dbOne(`SELECT details::text FROM audit_logs
                           WHERE action = 'TOURNAMENT_AWARD_UPDATED'
                           ORDER BY created_at DESC LIMIT 1`);
    expect(details, "old holder recorded").toContain(s.opener.displayName);
    expect(details, "new holder recorded").toContain(s.wicketTaker.displayName);
  });

  test("Man of the Series and a configurable award both store and appear", async () => {
    for (const type of ["MAN_OF_THE_SERIES", "BEST_BOWLER"]) {
      const r = await s.api.raw("post", `${base()}/awards`, {
        awardType: type,
        playerPublicId: s.wicketTaker.publicId,
        teamPublicId: s.homeTeamPublicId,
        reason: `${type} for the only wicket of the tournament`,
      });
      expect(r.status, type).toBe(200);
      expect((r.body as any).matchPublicId, "a series award names no match").toBeNull();
    }

    const slots = await s.api.raw("get", `${base()}/awards/slots`);
    const filled = (slots.body as any[]).filter((x) => x.award !== null);
    expect(filled.map((x) => x.awardType).sort())
      .toEqual(["BEST_BOWLER", "MAN_OF_THE_SERIES"]);

    const list = await s.api.raw("get", `${base()}/awards`);
    expect((list.body as any[]).length, "the two series awards and the Man of the Match")
      .toBe(3);
  });

  // ── the refusals ────────────────────────────────────────────────────────

  test("an award cannot name a player outside the team, or misuse the match field", async () => {
    // A player from the OTHER side, named against the home team.
    const awaySquadPlayer = (await s.api.raw(
      "get", `${base()}/matches/${s.matchPublicId}/award-candidates`))
      .body.find((c: any) => c.teamName.includes("Away"));

    const wrongTeam = await s.api.raw("post", `${base()}/awards`, {
      awardType: "BEST_BATTER",
      playerPublicId: awaySquadPlayer.playerPublicId,
      teamPublicId: s.homeTeamPublicId,
      reason: "not in that squad",
    });
    expect(wrongTeam.status, "player is not in the named team").toBe(404);

    // A tournament award may not name a match...
    const strayMatch = await s.api.raw("post", `${base()}/awards`, {
      awardType: "BEST_BATTER",
      playerPublicId: s.opener.publicId,
      teamPublicId: s.homeTeamPublicId,
      matchPublicId: s.matchPublicId,
      reason: "belongs to the tournament",
    });
    expect(strayMatch.status).toBe(400);

    // ...and a Man of the Match must.
    const missingMatch = await s.api.raw("post", `${base()}/awards`, {
      awardType: "MAN_OF_THE_MATCH",
      playerPublicId: s.opener.publicId,
      teamPublicId: s.homeTeamPublicId,
      reason: "which match?",
    });
    expect(missingMatch.status).toBe(400);

    const unknown = await s.api.raw("post", `${base()}/awards`, {
      awardType: "BEST_MOUSTACHE",
      playerPublicId: s.opener.publicId,
      teamPublicId: s.homeTeamPublicId,
    });
    expect(unknown.status).toBe(400);

    expect(awardCount("a.award_type IN ('BEST_BATTER', 'BEST_MOUSTACHE')"),
      "none of the four refusals wrote a row").toBe(0);
  });

  test("a COACH cannot give an award", async () => {
    const coach = await Api.login(config().aCoach);
    const r = await coach.raw("post", `${base()}/awards`, {
      awardType: "BEST_FIELDER",
      playerPublicId: s.catcher.publicId,
      teamPublicId: s.homeTeamPublicId,
      reason: "a coach should not be able to do this",
    });
    expect([403, 404], "refused").toContain(r.status);
    expect(awardCount("a.award_type = 'BEST_FIELDER'"), "nothing written").toBe(0);
    await coach.dispose();
  });

  // ── CROSS-TENANT ────────────────────────────────────────────────────────

  test("Academy B is refused every award endpoint and writes nothing", async () => {
    const b = await Api.login(config().b);
    const beforeRows = awardCount();

    const reads = [
      `${base()}/awards`,
      `${base()}/awards/slots`,
      `${base()}/awards/candidates`,
      `${base()}/matches/${s.matchPublicId}/award-candidates`,
    ];
    for (const url of reads) {
      const r = await b.raw("get", url);
      expect(r.status, `B on A's ${url}`).toBe(404);
      expect(JSON.stringify(r.body ?? ""), "no name leaked")
        .not.toContain(s.opener.displayName);
    }

    const write = await b.raw("post", `${base()}/awards`, {
      awardType: "BEST_CATCH",
      playerPublicId: s.catcher.publicId,
      teamPublicId: s.homeTeamPublicId,
      reason: "not B's to give",
    });
    expect([403, 404], "B cannot give A's award").toContain(write.status);

    const existing = await s.api.raw("get", `${base()}/awards`);
    const anyAward = (existing.body as any[])[0];
    const revoke = await b.raw("delete", `${base()}/awards/${anyAward.publicId}`);
    expect([403, 404], "B cannot revoke A's award").toContain(revoke.status);

    expect(awardCount(), "row count unchanged").toBe(beforeRows);
    await b.dispose();
  });

  test("a match carrying a Man of the Match can still be deleted", async () => {
    // tournament_awards.match_id is NO ACTION by design (V103) — deleting a match
    // must not SILENTLY erase the award given in it — which means the match delete
    // is refused by the constraint unless deleteMatch removes the award rows
    // itself. It does, the same way it already handles innings_batting_stats and
    // innings_bowling_stats. Found by this spec's own teardown failing.
    const own = await createScoredTournament({ label: "AwardDelete" });
    try {
      const give = await own.api.raw("post",
        `/api/admin/cricket/tournaments/${own.tournamentPublicId}/awards`, {
          awardType: "MAN_OF_THE_MATCH",
          playerPublicId: own.opener.publicId,
          teamPublicId: own.homeTeamPublicId,
          matchPublicId: own.matchPublicId,
          reason: "about to be deleted along with its match",
        });
      expect(give.status).toBe(200);
      expect(dbCount(`SELECT count(*) FROM tournament_awards
                      WHERE public_id = '${(give.body as any).publicId}'`)).toBe(1);

      const del = await own.api.deleteMatch(own.matchPublicId);
      expect(del.status, "the match deletes cleanly").toBe(200);
      expect(dbCount(`SELECT count(*) FROM tournament_awards
                      WHERE public_id = '${(give.body as any).publicId}'`),
        "the award went with it").toBe(0);
    } finally {
      await own.destroy();
    }
  });

  // ── revoke, last so it does not disturb the counts above ────────────────

  test("revoking an award removes it and audits what was removed", async () => {
    const list = await s.api.raw("get", `${base()}/awards`);
    const target = (list.body as any[]).find((a) => a.awardType === "BEST_BOWLER");
    expect(target, "BEST_BOWLER was given earlier in this spec").toBeTruthy();

    const r = await s.api.raw("delete", `${base()}/awards/${target.publicId}`);
    expect(r.status).toBe(204);

    expect(dbCount(`SELECT count(*) FROM tournament_awards
                    WHERE public_id = '${target.publicId}'`), "gone").toBe(0);
    expect(auditCount("TOURNAMENT_AWARD_REVOKED"), "audited").toBeGreaterThan(0);

    const details = dbOne(`SELECT details::text FROM audit_logs
                           WHERE action = 'TOURNAMENT_AWARD_REVOKED'
                           ORDER BY created_at DESC LIMIT 1`);
    expect(details, "says who lost it").toContain(s.wicketTaker.displayName);
  });
});
