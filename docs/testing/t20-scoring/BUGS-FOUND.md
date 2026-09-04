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
| BUG-01 | Strike inverted on EVERY wide and no ball | critical | **FIXED** — `e748bec` |
| BUG-02 | Byes and leg-byes charged to the bowler | high | **FIXED** — `715a382` |
| BUG-03 | NB+bye and NB+leg-bye send an identical payload | high | **FIXED** — `c618147` |
| BUG-04 | `extras_penalty` missing from `InningsStateDTO` | medium | open — code evidence |
| BUG-05 | Free hit cleared by a wide | high | open — code evidence (unnumbered in workbook) |
| BUG-06 | `ScoringService.findMTP()` unscoped by academy | critical | FIXED + proven this session |
| BUG-07 | `ROLE_SCORER` cannot reach any scoring endpoint | medium | open — not fixed by instruction |
| BUG-08 | `ROLE_COACH` cannot load the live scorer page | medium | open — not fixed by instruction |
| BUG-09 | `docker-compose.yml` DB does not match reality | low | open — docs/infra |
| BUG-10 | A started match can never be deleted (FK violation) | high | **FIXED** — `b9a58a5` |
| BUG-11 | Match public id collides under concurrent creation | medium | open — reproduced by the suite |
| BUG-12 | Undo of the last remaining delivery loses the batters and bowler | medium | open — reproduced by the suite |
| BUG-13 | Undo omits a crease batter from `batterStats` | low | open — reproduced by the suite |

---

## BUG-01 — Strike is inverted on EVERY wide and no ball

**Severity:** critical · **Status: FIXED** in `e748bec`
(`nextgen-cricket-academy`, branch `feature/multi-tenant`)

**Defect as found.** `ScoringService.applyBall` decided strike from the parity of
the delivery total:

```java
// Odd total runs = batters crossed mid-ball.
int totalRuns = runsBatsman + runsExtras;
if (totalRuns % 2 != 0) { /* swap */ }
```

For a wide or a no ball, `runsExtras` includes the one-run **penalty**, which
nobody ran. That phantom run flipped the parity of every such delivery.

Originally logged as "a plain wide rotates strike"; measuring every delivery
shape showed it was wrong on all wides and all no balls, in both directions.

**Measured on the running app** — nine rows, each a fresh delivery from the
baseline with Virat on strike:

| delivery | before fix | after fix | Laws require |
|---|---|---|---|
| plain wide (extras 1) | KL ✗ | Virat ✓ | Virat — nothing was run |
| wide + 1 run (extras 2) | Virat ✗ | KL ✓ | KL — one run completed |
| wide + 2 runs (extras 3) | KL ✗ | Virat ✓ | Virat — two runs completed |
| plain no ball (extras 1) | KL ✗ | Virat ✓ | Virat — nothing was run |
| no ball + 1 off bat | Virat ✗ | KL ✓ | KL — one run completed |
| no ball + 2 off bat | KL ✗ | Virat ✓ | Virat — two runs completed |
| no ball + 4 off bat | KL ✗ | Virat ✓ | Virat — boundary, no running |
| bye 1 (extras 1) | KL ✓ | KL ✓ | KL — control |
| bye 2 (extras 2) | Virat ✓ | Virat ✓ | Virat — control |

The byes controls were correct throughout and stay correct. They are what
isolates the penalty run as the cause.

**Fix.** Rotate on the runs physically run between the wickets:

```java
int penaltyRun = extraType != null && ILLEGAL_BALL_EXTRAS.contains(extraType) ? 1 : 0;
int runsRun = Math.max(0, runsBatsman + runsExtras - penaltyRun);
if (runsRun % 2 != 0) { /* swap */ }
```

`ILLEGAL_BALL_EXTRAS` is the existing `Set.of("WIDE", "NO_BALL")`, so the
deduction applies to exactly the two types that carry a penalty. Per extra type:

| type | runsBatsman | runsExtras | runs run |
|---|---|---|---|
| plain / overthrow | r | 0 | r |
| `WIDE` + n | 0 | n+1 | n |
| `NO_BALL` plain | 0 | 1 | 0 |
| `NO_BALL` + n off bat | n | 1 | n |
| `NO_BALL` + n bye/leg-bye | 0 | n+1 | n |
| `BYE` / `LEG_BYE` n | 0 | n | n |
| `PENALTY` | 0 | 5 | 5 (unchanged) |

**Nothing else changed.** Team total, wickets, legal-ball count, over and
ball-in-over, all four extras buckets, every bowler stat and the `deliveries`
rows were compared before and after across a fixed fourteen-delivery mixed
sequence and are byte-identical. Only strike, and the batter attribution that
follows from it, moved.

**Replay path covered.** The fix is in `applyBall`, which `replayInnings` re-runs
per delivery, so undo and edit inherit it. Asserted directly: score a mixed over
including wides and no balls, add a delivery, undo it, and confirm the restored
striker, non-striker, score, extras, partnership and both stat maps match exactly
what they were before.

**Regression coverage.** `e2e/specs/bug-01-strike-rotation.spec.ts` — the nine
rows above plus the replay test, on all three projects. The `test.fail()` markers
and `@ambiguous` companions on T20-020, T20-021 and T20-027 were removed; those
scenarios now assert the Laws directly and pass.

**Not addressed here.** BUG-02 and BUG-03 are adjacent — they also concern wides,
no balls and byes — but were deliberately left alone. Their scenarios (T20-031,
T20-032, T20-033, T20-034, T20-036, T20-037, T20-039) still report as expected
failures.

## BUG-02 — Byes and leg-byes charged to the bowler

**Severity:** high · **Status: FIXED** in `715a382`
(`nextgen-cricket-academy`, branch `feature/multi-tenant`)

**Defect as found.** Every path credited the bowler `runsBatsman + runsExtras`,
whatever the extra type — `ScoringService.applyBall`:

```java
// Runs conceded matches ScorecardService convention: batsman + all extras.
bos.setRunsConceded(bos.getRunsConceded() + runsBatsman + runsExtras);
```

That comment was accurate, and it was the problem: `ScorecardService` recomputed
the same figure from the deliveries table with the same wrong rule, so the two
agreed with each other while both disagreed with the workbook and with standard
scoring. Fixing one alone would have introduced a divergence that did not exist
before, which is why all eight sites moved in one commit.

**Fix — `BowlingAttribution`,** now the single definition of the rule, with a
matching SQL form for the native queries:

| type | runsBatsman | runsExtras | charged to the bowler |
|---|---|---|---|
| legal delivery | r | 0 | r |
| `WIDE` + n | 0 | n+1 | n+1 |
| `NO_BALL` plain | 0 | 1 | 1 |
| `NO_BALL` + n off bat | n | 1 | n+1 |
| `NO_BALL` + n bye / leg-bye | 0 | n+1 | **1** |
| `BYE` / `LEG_BYE` n | 0 | n | **0** |
| `PENALTY` | 0 | 5 | 0 |

Matches the workbook: T20-031 "bowler +1 only", T20-033/T20-034 "bowler 0",
T20-039 "byes/leg-byes excluded from bowler".

**The eight call sites, all changed together:**

| path | how it computed | consumers |
|---|---|---|
| `ScoringService.applyBall` | live, writes `innings_bowling_stats` | live BallResponse, scorer UI |
| `ScoringService.postBall` maiden | summed the over | maiden counter |
| `ScoringService.replayInnings` maiden | summed the over | undo / edit |
| `DeliveryRepository.getBowlingStatsForInnings` | SQL over `deliveries` | `ScorecardService`, `PublicScoringService` |
| `DeliveryRepository.getCareerBowlingStats` | SQL over `deliveries` | none today — fixed so it cannot be picked up wrong |
| `PlayerCareerStatRepository.findRecentMatchStatsForPlayer` | SQL over `deliveries` | public player profile |
| `CareerStatsService` | Java stream | `PlayerCareerStat`, and through it the PDF, `PublicStatsController`, public profile |
| `TournamentStatsService` | Java stream ×4 | leaderboard, fantasy points, per-player figures |

`DeliveryRepository.getOverBreakdownForInnings` was deliberately **not** changed —
it reports runs scored in an over for the team, not a bowler's figures.

**Maidens changed, correctly.** A maiden is an over with no runs off the bat and
no extras charged to the bowler, so byes do not spoil one and a wide does. Both
were wrong before. Measured after the fix:

```
6 dots                       bowlerRuns=0  maidens=1  ok
6 byes                       bowlerRuns=0  maidens=1  ok
5 dots + 1 leg bye           bowlerRuns=0  maidens=1  ok
6 dots + a wide              bowlerRuns=1  maidens=0  ok
5 dots + a single            bowlerRuns=1  maidens=0  ok
```

**Measured before and after** over a fixed twelve-delivery mixed sequence:

| delivery | bowler runs before | after |
|---|---|---|
| dot | 0 | 0 |
| single | 1 | 1 |
| bye 4 | 5 | **1** |
| leg bye 2 | 7 | **1** |
| wide+0 | 8 | **2** |
| wide+4 | 13 | **7** |
| nb+0 | 14 | **8** |
| nb+4 off bat | 19 | **13** |
| nb+2 byes | 22 | **14** |
| four | 26 | **18** |
| six | 32 | **24** |
| dot | 32 | **24** |

Everything else is byte-identical: the `deliveries` rows, team total, legal-ball
count, all four extras buckets, strike, and batter runs and balls.

**Both paths still agree.** For the same match, before: live `32` / scorecard
`32`. After: live `24` / scorecard `24`, economy `27.43` → `20.57`.

**Regression coverage.** `e2e/specs/bug-02-bowler-runs.spec.ts` — ten attribution
cases, the maiden rule, an explicit live-vs-scorecard equality check, and a replay
check. T20-033, T20-034, T20-036 and T20-037 lost their annotations and now assert
the Laws directly.

**Still failing, on BUG-03 alone.** T20-031, T20-032 and T20-039 keep their
`test.fail()`, now naming only BUG-03: their bowler assertions pass, and what
remains wrong is the extras split.

## BUG-03 — NB+bye and NB+leg-bye send an identical payload

**Severity:** high · **Status: FIXED** in `c618147`
(`nextgen-cricket-academy`, branch `feature/multi-tenant`)

**Defect as found.** The no-ball sub-picker offers three sources, and two of them
were byte-identical — `LiveScorerPage.tsx`, Bye and Leg Bye:

```js
onClick={() => { score(0, "NO_BALL", nbPickerRuns + 1); ... }}
```

Both posted a plain `NO_BALL` delivery, so every run landed in `extras_no_ball`
and `extras_bye` / `extras_leg_bye` stayed 0. Two visually distinct controls with
no behavioural difference — a scorer could not record the distinction the
scorecard is meant to show.

**Root cause was structural, not a typo.** `deliveries.extra_type` is a single
`VARCHAR(15)` already holding `'NO_BALL'`, and nothing else on the row could carry
a secondary type — `runs_batsman` holds bat runs, `runs_extras` holds the penalty
plus the runs. Nothing was reserved for it in V22 or any later migration, so a new
column was required.

**Fix.** `V97__no_ball_runs_type.sql` adds:

```sql
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS no_ball_runs_type VARCHAR(10);
ALTER TABLE deliveries ADD CONSTRAINT chk_no_ball_runs_type
    CHECK (no_ball_runs_type IS NULL OR no_ball_runs_type IN ('BAT', 'BYE', 'LEG_BYE'));
```

`ScoringService.applyNoBallExtras` splits the extras: the one-run penalty stays in
`extras_no_ball`, anything run beyond it goes to byes or leg-byes by sub-type.
Runs off the bat were already on `runs_batsman` and are unaffected. The three UI
buttons now send `BAT`, `BYE` and `LEG_BYE`.

| delivery | extras_no_ball | extras_bye | extras_leg_bye | team | bowler |
|---|---|---|---|---|---|
| no ball, nothing else | 1 | 0 | 0 | +1 | +1 |
| no ball + 2 off the bat | 1 | 0 | 0 | +3 | +3 |
| no ball + 2 byes | 1 | **2** | 0 | +3 | +1 |
| no ball + 4 byes | 1 | **4** | 0 | +5 | +1 |
| no ball + 2 leg byes | 1 | 0 | **2** | +3 | +1 |

Matches T20-031 ("bowler +1 only; byes +2"), T20-032, T20-039 and EDGE-08
("Team +5; batter 0; bowler +1 only; byes +4").

**`BowlingAttribution` needed no change.** A no ball already charges the bowler
`runsBatsman + 1`, never the byes, so bowler figures are identical before and
after — asserted in the regression spec so the two cannot drift apart.

**Historical rows cannot be reclassified — and deliberately are not.** Every
no-ball row written before V97 has `no_ball_runs_type = NULL`, because the
information was never captured. There is no way to recover, for a past delivery,
whether its runs were byes or leg-byes. `applyNoBallExtras` therefore keeps the
old behaviour for null: the whole extras amount stays in `extras_no_ball`. **No
data migration was attempted.** Inventing a split would fabricate a scorecard
detail that was never recorded, and leaving it means a historical match replays to
exactly what it always showed.

The practical consequence: matches scored before V97 keep slightly overstated
`extras_no_ball` and understated byes/leg-byes. The team total, the extras total
and the bowler figures are unaffected, since the runs were only ever in the wrong
bucket, never miscounted.

**Verified byte-identical** over a fixed ten-delivery mixed sequence: the
`deliveries` rows, team total, legal-ball count, the wides bucket, bowler runs,
maidens, strike and batter stats. Only the no-ball / bye / leg-bye split moved, and
`extrasTotal` stayed at 21 throughout.

Reconciliation on the running app: batter runs + all four buckets = team total
(7 + 3 + 5 + 9 + 4 = 28), and the scorecard endpoint agrees bucket for bucket with
the live BallResponse.

**Regression coverage.** `e2e/specs/bug-03-no-ball-extras.spec.ts` — the six
attribution cases, the reconciliation and scorecard-vs-live check, a replay check,
a UI round trip proving the three sub-buttons now post three different deliveries,
and a mobile tap-target check that the three visually adjacent buttons have ≥44px
targets, do not overlap, and each is the element at its own centre — a mis-tap
there would silently record the wrong extra type, which is exactly the distinction
this fix introduces.

T20-031, T20-032 and T20-039 lost their annotations and assert the Laws directly.
The last `@ambiguous` companion in section 3 is deleted; that file now has none.

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

**Severity:** high · **Status: FIXED** in `b9a58a5`
(`nextgen-cricket-academy`, branch `feature/multi-tenant`)

**Defect as found.** `DELETE /api/admin/cricket/matches/{publicId}` returned 400
for any started match, carrying the raw Postgres error:

```
update or delete on table "innings" violates foreign key constraint
"innings_batting_stats_innings_id_fkey" on table "innings_batting_stats"
```

Selecting an opener creates a batting stat row, so every started match was
affected, and no API path could clear those rows: `undoLastBall` refuses when no
ball has been bowled, and `replayInnings` rebuilds what it deletes.

**Full FK audit, read from the live database rather than the migrations.**

Into `cricket_matches`:

| child | on delete | handled by |
|---|---|---|
| `cricket_teams` | CASCADE | database |
| `innings` | CASCADE | database |
| `match_live_annotations` | CASCADE | database |
| `match_officials` | CASCADE | database |
| `wicketkeeper_changes` | CASCADE | database |
| `fixtures` | NO ACTION | `deleteMatch` unlinks it |
| `match_performances` | NO ACTION | `deleteMatch` deletes it |

Into `innings`:

| child | on delete | handled by |
|---|---|---|
| `deliveries` | CASCADE | also deleted explicitly |
| `manual_batting_rows` | CASCADE | database |
| `manual_bowling_rows` | CASCADE | database |
| `wicketkeeper_changes` | CASCADE | database |
| `innings_batting_stats` | **NO ACTION** | **nothing — the bug** |
| `innings_bowling_stats` | **NO ACTION** | **nothing — the bug** |

Following the graph further out, `match_team_players` cascades from
`cricket_teams`, and the many NO ACTION references pointing at it (six columns on
`deliveries`, six on `innings`, plus `match_live_annotations` and
`wicketkeeper_changes`), along with `cricket_matches.toss_winner_team_id` and
`innings.batting_team_id` / `bowling_team_id`, all resolve without help: NO ACTION
is checked at end of statement, not immediately, so rows deleted within the same
cascade satisfy it. Nothing references `deliveries`, the two stat tables,
`match_live_annotations`, `match_officials` or `wicketkeeper_changes` at all.

**So exactly two tables were neither cascaded nor explicitly deleted**, and both
are now removed per innings, before the innings themselves.

**Design choice: explicit deletes, not `ON DELETE CASCADE`.** Only two tables
needed it, so the explicit form stays small and reviewable in the service, and it
does not widen cascade behaviour for any other code path that touches these
tables. No migration was needed.

**Verified by deleting a match at every stage**, with row counts across all
thirteen child tables taken before the match was built and again after deletion:

```
stage                status  match status    orphan rows after delete
SETUP                 200    SETUP           clean
TEAMS_SET             200    SETUP           clean
AFTER_TOSS            200    SETUP           clean
OPENERS_SELECTED      200    IN_PROGRESS     clean
OVER_WITH_WICKET      200    IN_PROGRESS     clean
INNINGS_BREAK         200    IN_PROGRESS     clean
COMPLETED             200    COMPLETED       clean
SUPER_OVER            200    SUPER_OVER      clean
```

The `OVER_WITH_WICKET` stage also carries a live annotation and a wicketkeeper
change, so those tables are exercised too. Cross-tenant behaviour is unchanged:
Academy B deleting Academy A's match returns **404** with nothing removed, and the
owner can still delete it afterwards.

**The raw-message leak is closed separately.**
`GlobalExceptionHandler.simplifyMessage` returned the Postgres text verbatim after
trimming only the `Detail:` and `ERROR:` prefixes, so table and constraint names
reached any API client — on every endpoint, not just this one. Foreign key, unique,
check and not-null violations now return a stable generic message, with the
specific cause logged at warn. Confirmed against a live unique-constraint
violation: the body is `"A record with these details already exists."` and
contains no schema detail.

**Suite impact.** `destroyScoringMatch` no longer has a direct-to-database
fallback; teardown goes through the real endpoint and throws if it fails, so a
regression here fails tests rather than quietly cleaning up behind the app. The
`test.fail()` on "teardown deletes the match" is removed. No test in the suite is
marked expected-fail any more.

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

**Suite handling.** `createScoringMatch` retries up to five times, with a comment
pointing here. Retried rather than serialised on purpose — running the suite
single-worker would hide the defect instead of recording it.

**Note since `b9a58a5`:** the API no longer returns the constraint name, so the
retry matches on the generic "already exists" message instead. Match creation has
only one unique constraint a caller can trip, so that is unambiguous here — but it
does mean **a client can no longer tell which constraint failed**. If callers ever
need to branch on that, the right answer is a stable machine-readable error code,
not putting schema detail back in the message.

---

## BUG-12 — Undo of the last remaining delivery loses the batters and bowler

**Severity:** medium · **Found by:** section 3 work · **Relevant to T20-310, EDGE-23**

**What happens.** Undoing back to zero deliveries clears
`currentStriker`, `currentNonStriker` and `currentBowler`. The scorer must
re-select both openers and the bowler before scoring can continue, with no
message explaining why.

**Measured:**

```
after openers selected             balls=0 runs=0 striker=set  nonStriker=set  bowler=NULL
after 1 delivery (2 runs)          balls=1 runs=2 striker=set  nonStriker=set  bowler=set
after undo of that delivery        balls=0 runs=0 striker=NULL nonStriker=NULL bowler=NULL   <-- lost
after 2 deliveries                 balls=2 runs=4 striker=set  nonStriker=set  bowler=set
after undo (1 delivery remains)    balls=1 runs=2 striker=set  nonStriker=set  bowler=set    <-- fine
```

**Cause.** `undoLastBall` delegates to `replayInnings`
(`ScoringService.java:870`), which unconditionally clears the live state:

```java
innings.setCurrentStriker(null);
innings.setCurrentNonStriker(null);
innings.setCurrentBowler(null);
```

and then rebuilds it by replaying deliveries. With one delivery left the replay
restores everything. With none left there is nothing to replay from, and the
selection made by `selectBatter` / `correctBowler` — which is not a delivery and
so is not part of the replay stream — is gone.

**Why it matters beyond the first ball.** The same hole applies at the start of
any innings and after any correction that empties the delivery list. The workbook
expects undo to restore "batter/bowler/strike/partnership" (T20-310); at this
boundary it restores the score but silently drops the players.

**Suite handling.** `e2e/specs/bug-01-strike-rotation.spec.ts` scores a delivery
before undoing, so it never undoes to zero. Section 13 will assert this directly.

---

## BUG-13 — Undo omits a crease batter from `batterStats`

**Severity:** low · **Found by:** section 6 (EDGE-23 work) · **Relevant to T20-310, EDGE-23**

**What happens.** After an undo, a batter who is at the crease and has a persisted
`innings_batting_stats` row is missing from the `batterStats` map in the response.
The database and the API disagree:

```
after 3 balls  striker=KL
  API batterStats: {'KL': (0, 0), 'Virat': (7, 3)}
  DB rows        : {'KL': (0, 0), 'Virat': (7, 3)}

after undo of the wicket
  API batterStats: {'Virat': (7, 3)}          <-- KL missing
  DB rows        : {'KL': (0, 0), 'Virat': (7, 3)}
  striker: KL   nonStriker: Virat
```

**Cause.** `replayInnings` rebuilds `battingStats` by replaying deliveries, so it
only contains batters who faced one. It then restores crease timestamps and, for
batters who have timestamps but faced no replayed ball, saves a stub row:

```java
matchTeamPlayerRepository.findById(mtpId).ifPresent(mtp -> {
    InningsBattingStat stub = newBattingStat(innings, mtp);
    ...
    battingStatRepo.save(stub);
});
```

The stub is written to the database but never added to the `battingStats` map that
`buildBallResponse` renders from, so it is absent from the response.

**Why low.** The stub path only applies to a batter who has faced no delivery in
the replayed innings, so the missing figures are always 0(0), and the scorer UI
falls back to zeros for an absent entry — it currently looks correct by
coincidence. It is still a real API/DB inconsistency, and any consumer that treats
`batterStats` as the full set of batters at the crease is wrong after an undo.

**Repro.** Score one single so strike rotates, dismiss the new striker (who has
faced nothing), undo. The batter is restored as striker but is absent from
`batterStats`; the row is present in `innings_batting_stats`.

**Suite handling.** Covered by a `test.fail()` in `section-06.spec.ts`. EDGE-23
itself dismisses a batter who has faced deliveries, which is what that scenario is
actually about, and passes.
