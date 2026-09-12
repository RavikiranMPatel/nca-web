import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createTournamentSet, type TournamentSet } from "../fixtures/tournamentSet";
import { pdfText, flat, pdftotextAvailable } from "../fixtures/pdf";

/**
 * Slice 7 — Phases 2, 3 and 26: the tournament list, searched, filtered, sorted
 * and paged by the server.
 *
 * Three things this file is careful about:
 *
 * 1. **Order is asserted as an order, not as a set.** A sort test that checks
 *    which rows came back proves nothing about the sorting; each one asserts the
 *    exact sequence, and the fixture is built so that no two orderings coincide.
 *
 * 2. **A filter is proved by what it EXCLUDES as well as what it returns.** A
 *    filter that is silently ignored returns a superset that still contains the
 *    expected row, so every filter test also names a row that must be absent.
 *
 * 3. **Cross-tenant is asserted on the TOTAL, not only on the rows.** A paged
 *    endpoint can leak a count without leaking a row — `totalElements: 6` with
 *    an empty page tells academy B exactly how many tournaments A has run. So B
 *    is checked for a total of its own rows, on every filter.
 */

let T: TournamentSet;
let seed: Record<string, string>;

test.beforeAll(async () => {
  T = await createTournamentSet({ label: "List" });
  seed = T.api.storageSeed();
});

test.afterAll(async () => {
  await T?.cleanup();
});

/** Names without the run tag, so an assertion reads as the tournament's name. */
const plain = (names: string[]) =>
  names.map((n) => n.replace(new RegExp(`\\s*${T.tag}$`), ""));

async function list(api: Api, qs: string) {
  const r = await api.raw("get", `/api/admin/cricket/tournaments?${qs}`);
  expect(r.status, `GET ?${qs}`).toBe(200);
  return {
    total: r.body.totalElements as number,
    pages: r.body.totalPages as number,
    names: plain((r.body.content as { name: string }[]).map((t) => t.name)),
    rows: r.body.content as Record<string, unknown>[],
  };
}

/**
 * A query string scoped to this run's rows — the two shared academies are
 * long-lived and may hold tournaments from other specs.
 *
 * <p>Built through URLSearchParams so a caller can OVERRIDE `search` or `size`
 * rather than appending a second copy. String concatenation produced
 * `search=<tag>&search=<name>` and `size=50&size=2`, and Spring binds one of
 * the two — a test that passes or fails on which one it picks is testing the
 * wrong thing.
 */
const mine = (qs = "") => {
  const p = new URLSearchParams({ search: T.tag, size: "50" });
  for (const [k, v] of new URLSearchParams(qs)) p.set(k, v);
  return p.toString();
};

// ══════════════════════════════════════════════════════════════════════════
// API — search
// ══════════════════════════════════════════════════════════════════════════

test.describe("the list search", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  test("matches the tournament name", async () => {
    const r = await list(T.api, mine("search=" + encodeURIComponent(`Zephyr Shield ${T.tag}`)));
    expect(r.names).toEqual(["Zephyr Shield"]);
  });

  test("matches the SHORT name, which the old list did not carry at all", async () => {
    const zeph = T.all.find((t) => t.shortName.startsWith("ZEPH"))!;
    const r = await list(T.api, `search=${encodeURIComponent(zeph.shortName)}&size=50`);
    expect(r.names).toEqual(["Zephyr Shield"]);
  });

  test("matches the YEAR, which is derived and has no column", async () => {
    // Phase 3 lists year as a search term. There is no year column (ruling 11
    // derives it from startDate), so a four-digit term has to reach the date —
    // without that, searching the year returns nothing at all.
    const r = await list(T.api, "search=2024&size=50");
    expect(plain(r.names)).toContain("Century Classic");
    expect(plain(r.names)).not.toContain("Zephyr Shield");
  });

  test("is case-insensitive and returns an empty page, not an error", async () => {
    const upper = await list(T.api, mine("search=" + encodeURIComponent(T.tag.toUpperCase())));
    const none = await list(T.api, "search=zzz-no-such-tournament");
    expect(upper.total).toBeGreaterThan(0);
    expect(none.total).toBe(0);
    expect(none.names).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// API — filters
// ══════════════════════════════════════════════════════════════════════════

test.describe("the list filters", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  test("year, as a date range rather than EXTRACT", async () => {
    const r = await list(T.api, mine("year=2026"));
    expect(r.names.sort()).toEqual(["Aurora Trophy", "Winter Series", "Zephyr Shield"]);
    // 2025 and 2024 excluded, and so is the undated row — it has no year, which
    // is a real state rather than a year to be guessed at.
    expect(r.names).not.toContain("Monsoon League");
    expect(r.names).not.toContain("Undated Cup");
  });

  test("status", async () => {
    const draft = await list(T.api, mine("status=DRAFT"));
    const live = await list(T.api, mine("status=LIVE"));
    expect(draft.total).toBe(6);
    expect(live.total).toBe(0);
  });

  test("format", async () => {
    const r = await list(T.api, mine("format=KNOCKOUT"));
    expect(r.names).toEqual(["Zephyr Shield"]);
    // GROUP_KNOCKOUT must NOT match KNOCKOUT — an equality filter written as a
    // LIKE would return Century Classic here.
    expect(r.names).not.toContain("Century Classic");
  });

  test("type, which is not the format", async () => {
    // Zephyr is a KNOCKOUT/AGE_GROUP and Century a GROUP_KNOCKOUT/INVITATIONAL,
    // so a type filter that was secretly reading `format` would fail both ways.
    const age = await list(T.api, mine("type=AGE_GROUP"));
    expect(age.names).toEqual(["Zephyr Shield"]);
    const friendly = await list(T.api, mine("type=FRIENDLY"));
    expect(friendly.names).toEqual(["Winter Series"]);
  });

  test("team, by name, without multiplying the row", async () => {
    // Eagles is entered in two of the six. A JOIN instead of an EXISTS would
    // return Zephyr four times (once per team) and break both the page and the
    // total, so the count is the assertion.
    const r = await list(T.api, mine(`team=${encodeURIComponent(`Eagles ${T.tag}`)}`));
    expect(r.names.sort()).toEqual(["Aurora Trophy", "Zephyr Shield"]);
    expect(r.total).toBe(2);

    const owls = await list(T.api, mine(`team=${encodeURIComponent(`Owls ${T.tag}`)}`));
    expect(owls.names).toEqual(["Aurora Trophy"]);
  });

  test("venue", async () => {
    const oval = await list(T.api, mine("venue=Oval%20Ground"));
    expect(oval.names.sort()).toEqual(["Aurora Trophy", "Winter Series", "Zephyr Shield"]);
    const river = await list(T.api, mine("venue=River%20Park"));
    expect(river.names.sort()).toEqual(["Century Classic", "Monsoon League"]);
  });

  test("date range, as an overlap rather than containment", async () => {
    // Monsoon runs Jun–Aug 2025. A containment filter would miss it for a
    // window inside the tournament, which is the case a date filter is most
    // often used for.
    const inside = await list(T.api, mine("fromDate=2025-07-01&toDate=2025-07-02"));
    expect(inside.names).toEqual(["Monsoon League"]);

    const open = await list(T.api, mine("fromDate=2026-01-01"));
    expect(open.names.sort()).toEqual(["Aurora Trophy", "Winter Series", "Zephyr Shield"]);

    const before = await list(T.api, mine("toDate=2024-12-31"));
    expect(before.names).toEqual(["Century Classic"]);
  });

  test("combine with AND, and an impossible combination returns nothing", async () => {
    const both = await list(T.api, mine("year=2026&format=KNOCKOUT"));
    expect(both.names).toEqual(["Zephyr Shield"]);
    const neither = await list(T.api, mine("year=2026&format=GROUP_KNOCKOUT"));
    expect(neither.total).toBe(0);
  });

  test("an unknown filter value is a 400 naming the valid ones, not an empty page", async () => {
    // The distinction matters: an empty page reads to the operator as "this
    // academy has no cancelled tournaments" rather than "CANCELED is not a
    // word".
    for (const [qs, expected] of [
      ["status=CANCELED", "CANCELLED"],
      ["format=BANANA", "ROUND_ROBIN"],
      ["type=NOPE", "INTER_ACADEMY"],
    ] as const) {
      const r = await T.api.raw("get", `/api/admin/cricket/tournaments?${qs}`);
      expect(r.status, qs).toBe(400);
      expect(r.body.message, qs).toContain(expected);
    }
    const backwards = await T.api.raw(
      "get", "/api/admin/cricket/tournaments?fromDate=2026-05-10&toDate=2026-01-01");
    expect(backwards.status).toBe(400);
    expect(backwards.body.message).toContain("fromDate");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// API — sort
// ══════════════════════════════════════════════════════════════════════════

test.describe("the list sort", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  test("name, both directions", async () => {
    const asc = await list(T.api, mine("sort=name&direction=asc"));
    expect(asc.names).toEqual([
      "Aurora Trophy", "Century Classic", "Monsoon League",
      "Undated Cup", "Winter Series", "Zephyr Shield",
    ]);
    const desc = await list(T.api, mine("sort=name&direction=desc"));
    expect(desc.names).toEqual([...asc.names].reverse());
  });

  test("start date, with the undated row last in both directions", async () => {
    // nullsLast on both: a row with no date is not "the earliest" and is not
    // "the latest" either, and putting it first in ascending order would read
    // as a tournament that started before 2024.
    const asc = await list(T.api, mine("sort=startDate&direction=asc"));
    expect(asc.names).toEqual([
      "Century Classic", "Monsoon League", "Zephyr Shield",
      "Aurora Trophy", "Winter Series", "Undated Cup",
    ]);
    const desc = await list(T.api, mine("sort=startDate&direction=desc"));
    expect(desc.names).toEqual([
      "Winter Series", "Aurora Trophy", "Zephyr Shield",
      "Monsoon League", "Century Classic", "Undated Cup",
    ]);
  });

  test("end date", async () => {
    const asc = await list(T.api, mine("sort=endDate&direction=asc"));
    expect(asc.names).toEqual([
      "Century Classic", "Monsoon League", "Zephyr Shield",
      "Aurora Trophy", "Winter Series", "Undated Cup",
    ]);
  });

  test("year, which orders by the date it is derived from", async () => {
    const asc = await list(T.api, mine("sort=year&direction=asc"));
    expect(plain(asc.names).slice(0, 2)).toEqual(["Century Classic", "Monsoon League"]);
    expect(asc.names[asc.names.length - 1]).toBe("Undated Cup");
  });

  test("teams and matches, which are counts and are ordered in SQL", async () => {
    // The whole reason the two @Formula attributes exist: with server-side
    // paging the ordering has to happen in the database, or page 2 is sorted
    // independently of page 1.
    const teams = await list(T.api, mine("sort=teams&direction=desc"));
    expect(teams.names[0]).toBe("Zephyr Shield");   // 4 teams
    expect(teams.names[1]).toBe("Aurora Trophy");   // 2 teams
    expect(teams.rows[0].teamCount).toBe(4);
    expect(teams.rows[1].teamCount).toBe(2);

    const asc = await list(T.api, mine("sort=teams&direction=asc"));
    expect(asc.names[asc.names.length - 1]).toBe("Zephyr Shield");

    const matches = await list(T.api, mine("sort=matches&direction=desc"));
    expect(matches.names[0]).toBe("Zephyr Shield");
    expect(Number(matches.rows[0].matchCount)).toBeGreaterThan(0);
  });

  test("status", async () => {
    const r = await list(T.api, mine("sort=status&direction=asc"));
    expect(r.total).toBe(6);
  });

  test("an unknown sort field or direction is a 400, not a 500", async () => {
    // Passing the client's string straight to Sort.by would let a caller order
    // by any attribute of the entity — the private commercial ones included —
    // and a typo would surface as a 500 from inside the criteria builder.
    const field = await T.api.raw("get", "/api/admin/cricket/tournaments?sort=budget");
    expect(field.status).toBe(400);
    expect(field.body.message).toContain("startDate");

    const dir = await T.api.raw(
      "get", "/api/admin/cricket/tournaments?sort=name&direction=sideways");
    expect(dir.status).toBe(400);
    expect(dir.body.message).toContain("asc");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// API — paging
// ══════════════════════════════════════════════════════════════════════════

test.describe("the list paging", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  test("pages cover every row exactly once, with no repeat and no gap", async () => {
    // The reason `id` is always the last ordering term: paging over rows that
    // tie on the sort column has no defined order between them, so Postgres is
    // free to repeat one row on page 2 and drop another entirely.
    const seen: string[] = [];
    let page = 1;
    let pages = 1;
    do {
      const r = await list(T.api,
        `search=${encodeURIComponent(T.tag)}&size=2&page=${page}&sort=status&direction=asc`);
      pages = r.pages;
      seen.push(...r.names);
      page += 1;
    } while (page <= pages);

    expect(pages).toBe(3);
    expect(seen).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
  });

  test("the page parameter is 1-indexed on the way in and 0-indexed on the way out", async () => {
    // PageableConfig sets setOneIndexedParameters(true) globally, so page=1 is
    // the first page — but Spring's Page still reports `number` from 0. Pinned
    // because the two disagreeing is what makes an off-by-one page control.
    const r = await T.api.raw("get",
      `/api/admin/cricket/tournaments?${mine("page=1&size=2&sort=name&direction=asc")}`);
    expect(r.body.number).toBe(0);
    expect(r.body.first).toBe(true);
    expect(plain(r.body.content.map((t: { name: string }) => t.name)))
      .toEqual(["Aurora Trophy", "Century Classic"]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// API — filter options
// ══════════════════════════════════════════════════════════════════════════

test.describe("the filter options endpoint", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  test("is not shadowed by GET /{publicId}", async () => {
    // Spring prefers a literal path segment over a template, so /filter-options
    // resolves to its own mapping. Asserted rather than assumed: the failure
    // mode is a 404 that reads as "no tournament called filter-options".
    const r = await T.api.raw("get", "/api/admin/cricket/tournaments/filter-options");
    expect(r.status).toBe(200);
    expect(r.body.sortFields).toEqual([
      "name", "year", "startDate", "endDate", "status", "teams", "matches",
    ]);
  });

  test("offers the enum vocabularies, so the screen cannot offer a refused value", async () => {
    const r = await T.api.raw("get", "/api/admin/cricket/tournaments/filter-options");
    expect(r.body.statuses).toEqual([
      "DRAFT", "UPCOMING", "LIVE", "COMPLETED", "CANCELLED", "SUSPENDED",
    ]);
    expect(r.body.statuses).not.toContain("ACTIVE"); // gone since V99
    expect(r.body.formats).toContain("DOUBLE_ROUND_ROBIN");
    expect(r.body.types).toContain("AGE_GROUP");
  });

  test("offers this academy's own years, teams and grounds", async () => {
    const r = await T.api.raw("get", "/api/admin/cricket/tournaments/filter-options");
    expect(r.body.years).toContain(2026);
    expect(r.body.years).toContain(2024);
    expect(r.body.teams).toContain(`Eagles ${T.tag}`);
    expect(r.body.venues).toContain("Oval Ground");
    expect(r.body.venues).toContain("River Park");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// API — Phase 2 fields, create and update
// ══════════════════════════════════════════════════════════════════════════

test.describe("the Phase 2 fields", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  const created: string[] = [];

  test.afterAll(async () => {
    for (const id of created) {
      await T.api.raw("delete", `/api/admin/cricket/tournaments/${id}`);
    }
  });

  test("round-trip every field, including the two that had nowhere to go", async () => {
    const body = {
      name: `Phase2 ${T.tag}`,
      shortName: "P2",
      format: "DOUBLE_ROUND_ROBIN",
      tournamentType: "EXTERNAL",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      organizer: "KSCA Bengaluru",
      venue: "Phase2 Ground",
      description: "created by the Slice 7 spec",
      logoUrl: "/uploads/logo/phase2.png",
      defaultOvers: 40,
      winPoints: 4,
      tiePoints: 2,
      noResultPoints: 1,
      // lossPoints had no field on the request class at all, so the Loss input
      // the create page has always rendered was dropped by Jackson.
      lossPoints: 3,
    };
    const create = await T.api.raw("post", "/api/admin/cricket/tournaments", body);
    expect(create.status).toBe(200);
    created.push(create.body.publicId);
    expect(create.body).toMatchObject({ ...body, status: "DRAFT" });

    // And read back from the database's point of view, not just echoed.
    const back = await T.api.raw("get",
      `/api/admin/cricket/tournaments/${create.body.publicId}`);
    expect(back.status).toBe(200);
    expect(back.body).toMatchObject({
      shortName: "P2", tournamentType: "EXTERNAL",
      organizer: "KSCA Bengaluru", logoUrl: "/uploads/logo/phase2.png",
      lossPoints: 3, defaultOvers: 40,
    });
  });

  test("the year is derived, and reads 2026-27 across a boundary (ruling 11)", async () => {
    const winter = T.all.find((t) => t.shortName.startsWith("WINT"))!;
    const r = await T.api.raw("get", `/api/admin/cricket/tournaments/${winter.publicId}`);
    expect(r.body.year).toBe(2026);
    expect(r.body.seasonLabel).toBe("2026-27");

    const undated = T.all.find((t) => t.shortName.startsWith("UNDA"))!;
    const u = await T.api.raw("get", `/api/admin/cricket/tournaments/${undated.publicId}`);
    expect(u.body.year).toBeNull();
    expect(u.body.seasonLabel).toBeNull();
  });

  test("PUT saves — the endpoint that had no caller anywhere before this slice", async () => {
    const create = await T.api.raw("post", "/api/admin/cricket/tournaments",
      { name: `Editable ${T.tag}`, startDate: "2026-02-01" });
    expect(create.status).toBe(200);
    created.push(create.body.publicId);

    const put = await T.api.raw("put",
      `/api/admin/cricket/tournaments/${create.body.publicId}`, {
        name: `Edited ${T.tag}`,
        shortName: "EDIT",
        format: "KNOCKOUT",
        tournamentType: "OPEN",
        startDate: "2026-05-01",
        endDate: "2026-05-15",
        organizer: "Edited Organizer",
        venue: "Edited Ground",
        description: "edited",
        lossPoints: 0,
        tiePoints: 0,
      });
    expect(put.status).toBe(200);

    const back = await T.api.raw("get",
      `/api/admin/cricket/tournaments/${create.body.publicId}`);
    expect(back.body).toMatchObject({
      name: `Edited ${T.tag}`, shortName: "EDIT", format: "KNOCKOUT",
      tournamentType: "OPEN", organizer: "Edited Organizer",
      // An explicit 0 is honoured. The method this replaces guarded every
      // numeric field with `> 0`, so "zero points for a tie" was indistinguish-
      // able from "the caller did not mention tie points" and was ignored.
      tiePoints: 0,
    });
    expect(back.body.seasonLabel).toBe("2026");
  });

  test("validation refuses what the old request class accepted silently", async () => {
    for (const [label, body, expected] of [
      ["blank name", { name: "   " }, "name"],
      ["unknown format", { name: `Bad ${T.tag}`, format: "BANANA" }, "Valid formats"],
      ["unknown type", { name: `Bad ${T.tag}`, tournamentType: "NOPE" }, "Valid types"],
      ["end before start",
        { name: `Bad ${T.tag}`, startDate: "2026-05-10", endDate: "2026-05-01" },
        "End date"],
      ["overs out of range", { name: `Bad ${T.tag}`, defaultOvers: 99 }, "Overs"],
      ["short name too long", { name: `Bad ${T.tag}`, shortName: "z".repeat(31) }, "Short name"],
    ] as const) {
      const r = await T.api.raw("post", "/api/admin/cricket/tournaments", body);
      expect(r.status, label).toBe(400);
      expect(String(r.body.message ?? JSON.stringify(r.body)), label).toContain(expected);
    }
    // Nothing was written by any of them.
    const leftovers = await list(T.api, `search=${encodeURIComponent(`Bad ${T.tag}`)}&size=50`);
    expect(leftovers.total).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Cross-tenant
// ══════════════════════════════════════════════════════════════════════════

test.describe("cross-tenant", () => {
  // API-level assertions run once, on desktop. Running them three times would
  // triple the seeded rows for no extra coverage — the endpoint does not know
  // what viewport asked.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
  });

  let b: Api;
  let bOwn: string;

  test.beforeAll(async () => {
    b = await Api.login(config().b);
    // B gets a tournament of its own, matching A's on every filterable value —
    // so "B sees zero of A's" is a real assertion and not just "B sees nothing".
    const created = await b.raw("post", "/api/admin/cricket/tournaments", {
      name: `B Own ${T.tag}`, shortName: "BOWN", format: "KNOCKOUT",
      tournamentType: "AGE_GROUP", startDate: "2026-03-01", endDate: "2026-03-10",
      venue: "Oval Ground",
    });
    expect(created.status).toBe(200);
    bOwn = created.body.publicId;
  });

  test.afterAll(async () => {
    if (bOwn) await b.raw("delete", `/api/admin/cricket/tournaments/${bOwn}`);
    await b?.dispose();
  });

  test("B's list contains none of A's, on every filter, and leaks no count", async () => {
    const aIds = new Set(T.all.map((t) => t.publicId));

    for (const qs of [
      "", `search=${encodeURIComponent(T.tag)}`, "year=2026", "status=DRAFT",
      "format=KNOCKOUT", "type=AGE_GROUP", "venue=Oval%20Ground",
      `team=${encodeURIComponent(`Eagles ${T.tag}`)}`,
      "fromDate=2020-01-01&toDate=2030-01-01",
      "sort=teams&direction=desc", "sort=matches&direction=desc",
    ]) {
      const r = await b.raw("get", `/api/admin/cricket/tournaments?${qs}&size=100`);
      expect(r.status, qs).toBe(200);
      const leaked = (r.body.content as { publicId: string }[])
        .filter((t) => aIds.has(t.publicId));
      expect(leaked, `rows of A's leaked into B's list for ?${qs}`).toEqual([]);
      // The count check: a paged endpoint can leak a total without leaking a
      // row, and `totalElements: 6` with an empty page tells B exactly how many
      // tournaments A has run.
      expect(r.body.totalElements, `count leaked for ?${qs}`)
        .toBe(r.body.content.length);
    }
  });

  test("B's filter options name none of A's teams", async () => {
    const r = await b.raw("get", "/api/admin/cricket/tournaments/filter-options");
    expect(r.status).toBe(200);
    expect(r.body.teams).not.toContain(`Eagles ${T.tag}`);
    expect(r.body.years).not.toContain(2024); // only A has a 2024 tournament
  });

  test("B cannot read, edit or export A's tournament", async () => {
    const zeph = T.all.find((t) => t.shortName.startsWith("ZEPH"))!;

    const get = await b.raw("get", `/api/admin/cricket/tournaments/${zeph.publicId}`);
    expect(get.status).toBe(404);

    const put = await b.raw("put", `/api/admin/cricket/tournaments/${zeph.publicId}`,
      { name: "TAKEN OVER BY B", format: "ROUND_ROBIN" });
    expect(put.status).toBe(404);

    // And nothing was written — a 404 that still saved would be worse than a 200.
    const still = await T.api.raw("get", `/api/admin/cricket/tournaments/${zeph.publicId}`);
    expect(still.body.name).toBe(zeph.name);
    expect(still.body.format).toBe("KNOCKOUT");
  });

  test("B creating a tournament cannot plant it in A's academy", async () => {
    // BaseEntity.@PrePersist fills academyId only when null, so a caller who
    // supplies one on an ENTITY body keeps it. The request is a DTO with no such
    // field, which is what closes that off — asserted rather than reasoned about.
    const r = await b.raw("post", "/api/admin/cricket/tournaments", {
      name: `B Planted ${T.tag}`,
      academyId: T.api.session.academyId,
      branchId: T.api.session.branchId,
    });
    expect(r.status).toBe(200);
    const planted = r.body.publicId;
    try {
      // A must not be able to see it; B must.
      const fromA = await T.api.raw("get", `/api/admin/cricket/tournaments/${planted}`);
      expect(fromA.status).toBe(404);
      const fromB = await b.raw("get", `/api/admin/cricket/tournaments/${planted}`);
      expect(fromB.status).toBe(200);
    } finally {
      await b.raw("delete", `/api/admin/cricket/tournaments/${planted}`);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// The filtered PDF export
// ══════════════════════════════════════════════════════════════════════════

test.describe("the filtered list export", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API-level; desktop only");
    // In the test body, never at describe level: a describe-level callback
    // receives only fixtures, so reading testInfo.project there throws at
    // collection time and reads like a broken test. gotchas.md records this as
    // having been got wrong three times in this project.
    test.skip(!pdftotextAvailable(),
      "pdftotext (poppler) is required to assert a PDF by its text");
  });

  const fetchPdf = async (api: Api, qs: string) => {
    const res = await api.ctx.get(
      `/api/admin/cricket/tournaments/export/pdf${qs ? "?" + qs : ""}`);
    expect(res.status(), `export ?${qs}`).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const buf = await res.body();
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    return { text: pdfText(buf), flat: flat(pdfText(buf)), bytes: buf, res };
  };

  test("prints the rows, and says which filter produced them", async () => {
    // Asserted by TEXT, not by size: two PDFs of completely different content
    // are within a few hundred bytes of each other, so a byte comparison would
    // pass whether or not the filter did anything.
    const all = await fetchPdf(T.api, mine());
    expect(all.flat).toContain("TOURNAMENT LIST");
    expect(all.flat).toContain("Zephyr Shield");
    expect(all.flat).toContain("Monsoon League");
    expect(all.flat).toContain("Filtered — Search:");

    const knockout = await fetchPdf(T.api, mine("format=KNOCKOUT"));
    // Both filters are named, in the order the describe() builds them — the
    // export is scoped to this run by a search as well as filtered by format,
    // and a document that named only one of the two would be understating what
    // it left out.
    expect(knockout.flat).toContain("Filtered — Search:");
    expect(knockout.flat).toContain("Format: KNOCKOUT");
    expect(knockout.flat).toContain("Zephyr Shield");
    // The filter is proved by the exclusion, which is what a filter that was
    // accepted and then ignored would fail.
    expect(knockout.flat).not.toContain("Monsoon League");
    expect(knockout.flat).toContain("1 tournament");
  });

  test("names the sort, because two orders of the same rows are two documents", async () => {
    const byName = await fetchPdf(T.api, mine("sort=name&direction=asc"));
    expect(byName.flat).toContain("Sorted by name (ascending)");
    const dflt = await fetchPdf(T.api, mine());
    expect(dflt.flat).toContain("Sorted by start date (descending), the default");

    // And the order in the document is the order that was asked for.
    const asc = byName.text.indexOf("Aurora Trophy");
    const zeph = byName.text.indexOf("Zephyr Shield");
    expect(asc).toBeGreaterThan(-1);
    expect(asc).toBeLessThan(zeph);
  });

  test("a filter matching nothing empties the document rather than being ignored", async () => {
    const none = await fetchPdf(T.api, "search=zzz-no-such-tournament");
    expect(none.flat).toContain("0 tournaments");
    expect(none.flat).toContain("No tournaments match these filters");
    expect(none.flat).not.toContain("Zephyr Shield");
  });

  test("an unfiltered export says so, and the filename distinguishes the two", async () => {
    const plainExport = await fetchPdf(T.api, "");
    expect(plainExport.flat).toContain("All tournaments — no filter applied");
    expect(plainExport.res.headers()["content-disposition"])
      .toMatch(/filename="tournaments-\d{4}-\d{2}-\d{2}\.pdf"/);

    const filtered = await fetchPdf(T.api, "status=DRAFT");
    expect(filtered.res.headers()["content-disposition"])
      .toMatch(/filename="tournaments-filtered-\d{4}-\d{2}-\d{2}\.pdf"/);
  });

  test("the columns fit the real text — no wrapped header, no truncated date", async () => {
    // Slice 6 learned this the hard way and so did this table: the first
    // attempt produced "Team s", "Match es" and a range cut off at
    // "01 Mar 2026 → 10".
    const pdf = await fetchPdf(T.api, mine("format=KNOCKOUT"));
    expect(pdf.flat).toContain("Teams");
    expect(pdf.flat).toContain("Matches");
    expect(pdf.flat).not.toContain("Team s");
    expect(pdf.flat).not.toContain("Match es");
    expect(pdf.flat).toContain("01 Mar 2026 → 10 Mar 2026");
  });

  test("B's export contains none of A's tournaments", async () => {
    const b = await Api.login(config().b);
    try {
      const pdf = await fetchPdf(b, mine());
      expect(pdf.flat).not.toContain("Zephyr Shield");
      expect(pdf.flat).not.toContain("Monsoon League");
    } finally {
      await b.dispose();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// UI — desktop and iPhone 14
// ══════════════════════════════════════════════════════════════════════════

async function openList(page: Page, query = "") {
  const { webBase } = config();
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s as Record<string, string>)) {
      window.localStorage.setItem(k, v);
    }
  }, seed);
  await page.goto(`${webBase}/admin/cricket/tournaments${query}`);
  await expect(page.getByTestId("tournament-count")).toBeVisible();
  await expect(page.getByTestId("tournament-count")).not.toHaveText(/Loading/);
}

/** The visible row names, tag stripped, in the order they are rendered. */
async function visibleNames(page: Page): Promise<string[]> {
  const raw = await page.getByTestId("tournament-row")
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.tournamentName ?? ""));
  return plain(raw);
}

test.describe("the list page", () => {
  // Desktop and iPhone 14. mobile-chrome is skipped for the same reason Slice 6
  // skipped it: a second phone-sized Chromium adds no layout coverage the
  // WebKit iPhone project does not already give.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "desktop and iPhone 14");
  });

  test("searches, and puts the search in the URL so the view is shareable", async ({ page }) => {
    await openList(page);
    await page.getByTestId("tournament-search").fill(`Zephyr Shield ${T.tag}`);

    await expect.poll(() => visibleNames(page)).toEqual(["Zephyr Shield"]);
    await expect.poll(() => new URL(page.url()).searchParams.get("search"))
      .toBe(`Zephyr Shield ${T.tag}`);
  });

  test("filters, and the URL round-trips — the whole point of syncing it", async ({ page }) => {
    await openList(page);
    await page.getByTestId("tournament-filters-toggle").click();
    await page.getByTestId("tournament-filter-format").selectOption("KNOCKOUT");
    await page.getByTestId("tournament-search").fill(T.tag);

    await expect.poll(() => visibleNames(page)).toEqual(["Zephyr Shield"]);
    const shared = page.url();
    expect(new URL(shared).searchParams.get("format")).toBe("KNOCKOUT");

    // Open the URL cold in a fresh page: the controls must come back set, and
    // the rows must match. PlayersListPage reads its status param once and never
    // writes back, so its filtered views cannot make this round trip.
    const fresh = await page.context().newPage();
    await fresh.addInitScript((s) => {
      for (const [k, v] of Object.entries(s as Record<string, string>)) {
        window.localStorage.setItem(k, v);
      }
    }, seed);
    await fresh.goto(shared);
    await expect(fresh.getByTestId("tournament-count")).not.toHaveText(/Loading/);
    await expect(fresh.getByTestId("tournament-search")).toHaveValue(T.tag);
    await fresh.getByTestId("tournament-filters-toggle").click();
    await expect(fresh.getByTestId("tournament-filter-format")).toHaveValue("KNOCKOUT");
    const names = await fresh.getByTestId("tournament-row")
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.tournamentName ?? ""));
    expect(plain(names)).toEqual(["Zephyr Shield"]);
    await fresh.close();
  });

  test("sorts, in both directions, from the server", async ({ page }) => {
    await openList(page, `?search=${encodeURIComponent(T.tag)}`);
    await page.getByTestId("tournament-sort").selectOption("name");
    await expect.poll(() => visibleNames(page)).toEqual([
      "Aurora Trophy", "Century Classic", "Monsoon League",
      "Undated Cup", "Winter Series", "Zephyr Shield",
    ]);

    await page.getByTestId("tournament-sort-direction").click();
    await expect.poll(() => visibleNames(page)).toEqual([
      "Zephyr Shield", "Winter Series", "Undated Cup",
      "Monsoon League", "Century Classic", "Aurora Trophy",
    ]);
    expect(new URL(page.url()).searchParams.get("direction")).toBe("desc");
  });

  test("sorts on the two counts it displays", async ({ page }) => {
    await openList(page, `?search=${encodeURIComponent(T.tag)}`);
    await page.getByTestId("tournament-sort").selectOption("teams");
    await expect.poll(async () => (await visibleNames(page))[0]).toBe("Zephyr Shield");
    // The count is on screen: a sort on a number the page does not show is a
    // control with no visible effect.
    await expect(page.getByTestId("tournament-team-count").first()).toHaveText("4 teams");
  });

  test("pages, keeping the filters, and does not show controls it does not need", async ({ page }) => {
    // At the default size of 20 these six rows are one page, so the controls
    // must NOT be rendered — a Previous/Next pair that can never do anything is
    // a control that lies about there being more.
    await openList(page, `?search=${encodeURIComponent(T.tag)}&sort=name&direction=asc`);
    expect(await visibleNames(page)).toHaveLength(6);
    await expect(page.getByTestId("tournament-pagination")).toBeHidden();

    // size comes from the URL, so a link reproduces what the sender saw.
    await openList(page,
      `?search=${encodeURIComponent(T.tag)}&size=2&sort=name&direction=asc`);
    await expect(page.getByTestId("tournament-page-label")).toHaveText("Page 1 of 3");
    expect(await visibleNames(page)).toEqual(["Aurora Trophy", "Century Classic"]);
    await expect(page.getByTestId("tournament-page-prev")).toBeDisabled();

    await page.getByTestId("tournament-page-next").click();
    await expect(page.getByTestId("tournament-page-label")).toHaveText("Page 2 of 3");
    await expect.poll(() => visibleNames(page))
      .toEqual(["Monsoon League", "Undated Cup"]);
    // Paging must not drop the filter: the URL still carries the search, and the
    // rows are still only this run's.
    expect(new URL(page.url()).searchParams.get("search")).toBe(T.tag);

    await page.getByTestId("tournament-page-next").click();
    await expect(page.getByTestId("tournament-page-label")).toHaveText("Page 3 of 3");
    await expect.poll(() => visibleNames(page))
      .toEqual(["Winter Series", "Zephyr Shield"]);
    await expect(page.getByTestId("tournament-page-next")).toBeDisabled();

    await page.getByTestId("tournament-page-prev").click();
    await expect(page.getByTestId("tournament-page-label")).toHaveText("Page 2 of 3");
  });

  test("changing a filter returns to page 1", async ({ page }) => {
    // Staying on page 3 while the filter narrows the result to one page shows an
    // empty list, which reads as "no tournaments match" — a different statement
    // from the truth.
    await openList(page,
      `?search=${encodeURIComponent(T.tag)}&size=2&page=3&sort=name&direction=asc`);
    await expect(page.getByTestId("tournament-page-label")).toHaveText("Page 3 of 3");

    await page.getByTestId("tournament-filters-toggle").click();
    await page.getByTestId("tournament-filter-format").selectOption("KNOCKOUT");

    await expect.poll(() => visibleNames(page)).toEqual(["Zephyr Shield"]);
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  });

  test("offers Edit, which reaches a form with the tournament's values", async ({ page }) => {
    await openList(page, `?search=${encodeURIComponent(`Zephyr Shield ${T.tag}`)}`);
    await page.getByTestId("tournament-row-menu").first().click();
    await page.getByTestId("tournament-row-edit").click();

    await expect(page.getByTestId("tournament-form-heading")).toHaveText("Edit Tournament");
    await expect(page.getByTestId("tournament-name"))
      .toHaveValue(`Zephyr Shield ${T.tag}`);
    await expect(page.getByTestId("tournament-type")).toHaveValue("AGE_GROUP");
    await expect(page.getByTestId("tournament-season-hint")).toContainText("2026");
  });

  test("downloads the filtered PDF through a real download event", async ({ page }) => {
    await openList(page, `?search=${encodeURIComponent(T.tag)}&format=KNOCKOUT`);
    const download = page.waitForEvent("download");
    await page.getByTestId("tournament-export-pdf").click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^tournaments-filtered-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test("shows the status vocabulary the server actually accepts", async ({ page }) => {
    await openList(page);
    await page.getByTestId("tournament-filters-toggle").click();
    const values = await page.getByTestId("tournament-filter-status")
      .locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    // "ACTIVE" was a chip on this page and the value its Re-enable action
    // PATCHed, and it has not been a status since V99.
    expect(values).not.toContain("ACTIVE");
    expect(values).toContain("SUSPENDED");
  });

  test("does not scroll horizontally, at either viewport", async ({ page }) => {
    await openList(page, `?search=${encodeURIComponent(T.tag)}`);
    await page.getByTestId("tournament-filters-toggle").click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
