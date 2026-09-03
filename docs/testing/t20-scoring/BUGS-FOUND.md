# T20 Scoring — Bugs Found

App bugs only. Test bugs are fixed in the specs, not logged here.

Entries added before the first execution slice are **code-evidence only** — the
file:line is quoted and verified, but no failing assertion exists yet. The first
execution slice (sections 2, 3, 5) is expected to produce the runtime repro for
BUG-01 through BUG-05; each entry is updated with the actual failing assertion
when it does.

Per the task instruction, **none of the scoring bugs below are fixed in this
task** — the exception is tenant-scoping, which is a stop-work fix under
CLAUDE.md hard rule 2 (see BUG-06).

Severity scale: **critical** (data loss, cross-tenant, silent corruption) ·
**high** (wrong score/stat persisted) · **medium** (wrong display, missing data)
· **low** (docs/infra).

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-01 | Plain wide rotates strike | high | open — code evidence |
| BUG-02 | Byes and leg-byes charged to the bowler | high | open — code evidence |
| BUG-03 | NB+bye and NB+leg-bye send an identical payload | high | open — code evidence |
| BUG-04 | `extras_penalty` missing from `InningsStateDTO` | medium | open — code evidence |
| BUG-05 | Free hit cleared by a wide | high | open — code evidence (unnumbered in workbook) |
| BUG-06 | `ScoringService.findMTP()` unscoped by academy | critical | FIXED + proven this session |
| BUG-07 | `ROLE_SCORER` cannot reach any scoring endpoint | medium | open — not fixed by instruction |
| BUG-08 | `ROLE_COACH` cannot load the live scorer page | medium | open — not fixed by instruction |
| BUG-09 | `docker-compose.yml` DB does not match reality | low | open — docs/infra |
| BUG-10 | A started match can never be deleted (FK violation) | high | open — reproduced by the suite |
| BUG-11 | Match public id collides under concurrent creation | medium | open — reproduced by the suite |

---

## BUG-01 — Plain wide rotates strike

**Severity:** high · **Scenarios:** T20-020, T20-021, and every wide in section 5

**Workbook expects.** T20-020: "Team +1; batter +0; bowler +1; legal ball
unchanged." A wide with no runs run is not a completed run, so the batters do
not cross and the striker is unchanged.

**What the app does.** Strike rotation keys off the *total* of batsman runs plus
extras, with no exclusion for the one-run wide penalty:

`nextgen-cricket-academy/src/main/java/com/nca/cricket/service/scoring/ScoringService.java:1103`

```java
// Odd total runs = batters crossed mid-ball.
int totalRuns = runsBatsman + runsExtras;
if (totalRuns % 2 != 0) {
    MatchTeamPlayer tmp = nextStriker;
    nextStriker    = nextNonStriker;
    nextNonStriker = tmp;
}
```

The wide picker sends `runsExtras = r + 1`, so a plain wide (`WD+0`) is
`runsExtras = 1` — `nca-web/nca-web/src/pages/scoring/LiveScorerPage.tsx:1861`:

```js
onClick={() => { score(0, "WIDE", r + 1); setPendingExtra(null); }}
```

`totalRuns = 1`, odd, so the striker swaps. The same fault inverts the rest of
the wide ladder: `WD+1` (two runs total, batters *did* cross once) is even, so
strike does not rotate when it should.

**Repro.** Fresh match, Virat on strike. Tap Wide → `WD+0`. Expected striker
Virat; app returns KL Rahul in `currentStrikerPublicId`.

**Note.** The same expression is correct for byes and leg-byes, where every
extra run *is* a completed run. The fix is to exclude the wide/no-ball penalty
run from the crossing calculation, not to change the parity rule.

---

## BUG-02 — Byes and leg-byes charged to the bowler

**Severity:** high · **Scenarios:** T20-033, T20-034, T20-036, T20-037, T20-382, T20-384

**Workbook expects.** T20-033: "Team +N; batter 0; **bowler 0**; legal ball +1."
T20-034 the same for leg-byes. Byes and leg-byes are not charged to the bowler
in any standard scoring convention.

**What the app does.** Runs conceded adds all extras unconditionally, whatever
the extra type:

`ScoringService.java:1092`

```java
bos.setRunsConceded(bos.getRunsConceded() + runsBatsman + runsExtras);
```

The comment above it (L1081) states the intent — "Runs conceded matches
ScorecardService convention: batsman + all extras" — so this is deliberate, but
it disagrees with the workbook and with standard scoring. Knock-on effects:
bowling economy (T20-384) and the extras reconciliation (T20-386) both inherit
it.

**Repro.** Fresh match. Tap Bye → 4. Expected bowler runsConceded 0; app returns 4.

---

## BUG-03 — NB+bye and NB+leg-bye send an identical payload

**Severity:** high · **Scenarios:** T20-031, T20-032, T20-039, EDGE-08

**Workbook expects.** T20-031: "Team +3; batter 0; **bowler +1 only; byes +2**;
illegal." The no-ball penalty is charged to the bowler; the byes are not, and
they land in the byes bucket.

**What the app does.** The no-ball sub-picker offers three buttons — Batsman,
Bye, Leg Bye. The Bye and Leg Bye handlers are byte-identical:

`nca-web/nca-web/src/pages/scoring/LiveScorerPage.tsx:1947` (Bye)

```js
onClick={() => {
  score(0, "NO_BALL", nbPickerRuns + 1);
```

`nca-web/nca-web/src/pages/scoring/LiveScorerPage.tsx:1959` (Leg Bye)

```js
onClick={() => {
  score(0, "NO_BALL", nbPickerRuns + 1);
```

Both post `extraType = "NO_BALL"` with the byes folded into `runsExtras`. The
consequences: `extras_bye` and `extras_leg_bye` both stay 0, the whole amount
lands in `extras_no_ball` (`ScoringService.java:1035`), and the bowler is charged
all of it via BUG-02. Two visually distinct controls with no behavioural
difference — a scorer cannot record the distinction the workbook asks for.

**Repro.** Tap No Ball → `NB+2` → "Bye". Expected `extrasBye 2`, `extrasNoBall 1`,
bowler +1. App returns `extrasBye 0`, `extrasNoBall 3`, bowler +3.

---

## BUG-04 — `extras_penalty` missing from `InningsStateDTO`

**Severity:** medium · **Scenarios:** T20-149, T20-317, T20-377, T20-386, EDGE-29

**Workbook expects.** T20-149: "Penalty runs separately represented."
T20-386: "Wides/NBs/byes/LBs/**penalties** reconcile."

**What the app does.** The column exists and is written —
`entity/Innings.java:77`:

```java
@Column(name = "extras_penalty", nullable = false)
private int extrasPenalty = 0;
```

`ScoringService.java:1036` increments it on a `PENALTY` extra, and
`awardPenalty` (L836) writes it. But the state DTO the live scorer renders from
stops one field short — `dto/scoring/BallResponseDTO.java:64-68` declares
`extrasWide`, `extrasNoBall`, `extrasBye`, `extrasLegBye` and no
`extrasPenalty` (`grep -c extrasPenalty` on the file returns 0, as it does on
`nca-web/nca-web/src/types/scoring.ts`).

Penalty runs therefore land in `totalRuns` but are invisible in the extras
breakdown, so no UI-side reconciliation of "batter runs + extras = team total"
can ever close once a penalty has been awarded.

**Repro.** Extras → Penalty → "Batting side gets 5 runs". `totalRuns` +5; every
`extras*` field in the response unchanged.

---

## BUG-05 — Free hit cleared by a wide

**Severity:** high · **Scenario:** unnumbered — no workbook ID covers it directly;
closest are T20-059 and the section 17 golden-regression free-hit steps

**Expected under the Laws.** A free hit is not consumed by a delivery that is
not a legal ball. If a no-ball is followed by a wide, the free hit carries over
to the next delivery.

**What the app does.** The flag is a plain assignment evaluated on every
delivery, so any non-no-ball delivery clears it — including a wide, which is not
a legal ball:

`ScoringService.java:1145`

```java
// ── 8. Free-hit flag for the NEXT delivery ────────────────────────────
innings.setFreeHit("NO_BALL".equals(extraType));
```

**Repro.** No Ball → `NB+0` (`isFreeHit` true). Then Wide → `WD+0`. Expected
`isFreeHit` still true; app returns false, and the free-hit dismissal
restriction at `ScoringService.java:162` stops applying.

**Note.** Logged as a real deviation, but it is a rule question the workbook does
not number, so confirm the intended behaviour before fixing.

---

## BUG-06 — `ScoringService.findMTP()` unscoped by academy

**Severity:** critical · **Status:** FIXED this session
**Fixed under CLAUDE.md hard rule 2** (tenant scoping is stop-work, not deferrable).

**Defect as found.** `ScoringService.java:1346` resolved a `MatchTeamPlayer` from a
request-supplied public id with no tenant predicate:

```java
private MatchTeamPlayer findMTP(String mtpPublicId) {
    return matchTeamPlayerRepository.findByPublicId(mtpPublicId)
            .orElseThrow(() -> new BusinessException(
                    "Player not found: " + mtpPublicId, HttpStatus.NOT_FOUND));
}
```

The scoped `findByPublicIdAndAcademyId` already existed on the same repository
(`MatchTeamPlayerRepository.java:18`) and was used by `MatchService.java:862`.
Twelve call sites used the unscoped one, including all three player references on
every `postBall`. No Hibernate filter masked it —
`grep -rn "FilterDef|@Filter\(|enableFilter"` over `src/main/java` returns zero
hits; this codebase has no filters.

`findMatch` (L1338) is correctly scoped, so the *match* was never reachable
cross-tenant. The exposure was the **player identity attached to it**.

**Proven exploit (pre-fix build, `nca_scoring_test`, localhost:8081).** Acting as
TESTACAD_A's ADMIN on TESTACAD_A's own match, passing TESTACAD_B's MatchTeamPlayer
public ids:

```
[1] postBall  batsman = B's MTP  -> HTTP 200
[2] postBall  bowler  = B's MTP  -> HTTP 200
[3] postBall  fielder = B's MTP  -> HTTP 200
[4] selectBatter       B's MTP  -> HTTP 200
[5] correctBowler      B's MTP  -> HTTP 400  (masked by an unrelated
                                              "3 balls already bowled" guard,
                                              not by any tenant check)
[6] changeWicketkeeper B's MTP  -> HTTP 404  (only path already safe — it had a
                                              post-hoc academyId check at L514)

row counts on A's match: {deliveries 0, batting 2, bowling 0}
                      -> {deliveries 3, batting 4, bowling 2}
```

Three deliveries were written to Academy A's innings referencing Academy B's
players, and new stat rows were created for B's players on A's innings:

```
        a_match        | match_academy |       player       | player_academy | stat_rows
-----------------------+---------------+--------------------+----------------+-----------
 MCH-NCA-1788436396265 | TESTACAD_A    | ACADBA KL Rahul    | TESTACAD_B     |         1
 MCH-NCA-1788436396265 | TESTACAD_A    | ACADBA Virat Kohli | TESTACAD_B     |         1
```

That is a cross-tenant read (B's `displayName` returned in the response) and a
cross-tenant write (`deliveries`, `innings_batting_stats`, `innings_bowling_stats`)
— the identity-poisoning class CLAUDE.md hard rule 2 exists to prevent.

**Fix.**
- `findMTP` now takes the actor and uses `findByPublicIdAndAcademyId`; all 12 call
  sites pass `actor`.
- `changeWicketkeeper` (L511) now calls `findMTP`, and its post-hoc `academyId`
  equality check was removed — the scoped lookup fully replaces it.
- The unscoped `findByPublicId(String)` declaration was **deleted** from
  `MatchTeamPlayerRepository` once it had no callers, with a comment recording why,
  so the next feature cannot reuse it.

**Post-fix proof (identical script, same data shape):** all six paths return 404,
row counts unchanged `{deliveries 0, batting 2, bowling 0}`, and the control call
with Academy A's own MTPs returns 200 and writes exactly one delivery.

**Sibling audit.** Every `findBy*` / `existsBy*` / `countBy*` / `findById` call site
in `service/scoring/`, `controller/admin/scoring/` and `MatchService` was checked
individually. Findings:

- Safe — keyed by a parent id that was itself resolved through a scoped lookup:
  `MatchService:953`, `ScoringService:118`, `:948`, `:1153`, `TournamentService:172`,
  `:175`.
- Safe — bare `findByPublicId` followed by an explicit academy-participation check:
  `MatchService:114` (tournament, checks `ownsIt || hasTeam` at L134-140) and
  `MatchService:120` (fixture, checks `homeIsOurs || awayIsOurs` at L124-129).
- **Intentionally unscoped, left alone** — each already carries a code comment
  saying so, matching the documented exceptions in `.claude/rules/multi-tenancy.md`:
  `ScorecardService:45,53,204,208` and `PublicScoringService:64,103,115` (public
  shareable-link scorecards, `*NoFilter` methods), `TournamentService:920,923`
  (`linkMatchToFixture`), `TournamentStatsService:431` and
  `TournamentVenueController:43` (both commented "KSCA-style tournaments span
  multiple academies").
- `TournamentVenueController:164` validates `e.getTournamentId().equals(t.getId())`
  before deleting — scoped to the tournament, consistent with the above.

**No unscoped lookups were found outside the audited scope that needed reporting.**
`findMTP` was the only genuine defect.

## BUG-07 — `ROLE_SCORER` cannot reach any scoring endpoint

**Severity:** medium · **Not fixed — explicitly out of scope by instruction.**

The service layer accepts the role —
`ScoringService.java:1352`:

```java
private void validateScorerOrAdmin(User actor) {
    String role = actor.getRole();
    if (!role.equals("ROLE_ADMIN")
            && !role.equals("ROLE_SUPER_ADMIN")
            && !role.equals("ROLE_SCORER")
            && !role.equals("ROLE_COACH")) {
```

but the filter chain never lets it through —
`config/SecurityConfig.java:113`:

```java
.requestMatchers("/api/admin/cricket/matches/*/scoring/**")
.hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_COACH")
```

A `ROLE_SCORER` token gets 403 before reaching the service check. This is the
same pattern `.claude/rules/roles.md` documents for `ROLE_COACH`, which was
fixed by adding the L113 rule — `ROLE_SCORER` was not included.

`ROLE_SCORER` appears exactly once in the whole backend (that L1355 line), so it
may be dead intent rather than a live role. Worth a product decision before
anyone adds it to `SecurityConfig`.

---

## BUG-08 — `ROLE_COACH` cannot load the live scorer page

**Severity:** medium · **Not fixed — explicitly out of scope by instruction.**

`SecurityConfig.java:113` deliberately grants `ROLE_COACH` access to
`/scoring/**`, with a comment saying so. But the scorer page cannot start
without two calls that are *not* under that path:

`nca-web/nca-web/src/pages/scoring/LiveScorerPage.tsx:19` imports `getMatch` and
`getTeams`, which hit `/admin/cricket/matches/{id}` and
`/admin/cricket/matches/{id}/teams` (`src/api/scoring/matchApi.ts:16,25,31`).
Those fall through to the generic rule at `SecurityConfig.java:130`:

```java
.requestMatchers("/api/admin/**")
.hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPER_ADMIN")
```

So a coach can post balls but cannot load the page that posts them. The frontend
route agrees with the generic rule and excludes coaches outright —
`src/App.tsx:409`:

```jsx
<ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
```

Either the L113 coach grant is dead code, or `getMatch`/`getTeams` and the route
guard need to admit coaches. Consequence for this suite: **all Playwright tests
run as ADMIN.**

---

## BUG-09 — `docker-compose.yml` DB does not match reality

**Severity:** low · **Docs/infra — not fixed, noted by instruction.**

`codebase/docker-compose.yml` declares:

```yaml
postgres:
  image: postgres:15
  ports:
    - "5433:5432"
```

Three mismatches against what is actually true on this machine:

- CLAUDE.md states **PostgreSQL 17**; the compose file pins **15**.
- The compose file maps host port **5433**; the Postgres actually in use is a
  native Homebrew **17.10** instance on **5432** (`select version()` →
  `PostgreSQL 17.10 (Homebrew) on aarch64-apple-darwin25.4.0`).
- `docker ps` shows no containers running at all, so the compose file is not the
  path anyone is using locally.

The same file also carries a stale comment referring to deploying to Hetzner,
which CLAUDE.md hard rule 3 says is a different project (Umpire Assist).

---

## BUG-10 — A started match can never be deleted (FK violation)

**Severity:** high · **Found by:** `e2e/specs/fixture.spec.ts` "teardown deletes
the match" · **Reproduced on every run, all three projects**

**What happens.** `DELETE /api/admin/cricket/matches/{publicId}` returns **400**
with a raw Postgres error leaked to the client:

```
update or delete on table "innings" violates foreign key constraint
"innings_batting_stats_innings_id_fkey" on table "innings_batting_stats"
```

**Cause — confirmed against the live schema.** `MatchService.deleteMatch`
(`MatchService.java:970-975`) deletes deliveries, then innings:

```java
// Delete deliveries then innings (FK order matters)
List<Innings> inningsList = inningsRepo.findAllByMatchId(match.getId());
for (Innings innings : inningsList) {
    deliveryRepo.deleteAllByInningsIdNative(innings.getId(), innings.getAcademyId());
}
inningsRepo.deleteAllByMatchIdNative(match.getId());
```

It never touches `innings_batting_stats` or `innings_bowling_stats`. Four of the
six FKs pointing at `innings` cascade; those two do not:

```
         child         |                conname                | on_delete
-----------------------+---------------------------------------+-----------
 deliveries            | deliveries_innings_id_fkey            | c
 manual_batting_rows   | manual_batting_rows_innings_id_fkey   | c
 manual_bowling_rows   | manual_bowling_rows_innings_id_fkey   | c
 innings_batting_stats | innings_batting_stats_innings_id_fkey | a   <-- NO ACTION
 innings_bowling_stats | innings_bowling_stats_innings_id_fkey | a   <-- NO ACTION
 wicketkeeper_changes  | wicketkeeper_changes_innings_id_fkey  | c
```

**Blast radius is wider than it looks.** A batting stat row is created by
`selectBatter`, not only by a delivery — so simply picking the openers is enough.
Every match that has been started is therefore undeletable. There is also no API
path that clears those rows: `undoLastBall` refuses when no ball has been bowled,
and `replayInnings` rebuilds the rows it deletes.

**Repro.** Create a match, set teams, toss, start, select two openers, then
`DELETE /api/admin/cricket/matches/{id}` → 400.

**Suite handling.** The assertion is kept and marked `test.fail()` so it keeps
running and will report "expected to fail but passed" once this is fixed. Test
rows are still cleaned up: `destroyScoringMatch` falls back to a direct delete
against the local test database and logs loudly when it does.

**Secondary issue.** The raw Postgres constraint message reaches the API client.
Internal schema detail should not be in a 400 body.

---

## BUG-11 — Match public id collides under concurrent creation

**Severity:** medium · **Found by:** the suite, running two Playwright workers

**What happens.** `POST /api/admin/cricket/matches` intermittently returns 400:

```
duplicate key value violates unique constraint "cricket_matches_public_id_key"
```

**Cause.** `MatchService.java:934`:

```java
private String generateMatchPublicId() {
    return "MCH-NCA-" + System.currentTimeMillis();
}
```

Millisecond resolution, and `cricket_matches.public_id` is globally unique —
across every academy, not per tenant. Two matches created in the same
millisecond anywhere on the platform collide.

The sibling generators in the same file do this correctly:

```java
private String generateTeamPublicId() {
    return "TM-NCA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
}
private String generateInningsPublicId() {
    return "INN-NCA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
}
```

so the match generator looks like an oversight rather than a decision.

**Repro.** Two concurrent `POST /api/admin/cricket/matches`. Reproduced reliably
with two Playwright workers; a real pair of admins would hit it rarely, and there
is no retry, so the second admin sees a 400 with a raw constraint name.

**Suite handling.** `createScoringMatch` retries up to five times on this exact
constraint, with a comment pointing here. Retried rather than serialised on
purpose — running the suite single-worker would hide the defect instead of
recording it.
