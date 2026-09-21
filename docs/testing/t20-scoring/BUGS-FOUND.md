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

**The index covers every entry in this file.** It used to stop at BUG-33 while
the file ran to BUG-41, and BUG-42 was recorded only in `PROGRESS.md` — so the
first thing a new session reads was silently missing nine bugs, one of them a
critical cross-tenant one. Rebuilt by the closeout slice and checked against the
`## BUG-` headings rather than against memory. If you add an entry, add its row.

**This is now checked, not remembered — `npm run register:check`.** It fails if
an entry states no Status, if the index and the body disagree about whether a bug
is open, if either side has an entry the other lacks, if the severities differ,
or if the index is out of order. Telling people the convention is what we did
before, twice; BUG-11 still spent a day marked open after it was fixed. The
script is `scripts/check-bug-register.mjs`, has no dependencies and needs no
backend.

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-01 | Strike inverted on EVERY wide and no ball | critical | **FIXED** — `e748bec` |
| BUG-02 | Byes and leg-byes charged to the bowler | high | **FIXED** — `715a382` |
| BUG-03 | NB+bye and NB+leg-bye send an identical payload | high | **FIXED** — `c618147` |
| BUG-04 | `extras_penalty` missing from `InningsStateDTO` | medium | **FIXED** — `8549c47` |
| BUG-05 | Free hit cleared by a wide | high | **FIXED** — `6e2ced0` |
| BUG-06 | `ScoringService.findMTP()` unscoped by academy | critical | **FIXED** — `e849f60`, proven by stashing the fix |
| BUG-07 | `ROLE_SCORER` cannot reach any scoring endpoint | medium | **FIXED** — backend `b758682`, frontend `fe310ef` |
| BUG-08 | `ROLE_COACH` cannot load the live scorer page | medium | **FIXED** — backend `b758682`, frontend `fe310ef` |
| BUG-09 | `docker-compose.yml` DB does not match reality | low | open — docs/infra |
| BUG-10 | A started match can never be deleted (FK violation) | high | **FIXED** — `b9a58a5` |
| BUG-11 | Match public id collides under concurrent creation | medium | **FIXED** — backend `9f6d2d4`, spec `049426e` |
| BUG-12 | Undo of the last remaining delivery loses the batters and bowler | medium | **FIXED** — `ab34118` |
| BUG-13 | Undo omits a crease batter from `batterStats` | low | **FIXED** — `ab34118` |
| BUG-14 | Consecutive-over rule enforced only in the UI | medium | **FIXED** — `c8c05a8` |
| BUG-15 | Obstructing the field credited to the bowler | medium | **FIXED** — `8cb9fcd` |
| BUG-16 | Undone dismissal leaves a stale `crease_exited_at` | medium | **FIXED** — `ab34118` |
| BUG-17 | A replay erases penalty runs | high | **FIXED** — `8549c47` |
| BUG-18 | `postBall` has no idempotency key, so a retry double-scores | high | **FIXED** — backend `a00b5e7` (V106), spec `612c2d6` |
| BUG-19 | `extra_type` is unvalidated, so unknown values silently lose runs | high | open — reproduced by the suite |
| BUG-20 | Production cannot reach `smtp.gmail.com:587` — app mail is dead | high | open — found during the 2026-09-04 deploy |
| BUG-21 | The mail health indicator has no timeout, so `/actuator/health` takes ~2 minutes | medium | open — found during the 2026-09-04 deploy |
| BUG-22 | Player public ids collide across academies when two share a prefix | medium | **FIXED** — backend `2d69536`, spec `e1e6393` |
| BUG-23 | "Add New Season" on the Kit tab silently inherits another season's kit | medium | **FIXED** — `d55015b` |
| BUG-24 | A role-denied request returns 401 "Session expired", not 403 | medium | **FIXED** — `127e8b5` |
| BUG-25 | A branchless user cannot write a live annotation — hard 400 | high | **FIXED** — backend `6ca45f4`..`d3ab0d6`, frontend `771c189` |
| BUG-26 | Brevo API key revoked — **every** production email is failing, not just deploy mail | critical | open — live production issue |
| BUG-27 | Tournament venues, officials and leaderboards reachable by any academy | critical | **FIXED** — `204bf21` |
| BUG-28 | The kit list could revert an edit it had just saved | medium | **FIXED** — `376bcc0` |
| BUG-29 | `getTeams` returns the two sides unordered, so positional callers can swap them | high | **FIXED** — `093f827` + `6225508` |
| BUG-30 | A match created from a fixture never linked back, so standings stayed empty | high | **FIXED** — `8aaceb4` |
| BUG-31 | The final-fixture flag was unreadable and unclearable through the API | medium | **FIXED** — `fb97d83` |
| BUG-32 | Team order was undetermined, so fixture generation was not deterministic | medium | **FIXED** — Slice 4 |
| BUG-33 | Player ID generation loses its lock before it commits, so concurrent creates collide | medium | **FIXED** — backend `9fa8bce`, spec `0bbe0b2` (Slice 5b) |
| BUG-34 | Lombok's `is*` accessor drops the prefix, so `isForeign` reached the client as `foreign` | medium | **FIXED** — `1f01f1a` |
| BUG-35 | A player's career statistics were readable by anyone, from any academy | critical | **FIXED** — endpoint deleted |
| BUG-36 | The points table cost one extra query per match played | low | **FIXED** — Slice 5 |
| BUG-37 | `save()`'s return discarded, so a just-created entity has no publicId | medium | **FIXED** — `510bfe8`, audited across 26 sites |
| BUG-38 | 28 response DTOs put a tenant id or a user's email on the wire | medium | open — pinned by `ResponseDtoLeakTest`, cannot grow |
| BUG-39 | An unmapped URL returns 500, not 404 | low | **FIXED** — backend `b68bac2`, spec `5bcf56f` |
| BUG-40 | Recording a final's result returned a broken response mid-body | high | **FIXED** — `b7d3432` |
| BUG-41 | `/api/super-admin/fees/reverse` cannot work, and never could | low | **FIXED** — consolidated, not deleted-and-lost; backend `6526c66`, spec `ab36eba` |
| BUG-42 | `generateFixtures` resolved venue ids scoped by nothing — not academy, not tournament | critical | **FIXED** — `743aa44` |
| BUG-43 | A successful Settings save reported failure | medium | **FIXED** — `3a2496a` |
| BUG-44 | The Points Table rendered neither NRR nor No Result, though the API sends both | medium | **FIXED** — `7a3620d` |
| BUG-45 | A slot booked at `09:30+05:30` was reported as `04:00` | medium | **FIXED** — backend `b88adfa`, frontend `4e8f24a` |
| BUG-46 | `PATCH /fixtures/{id}` did no conflict detection, so the Edit form bypassed ruling 4 | medium | **FIXED** — backend `43e9a13`, spec `a404d85` |
| BUG-47 | Seven tournament endpoints returned JPA entities — academyId, branchId and an admin's email on the wire | medium | **FIXED** — `6b0bee1` |
| BUG-48 | `updateSettings` and `PUT /{id}` have no service-layer role check | low | **FIXED** — backend `4f2282b`, spec `c5b3e9a`; eleven methods, not two |
| BUG-49 | The points table counts knockout fixtures, so a three-match group reads P=5 | low | **FIXED** — backend `449f8c2`, spec `acecd3e`; ruling given |
| BUG-50 | `createExternalPlayer`'s phone and email uniqueness checks are unscoped by academy | medium | **FIXED** — backend `12e111f` (V105), spec `a46fe79`; ruling given |
| BUG-51 | No endpoint advances to the next knockout round | low | **FIXED** — backend `a00c85e`, frontend `a641535` |
| BUG-52 | `addManualFixture` numbers the round by fixture count, so the final becomes round 3 | low | **FIXED** — backend `449f8c2`, spec `acecd3e` |
| BUG-53 | `linkMatchToFixture` failure is swallowed in `MatchSetupPage` | low | **FIXED** — `7db2727` |
| BUG-54 | `createScoredTournament` tags its rows with a clock that two workers can share | low | **FIXED** — `ae20cde` |
| BUG-55 | `SummerCampFeeRule.version` is both a domain counter and Hibernate's optimistic-lock field | medium | open — filed, not fixed |

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

**Severity:** medium · **Status: FIXED** in `8549c47`

**Defect as found.** The column existed on `Innings` and `awardPenalty` wrote it,
and both scorecard services already summed **five** buckets into `extrasTotal` —
but `InningsStateDTO` stopped at `extrasLegBye`:

```java
private int extrasWide;
private int extrasNoBall;
private int extrasBye;
private int extrasLegBye;
// no extrasPenalty
```

So the live scorer never received it. Five runs reached the team total with nothing
anywhere to account for them, and `batters + extras = total` could not close.

Worse on the public scorecard, which listed four buckets in the parenthetical
beside a total built from five, so `(lb, w, nb, b)` visibly failed to add up to the
number printed next to it once a penalty was awarded.

**Fix.** `extrasPenalty` added to `InningsStateDTO` and `PublicScorecardDTO`, set by
`buildBallResponse`, `PublicScoringService` and `ScorecardService`, and surfaced in
both frontends.

The live scorer had **no extras readout at all**, which is why a penalty was
invisible there rather than merely mis-totalled. It now shows
`Ex <total> (Nw Nnb Nb Nlb Np)` on the existing wrap row in the header, so it
reflows rather than overflowing on a narrow phone. That is a real UI addition, not
an attribute-only change.

**Regression coverage.** `e2e/specs/bug-04-penalty-extras.spec.ts` — awarding a
penalty through the UI and asserting the bucket and total on all three projects,
a full reconciliation with wides, byes, NB leg-byes and a penalty in play, and the
scorecard agreeing bucket for bucket. T20-149 lost its `test.fail()`.

---

## BUG-17 — A replay erases penalty runs

**Severity:** high · **Status: FIXED** in `8549c47`
**Found while verifying BUG-04**, and fixed with it because "undo/replay preserves
the penalty" cannot hold otherwise.

**What happened.** `awardPenalty` adds five runs straight to the innings and writes
no `Delivery`. `replayInnings` zeroes every aggregate and rebuilds from the delivery
stream, so it had nothing to reconstruct a penalty from and silently dropped it —
together with the five runs it had contributed to the team total:

```
after a four                 teamRuns=4   extras_penalty=0
after a 5-run penalty        teamRuns=9   extras_penalty=5
after another delivery       teamRuns=11  extras_penalty=5
after undo (triggers replay) teamRuns=4   extras_penalty=0   <-- both gone
```

Note the total went to 4, not 9: undoing one 2-run delivery removed seven runs.
This is data loss, not a display problem, and it applies to `editDelivery` as well
since both go through `replayInnings`.

**Fix.** Awarded penalties are carried across the replay, the same way the batter
selection is (BUG-12): snapshot before the reset, then add back only the portion no
delivery accounts for, correcting the team total by the same amount. Anything a
`PENALTY` delivery contributed has already been rebuilt by `applyBall` and is
subtracted, so it cannot be double counted.

**Known edge, currently unreachable.** If a `PENALTY` *delivery* were undone, its
amount would be treated as awarded and retained. `awardPenalty` creates no delivery
and the UI never posts `extraType=PENALTY`, so no such delivery exists; recorded
rather than guarded against speculatively.

**After the fix** the same sequence gives `teamRuns=9  extras_penalty=5` after the
undo, and the reconciliation still closes.

## BUG-05 — Free hit cleared by a wide

**Severity:** high · **Status: FIXED** in `6e2ced0`
(`nextgen-cricket-academy`, branch `feature/multi-tenant`)

**Defect as found.** The flag was a plain assignment evaluated on every delivery:

```java
// ── 8. Free-hit flag for the NEXT delivery ────────────────────────────
innings.setFreeHit("NO_BALL".equals(extraType));
```

Anything that was not a no ball cleared it, including a wide — which is not a
legal ball and cannot consume a free hit. A no ball followed by a wide lost the
free hit before it was ever bowled at.

A second fault sat alongside it. The dismissal check refused everything but a run
out:

```java
if (req.isFreeHit() && req.getDismissalType() != null
        && !"RUN_OUT".equals(req.getDismissalType())) {
    throw new BusinessException("Only run-outs are allowed on a free hit", ...);
}
```

**Fix.** The flag is armed by a no ball, untouched by anything that is not a legal
delivery, and consumed only by a legal one. Byes and leg-byes are legal deliveries
and do consume it, which is what keeps the rule "the next legal ball" rather than
"the next ball off the bat".

Dismissals permitted on a free hit are now run out, obstructing the field, hitting
the ball twice and handling the ball. Bowled, caught, LBW, stumped and hit wicket
stay refused.

The two retirements are allowed as well, deliberately: a retirement is not a mode
of dismissal off the delivery, no ball is bowled, and it can happen at any point.
Refusing one because a free hit was live blocked a legitimate action for an
unrelated reason — a side effect of the old run-out-only check rather than a
decision.

**Measured before and after.**

| delivery | free hit before | after |
|---|---|---|
| single | false | false |
| NB | true | true |
| WD | **false** | **true** |
| WD | **false** | **true** |
| legal 2 | false | false |
| NB | true | true |
| NB | true | true |
| legal 0 | false | false |
| bye 1 | false | false |
| NB | true | true |
| bye 2 | false | false |

| dismissal on a live free hit | before | after |
|---|---|---|
| BOWLED / CAUGHT / LBW / STUMPED / HIT_WICKET | refused | refused |
| RUN_OUT | allowed | allowed |
| OBSTRUCTING_FIELD | refused | **allowed** |
| HIT_TWICE | refused | **allowed** |
| HANDLED_BALL | refused | **allowed** |
| RETIRED_HURT | refused | **allowed** |

**Nothing else changed.** Over a fixed twelve-delivery sequence mixing no balls,
wides, byes and legal deliveries: the `deliveries` rows, team total, legal-ball
count, over and ball-in-over, all four extras buckets, bowler runs, maidens, strike
and batter stats are byte-identical. Only the free-hit flag and the dismissal
validation moved.

**Regression coverage.** `section-04.spec.ts` — NB → WD → WD → legal, NB → NB →
legal, and NB → bye, each asserted on the server and against the UI free-hit
indicator on all three projects. T20-065 is now a direct assertion that obstructing
the field stands on a free hit, rather than an `@ambiguous` pin.

## BUG-06 — `ScoringService.findMTP()` unscoped by academy

**Severity:** critical · **Status: FIXED** in `e849f60`
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

**Severity:** medium · **Status: FIXED**, 2026-09-20.

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

**Fixed.** Ruling: `ROLE_SCORER` is real, narrow — the scoring endpoints
`validateScorerOrAdmin` already accepted, plus match read, plus the scorer
page. Nothing else. `SecurityConfig`'s `/api/admin/cricket/matches/*/scoring/**`
rule now admits `ROLE_SCORER` alongside the existing `ROLE_COACH` grant, placed
(unchanged) before the `/api/admin/**` catch-all — a `ROLE_SCORER` token is
denied everywhere else by construction, since the catch-all requires
`ROLE_ADMIN`/`ROLE_SUPER_ADMIN`. `annotations` lives under that same path but
`MatchService.createAnnotation` narrows further to admin/coach only
(`validateAdminSuperAdminOrCoach`) — a `SCORER` token reaches that check and is
correctly 403'd there, not at the filter chain.

Investigating this alongside BUG-08 turned up that "match read" needed to be
wider than one endpoint — see that entry for `getMatch`/`getTeams`/
`getPlayingXI`/`closeInnings`/`recordResult`, all of which a `SCORER` (and
`COACH`) now also passes.

`createAdmin` needed no change: `role` was already a free-form
`ROLE_`-prefixed string with no allow-list, and BUG-25's branch-required-unless-
`SUPER_ADMIN` check already generalizes to any other role, `SCORER` included —
verified live by creating a real `ROLE_SCORER` (`POST /api/admin/users`, as
`SUPER_ADMIN`) with a branch (succeeds) and without one (400 "Branch is
required").

Verified with real tokens (`e2e/specs/bug-07-08-scorer-role.spec.ts`, `kit-
roles.spec.ts` style): every `ScoringController` endpoint 200, match read 200,
`annotations`/pause/resume/create-match/delete-match/fees/kit/players/user-
management all 403, a cross-academy `SCORER` token 404 on every scoring
endpoint against a match it cannot see, and the scorer page renders with the
pause/resume buttons entirely absent from the DOM (not just disabled) — those
two stay `ADMIN`/`SUPER_ADMIN`-only and had no role gate in the component at
all before this fix, so they would otherwise have rendered for a `SCORER` and
guaranteed a 403 on click.

---

## BUG-08 — `ROLE_COACH` cannot load the live scorer page

**Severity:** medium · **Status: FIXED**, 2026-09-20.

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

**Fixed.** The frontend route guard (`App.tsx`, `/admin/cricket/matches/
:matchId/score`) now admits `ROLE_COACH` and `ROLE_SCORER`. But the guard alone
would not have made the page work: `getMatch`, `getTeams`, and a third call the
page also makes directly — playing XI (`GET .../teams/{team}/players`) — all
live in `MatchController`, not `ScoringController`, gated by a *different*,
narrower service check (`validateAdminOrSuperAdmin` — not even `ROLE_COACH`).
So did `closeInnings` and `recordResult`, both also called by the page to
finish an over/innings/match. Fixing only the frontend route would have landed
a coach on a page that immediately 403'd loading the match.

All five now go through a new `validateAdminSuperAdminCoachOrScorer` (added
alongside the existing `validateAdminOrSuperAdmin`/
`validateAdminSuperAdminOrCoach` in `MatchService`, same file, same pattern),
with matching `SecurityConfig` rules before the `/api/admin/**` catch-all.
Deliberately still narrow: `setTeams` (match setup), pause/resume, coin-flip,
and delete stay `ADMIN`/`SUPER_ADMIN`-only, for `COACH` and `SCORER` alike —
outside what the ruling scoped in, and outside what these two roles ever had
before.

The page itself had no role-conditional rendering at all before this fix — the
pause/resume buttons (backed by the still-admin-only endpoints above) would
have rendered for a coach or scorer and 403'd on click. Both are now hidden
unless the role is `ADMIN`/`SUPER_ADMIN` (`LiveScorerPage.tsx`).

Verified live in `e2e/specs/bug-07-08-scorer-role.spec.ts`: a seeded `ROLE_COACH`
loads the scorer page (striker/bowler render, proving `getMatch`/`getTeams`/
`getPlayingXI` all succeeded) and scores one full over — six legal balls,
`state.inningsState.totalBalls === 6` — via the real API, plus confirms
`getMatch` (BUG-07's exact repro shape) now succeeds for `COACH` too. Full
Playwright suite (all three projects) and smoke green; full `mvn test`
190/190.

---

## BUG-09 — `docker-compose.yml` DB does not match reality

**Severity:** low · **Status:** open — docs/infra, not fixed, noted by
instruction.

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

**Severity:** medium · **Status: FIXED** — backend `9f6d2d4`, spec `049426e`
(2026-09-13) · **Found by:** the suite, running two Playwright workers

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

**Suite handling, while it was open.** `createScoringMatch` retried up to five
times, with a comment pointing here. Retried rather than serialised on purpose —
running the suite single-worker would have hidden the defect instead of recording
it. **Both retries were removed in `049426e`**: with the generator fixed, a
collision is a real regression and must fail the run rather than be absorbed.

**The fix.** `MatchService.generateMatchPublicId` no longer reads the clock:

```java
String generateMatchPublicId() {
    return "MCH-NCA-" + UUID.randomUUID().toString()
            .replace("-", "").substring(0, 12).toUpperCase();
}
```

Twelve hex characters of a random UUID. Measured against the old generator: **7
collisions in 24 concurrent creates**; none with this one.

**Note from while it was open (`b9a58a5`):** the API no longer returns the
constraint name, so the retry matched on the generic "already exists" message
instead. Match creation has
only one unique constraint a caller can trip, so that is unambiguous here — but it
does mean **a client can no longer tell which constraint failed**. If callers ever
need to branch on that, the right answer is a stable machine-readable error code,
not putting schema detail back in the message.

---

## BUG-12 — Undo of the last remaining delivery loses the batters and bowler

**Severity:** medium · **Status: FIXED** in `ab34118`

**Defect as found.** Undoing back to zero deliveries cleared `currentStriker`,
`currentNonStriker` and `currentBowler`. The scorer had to re-select both openers
and the bowler, with no message explaining why.

```
after openers selected             striker=set  nonStriker=set  bowler=set
after 1 delivery (2 runs)          striker=set  nonStriker=set  bowler=set
after undo of that delivery        striker=NULL nonStriker=NULL bowler=NULL   <-- lost
after 2 deliveries                 striker=set  nonStriker=set  bowler=set
after undo (1 delivery remains)    striker=set  nonStriker=set  bowler=set    <-- fine
```

**Root cause, shared with BUG-13 and BUG-16.** `replayInnings` rebuilt everything
about the crease from the delivery stream. A selection is state in its own right —
`selectBatter` and `correctBowler` put a player on with no delivery behind them —
so the stream cannot re-derive it. With one delivery left the replay reconstructed
both ends; with none there was nothing to reconstruct from.

**Fix.** The prior selection is snapshotted before the wipe and restored when the
replayed stream is empty. Conditional on emptiness deliberately: with deliveries
present `applyBall` is authoritative and must keep rotating strike, emptying a
dismissed batter's end and clearing the bowler at an over boundary.

**After the fix** the third line reads `striker=set nonStriker=set bowler=set`, and
scoring continues without re-selecting anyone.

**Source of truth.** A batter is at the crease when their stat row says not out and
carries no exit time. With an empty delivery stream neither can be set, so
restoring the prior selection is exactly that condition — see BUG-16, which had to
be fixed for that predicate to hold at all.

## BUG-13 — Undo omits a crease batter from `batterStats`

**Severity:** low · **Status: FIXED** in `ab34118`

**Defect as found.** After an undo, a batter at the crease with a persisted
`innings_batting_stats` row was missing from the `batterStats` map:

```
after undo of the wicket
  API batterStats: {'Virat': (7, 3)}          <-- KL missing
  DB rows        : {'KL': (0, 0), 'Virat': (7, 3)}
```

`replayInnings` wrote the stub row for a batter who faced no replayed ball but
never added it to the map `buildBallResponse` renders from.

**Fix.** The stub is added to the map after `save()`, which also keeps it out of
the preceding `saveAll` and away from the merge-a-pending-entity problem the
comment there warns about. After the fix the API and the database list the same
batters, which the regression asserts by comparing the two key sets directly.

## BUG-14 — The consecutive-over rule was enforced only in the UI

**Severity:** medium · **Status: FIXED** in `c8c05a8`
(`nextgen-cricket-academy`, branch `feature/multi-tenant`)

**Defect as found.** A bowler could bowl two overs in a row through the API. The
Laws forbid it and the scorer UI blocked it, but the server did not.
`Innings.lastBowler` was maintained correctly — `applyBall` sets it at over end —
but nothing read it for validation.

**Every entry point was open.** Probed before the change:

| entry point | before | delivery written |
|---|---|---|
| `correct-bowler` naming the preceding over's bowler | **200** | n/a |
| `postBall` passing him directly | **200** | **yes** |
| `bowler-injury-replace` naming him | **200** | n/a — and he could then bowl |

`postBall` is the one that mattered most: it takes a `bowlerPublicId` directly, so
guarding only the selection endpoints would have left the hole open to any caller.

**Fix.** One rule, `validateNotPrecedingOverBowler`, called from `postBall`,
`correctBowler` and `bowlerInjuryReplace`. The selection endpoints get it so the
scorer is told at the point of the mistake; `postBall` gets it because it is the
authoritative gate.

**Super Over reconciled into the same rule.** It had been a separate block in
`postBall` with its own message ("bowled in the previous Super Over"). A Super Over
is a single over, so the preceding over for that bowling team is the over of the
most recent prior Super Over innings — the same rule reached a different way.
`bowledPrecedingOver` picks the right lookup; there is now one message and one call
per entry point, not two rules.

**After the fix:**

| entry point | after | delivery written |
|---|---|---|
| `correct-bowler` = preceding over's bowler | **400** | n/a |
| `postBall` = preceding over's bowler | **400** | **no** |
| `postBall` = a different bowler (control) | 200 | yes |
| `bowler-injury-replace` = preceding over's bowler | **400** | n/a |

UI picker behaviour is unchanged — it already disabled the option, and T20-094's UI
assertion still passes.

**Not covered.** `editDelivery` can change a past delivery's bowler and could in
principle create a violation. It is a correction path and validating it risks
blocking legitimate fixes, so it is deliberately left alone.

**Regression coverage.** `section-05.spec.ts` — a companion to T20-094 that
exercises all three entry points plus the control, and asserts no delivery is
written by a refused call. The `test.fail()` in `section-08.spec.ts` is removed;
that assertion now stands on its own.

## BUG-15 — Dismissals the bowler did not earn were credited to them

**Severity:** medium · **Status: FIXED** in `8cb9fcd`

**Defect as found.** Obstructing the field, handling the ball, hitting the ball
twice and timed out all added a wicket to the bowler's figures. Measured with one
of each dismissal type in a single innings, the bowler was credited **9 of the 10**:

| dismissal | team wickets | bowler wickets before | after |
|---|---|---|---|
| BOWLED | 1 | 1 | 1 |
| CAUGHT | 2 | 2 | 2 |
| LBW | 3 | 3 | 3 |
| STUMPED | 4 | 4 | 4 |
| HIT_WICKET | 5 | 5 | 5 |
| RUN_OUT | 6 | 5 | 5 |
| OBSTRUCTING_FIELD | 7 | **6** | **5** |
| HANDLED_BALL | 8 | **7** | **5** |
| HIT_TWICE | 9 | **8** | **5** |
| TIMED_OUT | 10 | **9** | **5** |

**Three deny-lists, none of which agreed.**

```java
// applyBall, getBowlingStatsForInnings, findRecentMatchStatsForPlayer
NOT IN ('RUN_OUT','RETIRED_HURT','RETIRED_OUT')

// CareerStatsService, TournamentStatsService
d.isWicket() && !"RUN_OUT".equals(d.getDismissalType())
```

So a **retirement counted as a bowler's wicket in career and tournament figures
while not counting in the innings figures** — a discrepancy that predates this
change and disappears with it.

**Fix — `BowlerCredit`,** beside `BowlingAttribution`, with a matching SQL form.
Credited: `BOWLED`, `CAUGHT`, `LBW`, `STUMPED`, `HIT_WICKET`. Nothing else.

Deliberately an **allow-list**. `dismissal_type` is a free `VARCHAR(30)` with no
enum and no check constraint, so a deny-list credits every string it has not heard
of — which is precisely how `TIMED_OUT` and `HANDLED_BALL` were being counted
despite never having been implemented.

**Nine call sites now share one rule:** `applyBall`; the two native queries
(`getBowlingStatsForInnings`, `findRecentMatchStatsForPlayer`); three in
`CareerStatsService` (wickets, best figures, season wickets); three in
`TournamentStatsService` (MVP points, per-player wickets, best figures).

Fielding stats are untouched — the catch, stumping and run-out counters key on the
dismissal type for the *fielder's* credit, not the bowler's.

**Consumers.** Best figures and the three- and five-wicket counters derive from the
same predicate and follow automatically; `PlayerCareerStat` and everything reading
it (the PDF, `PublicStatsController`, the public profile) inherit. Hat-trick and
wicket-maiden logic does not exist, so nothing else consumes bowler wicket counts.

**Byte-identical otherwise.** Over the sequence above: the `deliveries` rows, team
wickets, balls, runs and every batter stat are unchanged. Only bowler wickets moved.

**All four paths agree afterwards**, for the same match:

```
team wickets (all dismissals)              10
getBowlingStatsForInnings predicate         5
findRecentMatchStatsForPlayer predicate     5
innings_bowling_stats.wickets (live path)   5
old deny-list (for contrast)                9
```

**Regression coverage.** `e2e/specs/bug-15-bowler-wickets.spec.ts` — each credited
and each non-credited type, an unrecognised string (the allow-list's whole point),
`RETIRED_HURT` being neither a team wicket nor the bowler's, a cross-path agreement
check across live state / scorecard / SQL / `innings_bowling_stats`, and a replay
check. `HANDLED_BALL`, `HIT_TWICE` and `TIMED_OUT` are driven via the API, since the
UI does not offer them but the column accepts them.

## BUG-16 — An undone dismissal leaves a stale `crease_exited_at`

**Severity:** medium · **Status: FIXED** in `ab34118`
**Found while fixing BUG-12/BUG-13**, and fixed with them because the crease
predicate does not hold without it.

**Defect as found.** `replayInnings` snapshots the crease timestamps before wiping
the stat rows and restores them afterwards. The exit time was restored
unconditionally, so a batter whose dismissal had just been undone kept an exit time
for a dismissal that no longer existed:

```
after 2 balls          Virat is_out=f  crease_exited_at IS NULL=t
after the wicket       Virat is_out=t  crease_exited_at IS NULL=f
after undoing it       Virat is_out=f  crease_exited_at IS NULL=f   <-- stale
```

`is_out` reverted correctly; the timestamp did not. That made "not out and no exit
time" — the natural definition of being at the crease, and the one BUG-12's fix
rests on — false for a batter who was demonstrably back at the crease.

**Fix.** The original exit time is restored only when the replay itself produced
one. `applyBall` sets `creaseExitedAt` whenever it replays a dismissal or a
retirement, so a non-null value after the replay means the event survived. This
preserves the original timestamp for a dismissal that still stands, and drops it
for one that has been undone.

**After the fix** the third line reads `is_out=f  crease_exited_at IS NULL=t`, and
a dismissal that survives a replay keeps its original timestamp rather than being
re-stamped with `now()` — both asserted in
`e2e/specs/bug-12-13-replay-crease.spec.ts`.

---

## BUG-18 — `postBall` has no idempotency key, so a retry double-scores

**Severity:** high ·
**Status: FIXED** — backend `a00b5e7` (migration **V106**), spec `612c2d6`
(2026-09-15) ·
**Found by:** section 14 (T20-348, EDGE-27)

**What happens.** Posting the identical delivery payload twice records it twice:

```
identical payload twice -> 200, 200; deliveries=2 runs=8 balls=2
```

One four became eight. There is no idempotency key on `BallRequest`, no
deduplication in `postBall`, and no unique constraint that would catch it.

**Why it matters more than it looks.** This is not only a double-tap problem. Any
retry of an in-flight request scores the ball again: a flaky connection where the
response is lost but the write succeeded, a proxy or client retry, a scorer tapping
again because the first tap appeared to do nothing. The scorer has no way to tell
the difference afterwards — both deliveries are well-formed and legitimate-looking,
and the only remedy is to notice the score is wrong and undo.

It is also the mechanism the workbook's offline story depends on: T20-347 and
T20-348 both assume replayed events are idempotent, so this has to be solved before
any offline queue can be built (T20-346, deferred by design).

**What is NOT wrong.** Concurrency is handled properly. Two clients posting for the
same ball position at once are serialised by the pessimistic lock on the innings
row, producing two well-formed consecutive deliveries and a consistent innings row
— no lost update, no duplicated ball position:

```
two concurrent posts -> [200, 200]; deliveries=2 runs=2 balls=2
  delivery rows (over|ball|seq): 0|1|22523  0|2|22524
```

So the state cannot be corrupted; it is specifically the *identity* of a delivery
that is missing. The workbook's separate ask for "version/conflict handling"
(T20-349) is still absent — the second client's ball is appended rather than
flagged.

**Fix applied.** `BallRequest.deliveryClientId` — a UUID string the caller mints
once per tap. V106 adds a partial unique index,
`(innings_id, delivery_client_id) WHERE delivery_client_id IS NOT NULL` — nullable
and partial so callers that send none (see below) and every row written before
this migration are unaffected. `ScoringService.postBall` checks for an existing
delivery with that id BEFORE any player resolution or business validation — a
retry is a request to confirm what already happened, not a request to redo checks
the original call already passed — and returns it unchanged, rebuilt from the
current (unchanged) innings state, rather than scoring again.

Proven failing first: with only the lookup removed (the parsed id still stored),
the SECOND identical post did not silently double-score — it hit the DB
constraint directly and returned `400 "A record with these details already
exists."` This is worth stating plainly: the constraint alone turns "double-scores
silently" into "the second attempt errors out," which is safer but not the
same as what was asked for; the application-level check is what makes a retry
transparent rather than merely non-corrupting.

The frontend (`src/api/scoring/scoringApi.ts`) generates the id when the caller
doesn't supply one and performs exactly ONE automatic retry, reusing the same id,
when a request gets no response at all (`axios.isAxiosError(e) && !e.response &&
e.request` — a real 4xx/5xx is a definite answer and is never retried). A manual
re-tap by the scorer after seeing an error is a NEW call with its own fresh id,
by design — a conscious human decision, not a replay. Design note:
`docs/architecture/event-idempotency.md`, written to generalise the pattern for
other accumulating writes (`awardPenalty` is named as the next candidate)
without needing to re-derive it.

**Deliberately NOT required.** `deliveryClientId` is optional, not `@NotBlank`.
T20-349/EDGE-28 (the concurrency test, same file) posts two genuinely concurrent,
identical-payload requests via `.raw()` with NO id at all, specifically to prove
the pessimistic lock on the innings row serialises them — a DIFFERENT, already-
correct mechanism from this one. Making the field required would have forced
that test to change to accommodate a field it isn't about; nullable-and-partial
means it didn't have to.

**Suite handling.** `test.fail()` removed from `section-14.spec.ts`; T20-348 /
EDGE-27 now asserts the fix directly, including that the SECOND response matches
the first field-for-field. Two more tests added alongside it: distinct ids still
score two separate deliveries (the converse case), and undo frees an id — a
repost of the same id after an undo is a genuinely new delivery, not silently
absorbed as a stale duplicate. The serialisation test (T20-349/EDGE-28) is
unchanged and still passes, confirming it was unaffected.

---

## BUG-19 — `extra_type` is unvalidated, so unknown values silently lose runs

**Severity:** high · **Status:** open — logged by instruction, not fixed ·
**Found by:** section 16 (EDGE-04, EDGE-36)

**What happens.** `postBall` stores whatever `extraType` string it is given:

```java
delivery.setExtraType(req.getExtraType() != null ? req.getExtraType().toUpperCase() : null);
```

There is no allow-list in the service, no enum, and no check constraint on
`deliveries.extra_type` — it is a bare `VARCHAR(15)`. So an unrecognised value is
accepted with 200 and stored.

**The runs then disappear.** `applyBall` adds the delivery to `totalRuns`
unconditionally, but routes the extras through a `switch (extraType)` with cases
for only the five known types. An unknown type matches none of them, so the runs
land in the total and in no bucket at all:

```
POST extraType=WIDE_BYE -> 200
  totalRuns=3 totalBalls=1 buckets=0 batterRuns=0
  reconciliation batters+buckets=0 vs total=3  -> BROKEN, 3 runs unaccounted
  bowler charged=0 legalBalls=1
```

The scorecard then shows a total that its own extras breakdown cannot account for
— the exact failure the reconciliation tests in section 15 exist to catch, reached
through a door those tests do not open.

**It is also counted as a legal ball,** because `isLegal` is computed as "not in
`{WIDE, NO_BALL}`", so an unknown type advances the over as well.

**Why it is the same shape as BUG-15.** That bug was a deny-list on
`dismissal_type` that credited anything it had not heard of; this is no list at all
on `extra_type`. Both stem from enum-like columns held as free text. `dismissal_type`
now has `BowlerCredit` as an allow-list in front of it; `extra_type` has nothing.

**Reachability.** The UI only ever sends the five valid values, so a scorer cannot
trigger this today. It is reachable by any direct API caller, by a future screen,
and by `editDelivery`, which sets `extraType` with the same absence of validation.

**Fix sketch (not applied).** Validate `extraType` against the known set in
`postBall` and `editDelivery` — the same shape as the `noBallRunsType` check added
in `c618147` — and add a check constraint to the column, as V97 did for
`no_ball_runs_type`.

**Suite handling.** `test.fail()` in `section-16.spec.ts` asserting the workbook's
expectation that an impossible classification is prevented. The structural half —
that a *valid* delivery carries exactly one classification and cannot be both a
wide and a bye — is asserted positively alongside it.

---

## BUG-20 — Production cannot reach `smtp.gmail.com:587`, so app mail is dead

**Severity:** high · **Status:** open — logged by instruction, not fixed.

Found while verifying the 2026-09-04 production deploy (build BE#12 / FE#5). The
backend's own `JavaMailSender` cannot open a connection to Gmail's SMTP port:

```
"mail":{"status":"DOWN","details":{"location":"smtp.gmail.com:587",
 "error":"org.eclipse.angus.mail.util.MailConnectException:
          Couldn't connect to host, port: smtp.gmail.com, 587; timeout -1"}}
```

Read from `rkmpcrease-prod` (DigitalOcean BLR1, 168.144.79.220) with:

```
docker exec rkmpcrease-backend curl -s http://localhost:8080/actuator/health
```

This is **not** the Brevo problem. There are two separate mail paths and both are
currently broken:

- `deploy.sh` posts to the Brevo HTTP API for deploy notifications. It returns
  `HTTP 401 {"message":"Key not found","code":"unauthorized"}` — a stale key,
  already recorded in CLAUDE.md.
- The application itself uses SMTP to `smtp.gmail.com:587` for whatever it sends
  through `JavaMailSender`. That is what this bug is about, and it fails at the
  TCP layer, not on credentials.

The connection error rather than an auth error points at egress: DigitalOcean
blocks outbound SMTP on new droplets by default, and port 587 leaving this
droplet looks blocked. Worth confirming with a direct connect test from the host
before assuming it is application configuration.

**Impact.** Anything the backend sends through `JavaMailSender` is silently not
delivered. It also drags the aggregate `/actuator/health` to `DOWN` (`db`,
`ping` and `diskSpace` are all `UP`), so the aggregate is useless as a liveness
signal — anything watching it sees a permanent red that predates this deploy.

**Not caused by this deploy.** The same DOWN state was observed on build #11
before the deploy ran.

---

## BUG-21 — The mail health indicator has no timeout, so `/actuator/health` takes ~2 minutes

**Severity:** medium · **Status:** open — logged by instruction, not fixed.

The same health check reports `"timeout -1"` on the mail component. With
`smtp.gmail.com:587` unreachable (BUG-20), the indicator sits on a connect with
no timeout, and the whole endpoint blocks behind it. Measured on production: a
request that normally returns in milliseconds took roughly two minutes, and an
earlier 120-second attempt timed out entirely with no response.

Through nginx it is worse — `curl https://rkmpcrease.com/actuator/health` and
the same on `rbncc.` both returned `HTTP 000`, i.e. the proxy gave up before the
endpoint answered. `/actuator/info` on the same host returns instantly, so the
route is fine; it is this one indicator holding the response open.

**Impact.** `/actuator/health` cannot be used by anything with a sane timeout —
a load balancer probe, an uptime monitor, or a deploy readiness gate. Today
`deploy.sh` is unaffected because it waits on the startup log line
(`deploy.sh:235`, grepping `docker logs` for
`Started NextgenCricketAcademyApplication`) rather than polling health. If that
is ever changed to a health poll, it will hang.

**Fix direction** (not applied): set `spring.mail.properties.mail.smtp.timeout`
and `mail.smtp.connectiontimeout`, or exclude the mail indicator from the health
group with `management.health.mail.enabled=false`. Fixing BUG-20 removes the
symptom but not the missing timeout, which would bite again on the next
unreachable mail host.

---

## BUG-22 — Player public ids collide across academies when two share a prefix

**Severity:** medium · **Status: FIXED** — backend `2d69536`, spec `e1e6393`
(2026-09-13). Onboarding now refuses a blank prefix (400) and one another academy
already holds (409); `defaultPlayerIdPrefix` is the single source of the
derivation, so the value validated and the value seeded cannot drift apart.
Proven by removing the guard: provisioning into a held prefix returned 200 and
created the tenant.

`players.public_id` is globally unique, but the id is generated from a
**per-academy** counter:

```java
// AcademySettingsService.java:98-104
public synchronized String generateNextPlayerId() {
    String counterStr = getSetting("PLAYER_ID_COUNTER", "0");
    int counter = Integer.parseInt(counterStr) + 1;
    updateSetting("PLAYER_ID_COUNTER", String.valueOf(counter));
    String prefix = getSetting("PLAYER_ID_PREFIX", "");
    return String.format("%s-%d", prefix, counter);
}
```

Two academies whose `PLAYER_ID_PREFIX` matches therefore generate the same
sequence, and the second academy fails on its **first** player:

```
ERROR: duplicate key value violates unique constraint "players_public_id_key"
  Detail: Key (public_id)=(-1) already exists.
```

Reproduced on `nca_scoring_test` while seeding fixtures for the Kit module:
Academy A created players `-1` … `-5`, and Academy B's first player was rejected.

**Why it is not currently biting production.** Academies onboarded through the
platform flow get a distinct prefix automatically:

```java
// PlatformAcademyService.java:304
d.add(new Object[]{"PLAYER_ID_PREFIX", "PLY-" + code, "Player public ID prefix", "TEXT"});
```

Both live tenants were created that way, so their prefixes differ. The defect is
that nothing **enforces** it: the prefix is a free-text setting an admin can edit
to any value, including one another academy already uses, and there is no
uniqueness check on it. An empty prefix — the fallback in the code above — makes
collision certain.

**Fix direction** (not applied): either make the uniqueness constraint
`(academy_id, public_id)` rather than global, or validate prefix uniqueness when
the setting is written. The former is the more honest model, since a public id is
only ever meaningful within one academy.

**Workaround used for testing.** The two test academies were given distinct
prefixes through the app's own settings API, matching what onboarding would have
done. No rows were faked.

---

## BUG-23 — "Add New Season" on the Kit tab silently inherits another season's kit

**Severity:** medium · **Status: FIXED** in `d55015b`

On Player Overview → Kit, "+ Add New Season" is meant to open a blank form. It
does, and then immediately overwrites it.

```js
// PlayerKitPage.tsx — startAddNew
setKit(null);
const newSeason = new Date().getFullYear().toString();
setSelectedSeason(newSeason);            // <- fires the load effect below
setForm({ ...emptyKitForm(), seasonYear: newSeason });
```

Setting `selectedSeason` re-runs the effect that loads that season's kit, and
that effect calls `setForm(toForm(res.data))`. So if the player already has a kit
row for the current year, the "new" form comes up populated with it — including
the given-flags — and saving under a different year copies those values onto the
new season.

**Confirmed pre-existing**, not introduced by the KitDetailsForm extraction:
`git show 2ec1e84~1:src/pages/player/PlayerKitPage.tsx` has the identical
`setSelectedSeason` / load-effect pair.

**How it surfaced.** `kit-tab.spec.ts` set only the cap flag and asserted
PARTIAL, and got DELIVERED — because the form had inherited an already-delivered
row's t-shirt and trouser flags. The spec now sets all three flags explicitly and
uses a run-unique season, which is why it passes; the underlying behaviour is
unchanged and still wrong.

**Fix.** Adding a season is now an explicit mode. `creatingNew` suppresses the
load effect, and `startAddNew` no longer moves `selectedSeason` at all —
retargeting it was the mechanism. Saving points the selector at the new season
once one exists; cancelling clears the mode, which re-runs the load and restores
the real row.

The effect also cancels in flight. Guarding only at the top of the effect left a
real race — a request already outstanding when the button is clicked still
resolved afterwards and wrote into the just-cleared form. That was not
theoretical: it is what the regression test caught after the first version of the
fix, on a page that had only just loaded. Flipping `creatingNew` re-runs the
effect, so its cleanup marks the earlier response stale before `.then` lands.

**Verified.** With an existing 2026 row fully delivered (XXL/XXL, all three flags,
`delivered_at` set): Add New Season shows every field empty and every flag
unchecked; saving 2027 with only a size gives `tshirt_given`/`trouser_given`/
`cap_given` false, `NOT_DELIVERED`, `delivered_at` null; the 2026 row is
unchanged. Covered by `kit-tab.spec.ts` on all three projects.

---

## BUG-24 — A role-denied request returns 401 "Session expired", not 403

**Severity:** medium · **Status: FIXED** in `127e8b5`

A correctly authenticated user denied by a `SecurityConfig` rule gets:

```
HTTP 401  {"error": "Session expired. Please login again."}
```

`SecurityConfig` registers an `authenticationEntryPoint` but **no
`accessDeniedHandler`**, so an authorization failure at the filter chain falls
through to the entry point, which is written for expired sessions.

Not specific to any role or module. Measured on `nca_scoring_test`:

| Actor | Request | Status |
|---|---|---|
| ADMIN | `POST /api/admin/users` (SUPER_ADMIN-only) | **401** |
| COACH | `POST /api/admin/players/{id}/kit` | **401** |
| COACH | `POST /api/admin/kit/bulk-deliver` | **401** |
| COACH | `GET /api/admin/kit/list/export` | **401** |
| COACH | `GET /api/admin/players/{id}` | **401** |

Denials raised inside a controller return 403 correctly (`BusinessException` →
`GlobalExceptionHandler`); it is only the filter-chain denials that mis-report.

**Impact.** The security outcome is right — access is refused and nothing is
written, asserted directly against the database. The status is wrong, and it is
wrong in a way that misleads a client: a UI that treats 401 as "session expired"
will log the user out and bounce them to login instead of showing "you do not
have permission", producing an apparent login loop for a user whose session is
perfectly valid.

**Fix.** An `accessDeniedHandler` returning 403, alongside the existing entry
point. No route rule changed. Two details mattered more than the handler itself:

- **The handler must write a body.** An empty error response makes the container
  forward to `/error`, which re-enters the chain on the ERROR dispatch with no
  `SecurityContext`, hits the entry point and overwrites the status back to 401.
  That forward is why this was confusing to diagnose: the entry-point log line
  named `/error`, not the endpoint the client called. Writing the body commits
  the response and stops the forward — the `/error` re-entries are gone.
- **The body carries both `error` and `message`.** `error` matches the entry
  point; `message` is what `GlobalExceptionHandler`'s own 403 uses and what every
  component reads (`err?.response?.data?.message`), so the reason reaches the
  user's toast rather than a generic fallback.

**Measured after, with real tokens:**

| Actor | Request | Before | After |
|---|---|---|---|
| none | `POST /api/admin/users` | 401 | **401** (unchanged) |
| ADMIN | `POST /api/admin/users` | 401 | **403** |
| COACH | kit save / bulk-deliver / export | 401 | **403** |
| COACH | kit list / kit seasons | 200 | **200** (unchanged) |
| ADMIN | own players | 200 | **200** (unchanged) |

**Why it mattered.** The interceptor at `src/api/axios.ts:31` treats 401 as a
dead session — it clears `accessToken`, `userRole` and eleven other keys, sets
`sessionExpired`, and forces `window.location = "/login"`. There is no 403
branch, so a 403 now rejects to the caller and the component's `catch` handles
it. Covered by `kit-roles.spec.ts`, which asserts the coach stays on
`/admin/kit/list` with the token intact and `sessionExpired` unset after a denied
write.

**Not shown: a toast screenshot.** No control that a COACH can actually reach
produces a 403 — the kit page hides every write affordance from them, which is
the correct design. The 403 path matters for direct API clients and for any
future control that is not hidden, so what is asserted is the response and the
surviving session rather than a manufactured toast.

---

## BUG-25 — A branchless user cannot write a live annotation — hard 400

**Severity:** high · **Status: FIXED**, 2026-09-16 — the branch resolver landed.

Running the smoke suite as a `ROLE_SUPER_ADMIN` with `branch_id IS NULL` fails at
the live-note step:

```
POST /api/admin/cricket/matches/{id}/scoring/annotations   ->  400

ERROR: null value in column "branch_id" of relation "match_live_annotations"
       violates not-null constraint
  Detail: Failing row contains (…, f49460fa-…, null, …, superadmin-a@example.com, …)
```

`MatchService.createAnnotation` never sets `branchId`; it relies on
`BaseEntity.@PrePersist`, which fills the field from `AcademyContext` **only when
that is non-null**. A branchless actor leaves it null, and
`match_live_annotations.branch_id` is `NOT NULL`.

**`match_live_annotations` was absent from the branch-resolver's list of affected
tables** in SESSION-HANDOFF.md. That list has since been re-derived from the
schema: 92 tables carry `branch_id`, **32 are NOT NULL** and can fail this way,
and `match_live_annotations` is one of two that carry the constraint with no FK
at all. It is also the first of the 32 demonstrated to fail rather than inferred.

Note the site *does* assign the column — `MatchService.java:1021`,
`ann.setBranchId(actor.getBranchId())`. It looks handled and still fails, because
the actor has no branch. An explicit assignment from the actor is no safer than
relying on `@PrePersist`; 35 of the 58 `setBranchId` sites in the codebase write
null for a branchless actor.

The same actor completed all 44 other smoke assertions, including every scoring
rule, so this is specific to inserts that depend on `@PrePersist` for `branchId`.

See the branch-reachability section at the top of the branch-resolver entry in
SESSION-HANDOFF.md for who can actually be branchless.

**Fixed.** Ruling: academy-wide admins are a supported concept — SUPER_ADMIN is
academy-wide by definition, so requiring a branch at creation was the bug, not
the null branch. One centralized `BranchResolutionService.resolveBranchId(actor,
academyId[, relatedEntityBranchId])`: the actor's own branch, else a related
entity's branch where the caller has one in scope, else the academy's main
branch, else a clear `BusinessException`. Wired into every unsafe site found —
more than the originally-recorded 35, since re-verifying the schema before
wiring turned up `players`/`enquiries`/`enquiry_follow_ups` mis-categorized as
"already safe" (a mechanical false match on an unrelated DTO-mapping line) and
one genuinely new site added since the audit
(`AdminPlayerController.createTournamentGuestPlayer`). `BaseEntity` gained an
opt-in `requiresBranchId()` override, applied to all 26 live NOT-NULL entities,
so a future miss throws a named `BusinessException` instead of writing null or
hitting a raw constraint violation. `MatchLiveAnnotation` and
`WicketkeeperChange` don't extend `BaseEntity`, so the backstop doesn't reach
them — they already fail loudly by construction, and the resolver call at their
two sites is the complete fix. `AdminUserController`/`UserService.createAdmin`
and the admin-creation form now allow a null branch for `ROLE_SUPER_ADMIN`
specifically.

Verified: `superadmin-a@example.com` now completes the full smoke suite via
`E2E_AS_SUPER_ADMIN=1`, including this exact repro — `POST .../scoring/
annotations` now 200, and the written row's `branch_id` confirmed by direct
query to be the academy's actual main branch. A batch created the same way was
confirmed to appear in the main-branch-filtered `active batches` view, not
dropped. Full Playwright suite (all three projects) and smoke green as the
normal actor too; full `mvn test` 190/190.

`wip/branch-resolver` is deleted — fully superseded. It never reached this
exact repro site, checked only `AcademyContext` rather than the actor, and
referenced `SuperAdminFeeCorrectionService`, which BUG-41 had already deleted.

---

## BUG-26 — The Brevo API key is revoked, so every production email is failing

**Severity:** critical · **Status:** open — **live production issue**, not a
deploy-tooling inconvenience.

Probed directly against Brevo from `rkmpcrease-prod` on 2026-09-05, reading the
key from `/opt/rkmpcrease/.env` inside a Python process (never printed, never on
a command line):

```
key present: True | length: 90
Brevo /v3/account -> 401 {"message":"Key not found","code":"unauthorized"}
```

`"Key not found"` rather than a permissions error: Brevo does not recognise this
key at all, which is what a **revoked** key looks like — consistent with a new
one having been generated without the old being replaced on the server.

**This was mis-scoped until now.** It had been recorded only as "deploy emails
401" (CLAUDE.md, and the note against the 2026-09-04 deploy). The same key backs
the application's entire transactional email path:

```
application-prod.properties:41   brevo.api.key=${BREVO_API_KEY}
BrevoEmailClient.java:108        .header("api-key", apiKey)
                                 POST https://api.brevo.com/v3/smtp/email
```

`BrevoEmailClient` is used by `PlayerEmailService`, which has **11 callers**
across services, schedulers and controllers:

| Caller | What is not being delivered |
|---|---|
| `FeeStatusScheduler`, `FeeInstallmentService`, `AdminFeeController` | Fee reminders |
| `AttendanceReminderScheduler` | Attendance reminders, weekly and low-attendance reports |
| `CommunicationService` | Admin-sent communications |
| `BirthdayNotificationScheduler` | Birthday notifications |
| `InventoryOverdueAlertScheduler`, `InventoryOverdueAlertController` | Inventory overdue alerts |
| `PlayerCoachingService`, `PlayerInjuryService`, `PracticeDayService` | Coaching, injury and practice-day notifications |
| `PlayerEmailService` directly | Welcome emails, enquiry welcome and follow-ups, summer-camp enrolment, player lists, contact-form notifications to admin |

**Impact.** Every one of those is silently failing in production right now. The
schedulers keep running and keep logging success at the service layer; the 401
happens inside the HTTP client. Nothing surfaces to an admin — there is no
delivery dashboard, and `NotificationLog` is only written on some paths. Live
tenants are not yet in real use, which is the only reason this has not produced
complaints.

**Distinct from BUG-20.** That is the *other* mail path — the application's
`JavaMailSender` cannot open `smtp.gmail.com:587` from this droplet. Both mail
routes out of production are broken, for unrelated reasons, at the same time.

**Fix.** Generate a key in the Brevo dashboard and write it to
`BREVO_API_KEY=` in `/opt/rkmpcrease/.env`, then restart the backend so Spring
re-reads it (`brevo.api.key` is injected at startup, not per request). Verify
with the probe above expecting **200**, and confirm a real send afterwards.

**Do not gate on the file's mtime.** `deploy.sh:180-184` rewrites `BUILD_NUMBER`
into the same `.env` on every deploy, so its mtime always looks fresh afterwards.
Two separate attempts to use mtime as a "was it rotated?" test gave a false
positive.

_Also outstanding, and adjacent: `application-dev.properties` still carries a
hardcoded Brevo key in a tracked file. That is the known item in CLAUDE.md hard
rule 6 and should move to an env var; if the dev key is ever the same key, it is
also now revoked._

---

## BUG-27 — Tournament venues, officials and leaderboards were reachable by any academy

**Severity:** critical (cross-tenant read **and write**) · **Status: FIXED** in `204bf21`

Found during the Stage A tournament-module assessment.

`TournamentVenueController` resolved the tournament with a bare `findByPublicId`
and then never checked the actor's academy on **any of its eight endpoints**:

```java
// TournamentVenueController.java:40-46 (before)
// Intentionally unscoped: KSCA-style tournaments span multiple academies (same
// as TournamentStatsService.getTournament and TournamentService.linkMatchToFixture).
private Tournament getTournament(String publicId) {
    return tournamentRepo.findByPublicId(publicId)
            .orElseThrow(() -> new BusinessException("Tournament not found", HttpStatus.NOT_FOUND));
}
```

The write path was the worst of it:

```java
// TournamentVenueController.java:67-83 (before)
Tournament t = getTournament(publicId);     // the FOREIGN tournament
venue.setTournament(t);                     // attached to the victim's tournament
venue.setAcademyId(actor.getAcademyId());   // stamped with the ATTACKER's academy
```

That persisted a row whose `academy_id` and `tournament_id` belonged to different
academies, and `listVenues` reads by `tournamentId` alone — so the victim would
then see the injected venue inside their own tournament. Not just a leak:
cross-tenant data injection. `PATCH` and `DELETE` scoped only by the foreign
tournament id and operated freely on the victim's rows.

`TournamentStatsService:427-433` had the same helper feeding the batting, bowling
and MVP leaderboards — another academy's player statistics.

Reachable by any `ROLE_ADMIN` or `ROLE_SUPER_ADMIN`: the route falls to the
generic `/api/admin/**` rule (`SecurityConfig:141`) and neither class carried a
`@PreAuthorize`.

**Why the comments did not make it safe.** Both sites asserted KSCA-style intent
and cited each other as precedent — a circular justification.
`.claude/rules/multi-tenancy.md:28-30` ratifies exactly three exceptions and
neither was among them.

**The fix.** `TournamentAccessGuard`, one component, applying the rule
`MatchService.createMatch` has always used — cross-academy reach is real but not
unconditional — split by operation:

| | Rule | Applies to |
|---|---|---|
| `requireParticipant` | owner **or** a team entered | 2 reads, 3 leaderboards |
| `requireOwner` | owner only | 5 writes |

Both raise **404, never 403**: the existence of another academy's tournament must
not be revealed. One component rather than a copied helper, because
`multi-tenancy.md` records a cross-cutting check duplicated across four services
that carried the same bypass bug in each. Its unscoped loader is private and
cannot be reached without passing a check.

Also deleted `TournamentTeamRepository.findByPublicId` — zero callers.

**Sibling audit after the change:** the only unscoped lookups left in the
tournament package are the guard's private loader and
`TournamentService.linkMatchToFixture`, which is the one ratified exception and is
untouched.

**Verified** (`e2e/specs/bug-27-tournament-scoping.spec.ts`): Academy B gets 404
on all eight venue/officials endpoints and all three leaderboards of Academy A's
tournament, with zero rows written and zero `tournament_venues` rows whose
academy differs from their tournament's; the owner is unaffected (200, and can
still add a venue). Read-only checks on `nca_scoring_test` and on production
found **no pre-existing mismatched rows** — production holds no tournaments at
all, so the defect was never exploitable against live data.

### Finding: the KSCA participation branch is currently unreachable

Proving the participation case required seeding a `tournament_teams` row
directly, because **no API path creates it**. `TournamentService.addTeam` is
owner-scoped (`:122`) and stamps the row with the caller's own academy (`:130`),
so `tournament_teams.academy_id` can only ever be the owner's, and
`existsByTournamentIdAndAcademyId(tournamentId, visitingAcademy)` can never be
true. `MatchService.createMatch`'s `hasTeam` test (`:137-138`) has therefore never
been able to pass either — the KSCA exception is already effectively owner-only.

The guard is written to the documented rule and asserted against a seeded
participation row, so it is correct for when a cross-academy entry flow exists.
Building that flow is a product decision, not an implementation detail.

---

## BUG-28 — The kit list could revert an edit it had just saved

**Severity:** medium · **Status: FIXED** in `376bcc0`

`KitListPage.load` (`:85-92`) had no guard against out-of-order responses, and is
called from three places — the season effect (`:93`), `saveDrawer` (`:147`) and
`bulkDeliver` (`:164`). Several requests can be in flight at once, so a slow
earlier response landing after a later one overwrote the table with pre-edit rows:
save a size in the drawer, watch it appear, and a moment later the row silently
reverts.

Each call now takes a ticket and only the newest may write.

**Same family as BUG-23**, which was the identical race in `PlayerKitPage`'s load
effect. That one was fixed with a cancellation flag; this page was never given the
same treatment — worth remembering that fixing a race in one component does not
fix its twin.

**An app defect, not a test race.** The kit-list spec failed on desktop with the
table showing `M` ten seconds after the drawer had saved `XXL`, while passing
three times out of three in isolation. Concurrency across the three Playwright
projects is what made the slow response land late — the same condition a real user
meets on a slow connection.

Verified: three consecutive runs of `kit-list.spec.ts` across all three projects,
3/3 each, plus the full suite green from an empty database.

---

## BUG-29 — `getTeams` returns the two sides unordered, so positional callers can swap them

**Severity:** high · **Status: FIXED** in `093f827` (backend) and `6225508`
(nca-web) — found during the Slice 1 full-suite run, not caused by it

`CricketTeamRepository.findAllByMatchId` has no `ORDER BY`:

```java
List<CricketTeam> findAllByMatchId(UUID matchId);
```

Postgres is therefore free to return TEAM_A and TEAM_B in either order, and it
does — the order is stable for long stretches and then changes, which is what
makes this look like a flaky test rather than a defect.

**How it surfaced.** `bug-01-strike-rotation.spec.ts` failed once on `mobile`
with `opener 1 must be Virat per the workbook baseline / Received: "David
Warner"` — Warner is `BOWLING_XI[0]`. The fixture had taken `teams[0]` as the
batting side and been handed Australia. The rows themselves were correct: the
orphaned match left behind by the failure held `India|TEAM_A` and
`Australia|TEAM_B`. Only the read order was wrong. Re-running the spec in
isolation passed 10/10, which is the signature of this bug, not evidence against
it.

**Why it is an app defect and not a test race.** Two pages index the list
positionally rather than by `teamType`:

- `ManualEntryPage.tsx:152-185` — `ts[0]` is used as Team A *and* as the first
  innings' batting side, `ts[1]` as Team B and the bowling side. If the order
  flips, an entire manually entered scorecard is recorded against the wrong
  teams, with each side's XI attached to the other. This writes wrong data, it
  does not merely display it.
- `LiveScorerPage.tsx:611-612` — `ts[0]`/`ts[1]` become batting/bowling in the
  branch taken when no innings is in progress, so the scorer can be shown the
  wrong side's players before the first innings starts. Once an innings exists
  the server-authoritative `currentInnings` is used instead, which bounds this
  one to the pre-innings window.

`MatchReportPage` and `ExternalMatchReportPage` already do it correctly, with
`find(t => t.teamType === "TEAM_A")` — so the right pattern is present in the
codebase and was simply not used in the other two.

**Same family as BUG-28 and BUG-23:** a latent ordering/timing assumption that
passes in isolation and fails under concurrency.

**Suggested fix.** Order at the source — `ORDER BY team_type` on
`findAllByMatchId` (and `findAllByMatchIdNative`, which `ScorecardService` uses)
— *and* convert the two positional call sites to select by `teamType`, since the
backend guarantee should not be the only thing keeping them correct.

**Fixed.** `findAllByMatchId` became `findAllByMatchIdOrderByTeamTypeAsc` — renamed
rather than quietly sorted, so every call site states the dependency — and the
native query used by `ScorecardService` got the same `ORDER BY`. Both positional
frontend callers now resolve each side with `find(t => t.teamType === …)`, so the
backend ordering is a convenience rather than the only thing keeping them correct.
`ManualEntryPage` stops with a message if either side is missing instead of
reading `undefined`.

**Proof, against a deliberately flipped heap.** An `UPDATE` moves the TEAM_A
tuple to the tail of the heap, so an unordered scan of those rows returns
`TEAM_B,TEAM_A` — exactly what the old query did. In that state:

| | result |
|---|---|
| raw unordered scan (the old query) | `TEAM_B,TEAM_A` |
| `GET /matches/{id}/teams` (fixed) | `["TEAM_A:India","TEAM_B:Australia"]` |

Backend suite 10/10. Playwright full suite **684 passed / 6 expected-fail / 285
skipped / 0 unexpected**, mobile back to 226 from 225. TypeScript held at the 88
baseline.

---

## BUG-30 — A match created from a fixture never linked back, so standings stayed empty

**Severity:** high · **Status: FIXED** in `8aaceb4` — found during Slice 3, not
caused by it

`MatchService.createMatch` set one end of the link and not the other:

```java
match.setFixture(fixture);   // and nothing set fixture.setMatch(match)
```

Only `TournamentService.linkMatchToFixture` — the create-the-match-first,
link-it-afterwards path — ever wrote `fixtures.match_id`. A match created
**from** a fixture, which is the flow the UI offers via prepare-match, left it
null for ever.

**Why that matters.** Standings walk fixtures, and every path skips a fixture
whose match is null:

```java
if (!isHome && !isAway || f.getMatch() == null) continue;
```

So the points table stayed empty however many games were played. Measured before
the fix, on a completed fixture-created match:

| | value |
|---|---|
| `fixtures.match_id` | `NULL` |
| `fixtures.status` | `COMPLETED` |
| standings, both sides | `played 0, points 0` |

The same nulls made the Fixtures tab's **Score** and **Scorecard** buttons dead,
since both read `f.match.publicId`.

It also means Slice 1's NRR exclusion was correct but never fired for these
matches — there was nothing for it to exclude, because the fixture never reached
its innings at all.

**The fix, and what it broke on the way.** Linking both ends made `CricketMatch`
and `Fixture` genuinely circular, and Jackson follows that until the response
dies mid-body — arriving as `Parse Error: Expected LF after chunk data` on a 200,
a truncated chunked reply rather than a clean 500. Each side now excludes the
other from serialisation while keeping what its own consumers read: a match still
carries its fixture, a fixture still carries its match.

**Covered by** `tournament-status.spec.ts` — "a match created from a fixture now
counts towards the standings (BUG-30)", asserting `fixtures.match_id` is
populated and that the winner is on `played 1, won 1, points 2` against the
loser's `played 1, lost 1, points 0`.

---

## BUG-31 — The final-fixture flag was unreadable and unclearable through the API

**Severity:** medium · **Status: FIXED** in `fb97d83` — introduced by Slice 3 and
caught in Slice 4

Lombok generates `isFinal()` / `setFinal()` for a boolean field named
`isFinal`, and Jackson derives the JSON property from the accessor. So the
property was **`final`**, not `isFinal`, in both directions — and nothing
complained, because `JacksonConfig` sets `FAIL_ON_UNKNOWN_PROPERTIES` to false.

Measured on the running app, on a fixture that had just been marked:

```
keys: academyId,awayTeam,branchId,byeTeam,createdAt,createdBy,final,homeTeam,
      id,label,match,publicId,roundNumber,scheduledAt,stage,status,tournament,
      updatedAt,updatedBy,venue,version
one.isFinal = undefined    one.final = true
after PATCH {"isFinal": false}, final = true
```

Two consequences, one in each direction:

- **Reading.** `FixturesTab` renders its 🏆 toggle from `f.isFinal`, which was
  always `undefined`, so a fixture marked as the final still displayed as
  unmarked. The flag worked — the UI just never showed it.
- **Writing.** `MarkFinalRequest.isFinal` bound from `"final"`, so a client
  sending `{"isFinal": false}` matched no property and the field kept its `true`
  initialiser. **Unmarking a fixture marked it.** The initialiser is deliberate —
  a PATCH with no body means "mark" — which is exactly why the failure was
  silent rather than a 400.

**Fixed** by pinning the name with `@JsonProperty("isFinal")` on both
`MarkFinalRequest` and the new `FixtureDto`.

**Covered by** `tournament-status.spec.ts` — "fixtures come back as a DTO, and
isFinal round-trips both ways (BUG-31)", which asserts the key is present under
that name and absent under Lombok's, then marks, unmarks, and checks the row.

**Worth remembering:** any boolean whose field name starts with `is` has this
problem, and `FAIL_ON_UNKNOWN_PROPERTIES=false` guarantees the write half fails
silently. `Innings.isSuperOver` and `CricketMatch.isDeleted`-style fields are the
same shape; they happen not to be read by name from the client today.

---

## BUG-32 — Team order was undetermined, so fixture generation was not deterministic

**Severity:** medium · **Status: FIXED** in Slice 4 — found by the full suite,
not by the code review that preceded it

Fixture generation reads its teams through:

```java
List<TournamentTeam> findAllByTournamentIdOrderBySeedAsc(UUID tournamentId);
```

`seed` has no column default and nothing sets it unless an admin types one, so in
practice **every seed is NULL** — and ordering by a column where every value is
equal leaves the order to the heap. Postgres gives no guarantee there, and it
does change: the same tournament generated twice could put a different side at
home.

This is the same defect class as BUG-29 one level up — an `ORDER BY` that does
not determine an order — and it quietly undermined the headline claim of the
slice that found it. `FixtureGenerator` is deterministic given its input; the
input was not.

**How it surfaced.** A Slice 3 test that had passed a dozen times —
"completing the fixture marked as the final sets champion, runner-up and
COMPLETED" — failed in the Slice 4 full-suite run with the champion coming back
as `teams[1]` instead of `teams[0]`. Nothing about champions had changed; the
generated fixture's home side had. Re-running it alone would have passed, which
is exactly what makes this class of defect expensive.

**Fixed** by ordering explicitly, with NULL seeds last and a stable tiebreaker:

```sql
ORDER BY CASE WHEN seed IS NULL THEN 1 ELSE 0 END, seed ASC, created_at ASC, id ASC
```

`created_at` then `id` breaks the tie the way a user would expect — the order the
teams were entered in.

**Worth remembering:** `ORDER BY <nullable column>` on a column nothing populates
is indistinguishable from no ORDER BY at all. Both BUG-29 and this one presented
as flaky tests and were defects in what the query promised.

---

## BUG-33 — Player ID generation loses its lock before it commits

**Severity:** medium · **Status: FIXED in Slice 5b** (backend `9fa8bce`, spec
`0bbe0b2`) — found during the Slice 4 full-suite run, left to the player/settings
module, and closed there

`AcademySettingsService.generateNextPlayerId` guards a read-modify-write with
`synchronized`, on a `@Transactional` method:

```java
@Transactional
public synchronized String generateNextPlayerId() {
    String counterStr = getSetting("PLAYER_ID_COUNTER", "0");
    int counter = Integer.parseInt(counterStr) + 1;
    updateSetting("PLAYER_ID_COUNTER", String.valueOf(counter));
    ...
}
```

**These two do not compose.** `@Transactional` works through a proxy: the proxy
opens the transaction, calls the method, the method returns — releasing the
monitor — and only *then* does the proxy commit. So the lock is given up before
the write is visible to anyone else. Thread A reads 5 and writes 6 uncommitted;
thread B acquires the monitor, reads **5 again**, and writes 6 as well. Both
players get the same id, and the second insert trips the unique constraint.

`generateNextEnquiryId` immediately below it has the identical shape.

**How it surfaced.** `kit-roles.spec.ts` — "kit rows still get the academy's main
branch, never NULL" — failed on `mobile-chrome` with `create player SuBranch
88474300 P01 … Expected < 400, Received 409`. Run alone it passes; it needs two
Playwright workers creating players at once, which is the ordinary case for the
suite and a plausible one for two admins onboarding a batch.

Related to **BUG-22**, which records id collisions *across* academies sharing a
prefix. This is the same symptom from a different cause: one academy, two
threads.

**The fix is not a bigger lock.** `synchronized` cannot span a proxy-managed
commit at all, and would not survive a second app instance. The counter needs to
be incremented by the database in one statement — `UPDATE … SET value =
(value::int + 1)::text WHERE … RETURNING value` — or held under a real row lock.
That is a change in the player/settings module, not the tournament one, which is
why it is logged here rather than fixed in passing.

**Fixed 2026-09-12, Slice 5b.** One statement, as above: `INSERT INTO
academy_settings … ON CONFLICT (academy_id, setting_key) DO UPDATE SET
setting_value = CAST(CAST(… AS bigint) + 1 AS text) … RETURNING setting_value`.
Postgres takes the row lock for the `DO UPDATE` and a concurrent writer re-reads
the committed value, so callers serialise on the counter row and each gets a
distinct number — and a caller that rolls back leaves no gap, because the
increment rolls back with it. The `INSERT` half matters: onboarding seeds
`PLAYER_ID_PREFIX` but not a counter, so the row may genuinely not exist and two
first-uses must not both insert. `generateNextEnquiryId` moves onto the same
helper. `synchronized` is gone.

Not a Postgres sequence: `player_seq` and friends are global, and these counters
are per-academy by design — each academy numbers its own players from 1.

`bug-33-player-id-race.spec.ts` issues twenty creates with `Promise.all` and
asserts no 409, twenty distinct ids, twenty rows, the counter advanced by exactly
twenty, and that the ids ARE the counter's values (`@PrePersist` would otherwise
generate distinct UUIDs and satisfy "all distinct" while proving nothing).
**Proven to have teeth**: with the old implementation restored and rebuilt, the
same spec fails with 2 × 409.

`createPlayer()`'s six-attempt 409 retry is removed in the same commit, so the
suite would fail rather than paper over a return of the race.

**CAST, not `::`.** Hibernate scans a native query for `:name` parameters before
Postgres sees it, so `::text` arrives as `:text` and fails with `syntax error at
or near ":"`. Every player create returned 500 until all three casts were
rewritten. Recorded in `.claude/rules/gotchas.md`.

---

## BUG-34 — see PROGRESS.md

**Severity:** medium · **Status: FIXED** in `1f01f1a`

Recorded in full in `nextgen-cricket-academy/docs/tournament/PROGRESS.md` under
Slice 4b: the Lombok/Jackson `is*` boolean naming trap, audited across both
repos. The entry is kept here so the numbering does not appear to skip, and so
the index has a body to agree with — a pointer entry still needs a Status, or
the register cannot answer "is this open?" without opening another file.

---

## BUG-35 — A player's career statistics were readable by anyone, from any academy

**Found:** Slice 5 pre-work, reading `TournamentStatsService` before editing it.
**Status:** fixed — the endpoint is deleted.

`GET /api/public/players/{playerPublicId}/career-stats` returned a player's full
batting, bowling and fielding career figures with **no token at all**.
`SecurityConfig:68` permits `/api/public/**` wholesale, and the handler —
`TournamentStatsController:57` → `TournamentStatsService.getPlayerCareerStats(String)`
— took no `User` and performed no academy check. Its three siblings in the same
class all went through `TournamentAccessGuard.requireParticipant`.

Measured, not inferred: a `curl` with no `Authorization` header returned `200`
and a complete body.

It also had **zero consumers**. `PlayerStatsPage.tsx:471-473` reads
`/admin/cricket-stats/{id}`, `/admin/players/{id}/info` and
`/public/cricket-stats/player/{id}` — all served by `CareerStatsService`, a
separate implementation that resolves the player properly first. Nothing in
`nca-web/src` or `nca-web/e2e` referenced `career-stats` at all.

So it was a dead duplicate that leaked across tenants, and CLAUDE.md hard rule 2
says to delete an unscoped method once its callers are gone rather than leave it
declared. Deleted with the user's explicit agreement, since removing a public
HTTP endpoint is an API-surface decision.

---

## BUG-36 — The points table cost one extra query per match played

**Found:** Slice 5, by the query-count guard written for the dashboard.
**Status:** fixed.

`InningsRepository.findAllByMatchIdIn` returned innings with `battingTeam` and
`bowlingTeam` LAZY, and **every** consumer immediately asks which tournament team
an innings belongs to — `TournamentService.playsAs` for the points table,
`TournamentStatisticsService.teamRows` for the team leaderboard. Each of those is
one query per `CricketTeam`.

Measured by `TournamentDashboardQueryCountTest` on its first run with innings
seeded:

| tournament | statements |
|---|---|
| 2 teams, 1 fixture | 13 |
| 10 teams, 20 fixtures | **51** |

51 − 13 = 38, which is exactly the 38 additional `cricket_teams` rows. With a
`LEFT JOIN FETCH` of both sides and their `tournamentTeam`, both are **11**.

This predates Slice 5 by a long way — the points table has always paid it — and
it was invisible because nothing counted queries. The test asserts *invariance*
first (same count at either size) and pins the exact number second, so the
regression cannot return quietly.

---

## BUG-37 — `save()` returns a copy, so a just-created entity has no publicId

**Found:** Slice 5, building the awards endpoints.
**Status:** fixed in the award service; **the trap is codebase-wide and unaudited.**

`POST /awards` returned `{"publicId": null, ...}` while the row in the database
had a `public_id`, and the audit row was written with a null `entityId`. The
client therefore could not address the award it had just created.

`BaseEntity` declares `@Version private Integer version = 0` — a **boxed** type
with a **non-null initialiser**. Spring Data's `JpaMetamodelEntityInformation`
decides whether an entity is new from the version when one is present, sees `0`
rather than `null`, concludes the entity is **not** new, and calls `em.merge()`.
`merge()` returns a managed **copy** and leaves the instance it was handed
detached — so the id and publicId that `BaseEntity.@PrePersist` generates land on
the copy, and the original still reads null.

Fixed by using the return value: `award = awardRepo.saveAndFlush(award)`.

**The wider risk is not fixed.** Any service in this codebase that calls
`save()` on a `BaseEntity` subclass and then reads the id or publicId off the
*argument* has the same defect. It is invisible on an update path — there the
entity came from the database already carrying both — which is exactly why it
survives. Worth a grep-and-audit of its own.

**Audited in Slice 5b** (backend `510bfe8`, spec `ba252de`). **26 call sites**
discard `save()`'s return and then read `getPublicId()` or `getId()` off the
argument in the same method. All 26 now read the saved instance.

Twenty-three were harmless — update paths, where the value read was already set
before the save. **Three were live defects:**

| Site | What it produced |
|---|---|
| `SuperAdminFeeCorrectionService.reversePayment` | every `FEE_PAYMENT_REVERSED` audit row recorded `"reversalPublicId": null` — a correction flagged `"critical": true` with no link to the row it created |
| `FeeInstallmentService.recordPayment` | the create response carried `"id": null` |
| `FeeInstallmentService.recordDirectPlanPayment` | the same |

Both fee-installment methods **return** the payment and `FeeInstallmentController`
serialises it. Their publicId is assigned by hand from a sequence, which is what
hid them: the log line printed a real id while the response did not.

Three call sites needed a **new local** rather than a reassignment because a
lambda captures the original (`TournamentResultService.markFinal` and
`.applyFinalResult`). The compiler found those, which is the argument for fixing
all 26 uniformly rather than only the ones reasoned to matter — "provably
harmless" is the reasoning that let this survive from the beginning.

**`SaveReturnDiscardedTest`** makes the audit permanent: it scans
`src/main/java` for the shape and fails on the next one, with the historical
`SuperAdminFeeCorrectionService` code as its control. `bug-37-save-return.spec.ts`
proves one instance end to end, against the persisted row.

**The root cause is a ruling, not a fix, and is deliberately left.** `BaseEntity`
could declare `@Version private Integer version;` with no initialiser. `isNew()`
would then be true for a new entity, `save()` would call `persist()`, and the
argument itself would be the managed instance — closing the whole class at the
root instead of site by site. It changes the persistence behaviour of **every**
entity in the application, so it needs its own decision and its own regression
pass. See `nextgen-cricket-academy/docs/tournament/PROGRESS.md`, Slice 5b.

**Root cause fixed.** `BaseEntity.version` no longer initialises to `0` —
`private Integer version;` stays null until JPA sets it on first insert.
Verified from `spring-data-jpa` 3.2.5 source (`JpaMetamodelEntityInformation
.isNew()`): a non-primitive `@Version` attribute is decided purely on whether
its runtime value is null, so `isNew()` is now correctly `true` on create and
`save()` takes the `persist()` branch — which per the JPA/Spring Data contract
returns the exact same reference it was given.

Checked for every entity in the app whether this changes UPDATE-path
optimistic locking (the one behaviour this could not be allowed to break): no.
73 `BaseEntity` subclasses use the inherited field directly and are unaffected
on the update path — only the create-time `isNew()` outcome was ever wrong.
The 20 entities that don't extend `BaseEntity` have no `@Version` at all and
are untouched. Two call sites (`BroadcastLog`, `BroadcastRecipient`) manually
assign a fresh random UUID id before saving a new row — safe under `persist()`.
One entity, `SummerCampFeeRule`, shadows `BaseEntity.version` with its own
domain field and was and remains independently broken for an unrelated reason
— see **BUG-55**, filed rather than fixed here.

New tests: `SaveReturnsPersistedInstanceOnCreateTest` asserts `save(x) == x`
and `x.getPublicId()` is populated on create, for one entity from each of 8
unrelated modules (attendance, enquiries, fees, inventory, representative
honors, tournaments, summer camps ×2, users). `OptimisticLockingRegressionTest`
opens two genuinely separate `EntityManager`s against the same `FeePayment` row
and the same `Tournament` row, updates both, commits the first, and asserts the
second throws `OptimisticLockException` — the concurrent-edit detection this
change could have silently broken. Full `mvn test`: 190/190 passing, including
both new tests and the original `SaveReturnDiscardedTest`. Full Playwright
suite (desktop, iPhone 14, Pixel 7) and smoke also green — see the commit for
the exact run. A fresh-install boot against a truncated scratch database ran
all 105 Flyway migrations cleanly to v106 and started with no errors, confirming
no migration or seed data depends on `version` defaulting to `0`.

`SaveReturnDiscardedTest` is kept permanently, unchanged — it was already a
general source scan with no site-specific allowlist to remove. It still
guards against the discard-then-read *shape* regardless of root cause, which
matters again the day someone reintroduces a non-null `@Version` default.

---

## BUG-38 — Twenty-eight response DTOs put a tenant id or a user's email on the wire

**Found:** Slice 5, by `ResponseDtoLeakTest` on its first run.
**Status:** reported, **not fixed**. Pinned so it cannot grow.

`BaseEntity` fills `createdBy` and `updatedBy` from the authentication
principal's name, which in this codebase is an **email address**. Twenty-three
response DTOs across the club, enquiry, player-development, CMS and season
modules serialise one or both, so each publishes the address of whoever last
touched the row to anyone who can read it. Five more carry `branchId` on
responses that are already academy-scoped — an unnecessary internal id rather
than a cross-tenant leak.

Thirteen further hits are legitimate and listed as `ALLOWED` with reasons:
request bodies (a tenant id on the way *in* is not a leak), platform-level
surfaces where the academy *is* the subject, `AuthResponse` telling a caller its
own identity back, and `AuditLogDTO`, which exists to show these columns.

Not fixed here because the fix spans five modules with nothing to do with
tournaments and would have made Slice 5 unreviewable. `KNOWN_PRE_EXISTING` in
`ResponseDtoLeakTest` holds the list, a second test asserts it only ever gets
**shorter**, and anything new fails immediately.

---

## BUG-39 — An unmapped URL returns 500, not 404

**Found:** Slice 5, verifying that BUG-35's endpoint was gone.
**Status: FIXED in Slice 5b** (backend `b68bac2`, spec `5bcf56f`).

Requesting a path with no handler produces
`org.springframework.web.servlet.resource.NoResourceFoundException`, which
`GlobalExceptionHandler` has no specific handler for, so it falls through to the
catch-all `@ExceptionHandler(Exception.class)` and becomes **500 Internal Server
Error** with "Something went wrong" — plus a full stack trace in the log for
every typo'd URL.

Confirmed against the running app: `GET /api/public/players/{id}/career-stats`
after its deletion returned `500`, and the log line is
`Unhandled exception: No static resource api/public/players/…/career-stats.`

The same family as the `ResponseStatusException` problem `multi-tenancy.md`
already records ("Confirm error paths return the right status"). The fix is a
two-line `@ExceptionHandler(NoResourceFoundException.class)` returning 404, but
it changes the response of **every** unmapped URL in the application, so it
belongs in its own change with its own check of what currently asserts 500 —
not bundled into a tournament slice.

**Fixed 2026-09-12, Slice 5b.** `@ExceptionHandler({NoResourceFoundException,
NoHandlerFoundException})` returning 404 with the **standard** error body —
`timestamp / status / error / message`, the shape every other handler in the
class produces, so a client parsing `message` does not need a second one.
Logged at DEBUG rather than ERROR: a 404 on an unmapped path is routine and
logging it at ERROR is what makes a real fault harder to find.

The check that was asked for first: nothing in `e2e/specs` asserted 500 for an
unmapped URL. The only `500` in the suite is `section-05.spec.ts:282`'s
`toBeLessThan(500)`, which this can only help.

Verified live before and after on the running app, and by
`bug-39-unmapped-url.spec.ts` over three shapes of unmapped path — under `/api`,
outside it, and a real controller with a path it does not map.

---

## BUG-40 — Recording a final's result returned a broken response

**Found:** Slice 5, by a full-suite run. **Status:** fixed.

A test failed with `Parse Error: Expected LF after chunk data` on a request that
had already returned **200**, and the backend log carried six of these — every
one from `POST /api/admin/cricket/matches/{id}/result`:

```
Could not write JSON: Infinite recursion (StackOverflowError)
```

Jackson's own reference chain names the cycle:

```
TournamentTeam["tournament"] -> Tournament["championTeam"]
  -> TournamentTeam["tournament"] -> ...
```

Slice 3's V99 gave `Tournament` a `championTeam` and a `runnerUpTeam`, both
`ManyToOne` to `TournamentTeam`. `TournamentTeam.tournament` points back and
carried **no** `@JsonIgnoreProperties` at all. `CricketMatch.tournament` is
`FetchType.EAGER`, and its ignore list names `fixtures`, `stages` and
`mvpWeights` — written before the champion columns existed and never extended.

So **any** endpoint returning a `CricketMatch` entity for a decided tournament
recursed, and `/result` is the very call that sets the champion.

**Why it looked like a network fault.** The response is chunked, so by the time
serialisation blew up the 200 and its headers were usually already flushed and
could not be taken back — the client saw a malformed chunk rather than a clean
500. Whether it did depended on output-buffer timing, which is why it read as
intermittent and why re-running the test five times in isolation passed.

**The write had already committed.** The tournament really was completed,
champion and all; only the response was broken. That is why most specs never
noticed — they re-read the state afterwards — and why it survived from Slice 3
until a full-suite run caught it.

**Fixed** by cutting the back-reference: `@JsonIgnore` on
`TournamentTeam.tournament`. Nothing reads it over the wire (the frontend reads
`match.tournament`, never `team.tournament`), `TournamentTeam` is never a
`@RequestBody`, and Java callers are unaffected. It also removes a whole inlined
`Tournament` from every team on every match response.

`EntityCycleTest` reproduces it deterministically in milliseconds with no
database — the cycle is a mapping property, not a data one.

**The root cause is unfixed.** `recordResult` returns a JPA entity as its
response body, which PLAN.md standing constraint 3 forbids for new code. That is
also how BUG-38's tenant and audit columns reach the browser on this endpoint.
Converting it is a change to Slice 3's verified result path and belongs in its
own slice.

**Root cause closed 2026-09-12, Slice 5b** (backend `7226d9c`, spec `11686b4`).
`recordResult` returns `MatchResultDto` — flat, ids and names only, so no nested
entity can close a cycle here however the mapping changes later. The
`@JsonIgnore` stays: it is the correct fix for the mapping, and other endpoints
still return `CricketTeam`.

The existing result and champion specs are the regression proof and are
unchanged. One test is added, on a **final's** result because that is the call
that sets the champion and therefore the only shape that ever recursed: none of
`academyId`, `branchId`, `createdBy`, `updatedBy` appears at any depth, the
internal row `id` is not on the wire, and everything the DTO exists to carry
still is.

`coinFlip` and several other `MatchController` endpoints still return
`CricketMatch`. They are not on the champion path, so they did not recurse, but
they do carry the tenant and audit columns — see PROGRESS.md, Slice 5b, "found
while working".

---

## BUG-41 — `/api/super-admin/fees/reverse` cannot work, and never could

**Found:** Slice 5b, 2026-09-12, while writing a test for BUG-37 against
`SuperAdminFeeCorrectionService.reversePayment`.
**Severity:** low (there is a working duplicate) ·
**Status: FIXED** — consolidated into the surviving endpoint, 2026-09-14.

```java
@PostMapping("/reverse")
public ResponseEntity<Void> reversePayment(
        @RequestParam String paymentPublicId,
        @RequestParam String reason,
        @RequestAttribute("user") User actor   // <-- never set by anything
) {
```

`@RequestAttribute("user")` requires a filter or interceptor to have called
`request.setAttribute("user", …)`. **Nothing in `src/main/java` does** — grep for
`setAttribute("user"` returns zero hits. Every other controller in the codebase
resolves the actor from `Authentication`.

So the endpoint raises `ServletRequestBindingException: Missing request
attribute 'user' of type User` before the method body ever runs, and returns
**500** to any caller, always. Confirmed live against the running app on
`nca_scoring_test` with a valid SUPER_ADMIN token.

**There is a working duplicate**, which is presumably why nobody noticed:
`POST /api/admin/fees/reverse` (`AdminFeeController:427`) takes `Authentication`,
checks `ROLE_SUPER_ADMIN` explicitly, and calls
`FeePaymentService.reversePayment` — a different implementation of the same
operation. That one sets the reversal's publicId by hand and does **not** read it
back off a discarded `save()`, so it never had BUG-37.

Two questions for whoever picks this up, neither of which belongs in a tournament
slice:

1. Should the endpoint be fixed, or **deleted**? Two reversal implementations for
   one operation is worse than either. `SuperAdminFeeCorrectionService` also
   writes a richer audit row than `FeePaymentService` does.
2. The dead path's BUG-37 defect is fixed regardless (Slice 5b), so fixing the
   binding will not resurrect a null `reversalPublicId`.

**Ruling, 2026-09-14: consolidate, don't delete.** Deleting the dead endpoint was
caller-safe — nothing referenced it — but it was not a subset of the live one.
It had a double-reversal guard the live path lacked (nothing stopped the same
NORMAL payment being reversed twice through `/api/admin/fees/reverse`, only a
UI button hiding once reversed — the BUG-14 class), and its audit row was the
only place that could name the reversal a correction created (`originalAmount`,
`originalPaidOn`, `originalPublicId`, `reversalPublicId`, `critical: true`,
against the live path's bare `reason`). Both are now in `FeePaymentService
.reversePayment` (`/api/admin/fees/reverse`, the surviving endpoint), plus the
negation the dead path also had and the live one didn't — the reversal is a
true contra entry now, not a copy of the original amount. Checked before
negating: no backend query sums `FeePayment.amount` across a player's rows, and
the only UI list of payments already filters `type !== "REVERSAL"` out, so
nothing was reading the old, wrong sign.

One thing the dead path could not do that the fix needed to: it ran as a
branchless SUPER_ADMIN would (both academy A's and B's seeded SUPER_ADMIN test
accounts are deliberately branchless, per the branch-resolver census in
SESSION-HANDOFF), and `fee_payments.branch_id` is NOT NULL with no fallback —
the BUG-25 failure shape, hit live while writing the test for this fix. Closed
narrowly, for this one write: the reversal's `branchId` is now set explicitly
from the ORIGINAL payment's branch, not the acting SUPER_ADMIN's — which is
also the more correct rule regardless of BUG-25, since a SUPER_ADMIN's whole
reason to exist is acting across branches, and a reversal belongs to the branch
of what it reverses. This does not touch the general branch resolver BUG-25 is
still waiting on.

All three additions were shown failing first, one at a time, each isolated by
reverting only that one line and rebuilding: the guard alone (`Expected: 409,
Received: 200`), the audit alone (`Expected: "FPM_44", Received: undefined`),
the negation alone (`Expected: -1000, Received: 1000`).

`SuperAdminFeeCorrectionService` and `SuperAdminFeeCorrectionController` are
deleted. `/api/super-admin/fees/reverse` now returns a clean 404 (confirmed
live), not the 500 this entry originally reported.

---

## BUG-42 — `generateFixtures` resolved venue ids scoped by nothing

**Found:** Slice 7, 2026-09-12, while editing the file for an unrelated change.
**Severity:** critical (cross-tenant) · **Status: FIXED** — `743aa44`.

Recorded in `nextgen-cricket-academy/docs/tournament/PROGRESS.md` and, until the
closeout slice, **nowhere in this register** — which is how a critical
cross-tenant bug came to be invisible to anyone reading the bug list first.

`TournamentService.generateFixtures` resolved the request's `venueIds` with
`tournamentVenueRepo.findAllById(...)`: not scoped by academy, and not even by
tournament. An admin supplying another academy's venue ids had those rows loaded
and scheduled against their own fixtures, leaking the other academy's ground
names and `maxMatchesPerDay` and writing a foreign `venue_id` into their own
`fixtures` rows. Hard rule 2 made it a fix rather than a report, because the file
was already being edited.

Replaced with `findAllByIdInAndTournamentIdAndAcademyId`, proved both ways
against the live database: the removed query returned A's "A SECRET GROUND" to B;
the replacement returns zero rows, B's generated fixture carries a null
`venue_id`, and the reschedule path answers 404. Siblings audited in the same
pass — see PROGRESS.md for which were already sound and which two list reads are
deliberately unscoped, with the reason.

---

## BUG-43 — A successful Settings save reported failure

**Found:** Phases 31–34 closing pass. **Severity:** medium ·
**Status: FIXED** — `3a2496a` (`nca-web`).

`TournamentDetailPage.tsx:130` was `const [setSettingsSaved] = useState(false)`,
which binds the STATE to that name, not the setter. `setSettingsSaved(true)` on
the line after a resolved PATCH therefore threw
`TypeError: setSettingsSaved is not a function`, the throw landed in the same
handler's `catch`, and the catch set the error banner. **The tournament was
saved and the admin was told "Failed to save settings".**

TypeScript had been reporting it all along — `TS2349 This expression is not
callable` at `:400` and `:401` — inside an 88-error baseline where two more read
as noise.

Proven by reverting the line: `tournament-tabs.spec.ts` → "saving Settings
reports success and persists the change" fails with `Failed to save settings`
rendered on the page. The test asserts three things, because any one of them
passes against the defect: success is reported, failure is **not** reported, and
the row changed.

---

## BUG-44 — The Points Table rendered neither NRR nor No Result

**Found:** Phases 31–34 closing pass. **Severity:** medium ·
**Status: FIXED** in the closeout slice — `7a3620d` (`nca-web`).

`/standings` has carried `nrr` and `noResult` on every row since Phase 12.
`StandingsTab`'s columns were `# · Team · P · W · L · T · Pts`.

Two consequences. Phase 12's net run rate was computed, stored, **ranked on** and
printed into the PDF — and invisible on the screen Phase 11 names. And a side
whose match was abandoned read

```
3 Pakistan Group B 4 2 2 0 4     4 Australia Group A 3 1 1 0 3
```

Australia: three played, one won, one lost, none tied — and three points. The
column that explains it was absent.

**Fixed:** NR after T, NRR after Pts, signed to three decimal places (`%+.3f`,
the format `TournamentReportPdfService.nrr` already prints, so screen and paper
cannot disagree). Nine columns do not fit 375px, so the table scrolls inside its
own `overflow-x-auto` wrapper rather than widening the document body.

`tournament-standings-nrr-ui.spec.ts` builds a really-scored fixture (12 all-run
vs 2/1, so the two rows carry opposite-signed NRRs) plus a second fixture
recorded NO_RESULT, then compares every rendered cell to the `/standings` row it
came from, on desktop and iPhone 14. Without the fix it fails on both projects
with the NRR columnheader not found.

---

## BUG-45 — A slot booked at `09:30+05:30` was reported as `04:00`

**Found:** Phases 31–34 closing pass. **Severity:** medium ·
**Status: FIXED** in the closeout slice — backend `b88adfa`, frontend `4e8f24a`.

`fixtures.scheduled_at` is a PostgreSQL `timestamptz`, which stores an instant
and **not** the offset it was written in, and Hibernate reads such a column back
normalised to UTC. One PATCH and one GET against the running backend locate the
conversion exactly:

```
PATCH response scheduledAt : 2026-05-10T09:30:00+05:30   <- the value just set, in memory
GET  read-back scheduledAt : 2026-05-10T04:00:00Z        <- the same row, read from the DB
```

So the defect was invisible on the write and present on every read after it.
`FixtureConflictDto.when()` formatted that value as it stood and told an admin

```
VF Ground 1 is already hosting Round 1 at 10 May, 04:00
```

about a fixture they had booked for half past nine. Ruling 4's `describe()`
exists because "conflict detected" is not actionable, and a wrong time is worse
than no time.

**Fixed at the point the offset is chosen**, not at each sentence.
`AcademyZone` is the single answer to "which offset is a scheduled time written
in"; `FixtureConflictDto` (the message AND the structured `scheduledAt`, which
disagreed with each other), `FixtureDto` and the report all go through it. A
per-tournament zone would mean storing the offset, which is a column and a
migration — this puts the decision the schedulers and reminder jobs already
hard-code in one place instead of seven. On the frontend, `FixturesTab`
formatted with no `timeZone` at all, so the time rendered against the VIEWER's
clock; `formatFixtureDate`/`formatFixtureTime` pin it to the ground's.

The printed schedule also gained the time it never had: `scheduledOn` was the
date alone, so the one number the conflict rules are built around never reached
the page.

`tournament-fixture-timezone.spec.ts` runs the page under
`timezoneId: "America/New_York"` on purpose — this machine is in IST, so a
viewer-zone render passes against the defect. Unfixed it shows `🕐 12:00 am`.

---

## BUG-46 — `PATCH /fixtures/{id}` did no conflict detection

**Found:** Phases 31–34 closing pass. **Severity:** medium ·
**Status: FIXED** in the closeout slice — backend `43e9a13`, spec `a404d85`.

`FixtureScheduleService.reschedule` implemented ruling 4 in full: refuse with
409, SUPER_ADMIN override only with a reason, audited. `TournamentService.
updateFixture` — what the **Edit Fixture** form posts to — set `scheduledAt` and
`tournamentVenue` with no conflict check at all. Verified against the running
backend, same tournament, same ground, same slot, one after the other:

```
PATCH  /tournaments/{t}/fixtures/{f1}  -> ground G1, 2026-05-10T09:30:00+05:30 : 200
PATCH  /tournaments/{t}/fixtures/{f2}  -> THE SAME ground and slot             : 200
POST   /tournaments/{t}/fixtures/{f2}/reschedule -> the same ground and slot   : 409
```

So the same clash was refused through one form and accepted through the other,
and ruling 4's refusal, its SUPER_ADMIN-only override and its mandatory reason
were all bypassed by choosing the Edit form.

**Fixed by extracting the rule, not copying it.** `conflictsFor` gained an
overload taking the two sides explicitly — the Edit form can swap either side, so
the question must be asked about the fixture the edit WOULD produce, and asked
before anything is mutated, since a conflict query run after an assignment
flushes it. `enforceRuling4` is the refusal itself and both paths call it, which
makes "the same message" structural. `UpdateFixtureRequest` gained
`overrideConflicts` and `overrideReason`, and an override taken on this path is
audited as `FIXTURE_UPDATED`.

---

## BUG-47 — Seven tournament endpoints returned JPA entities

**Found:** Phases 31–34 closing pass (four of the seven probed on the wire).
**Severity:** medium · **Status: FIXED** in the closeout slice — `6b0bee1`.

```
GET   /tournaments/{id}          academyId branchId createdBy updatedBy version id
GET   /tournaments/{id}/teams    academyId branchId createdBy updatedBy version id
GET   /tournaments/{id}/stages   academyId branchId createdBy updatedBy version id
PATCH /tournaments/{id}/settings academyId branchId createdBy updatedBy version id
```

`BaseEntity` fills `createdBy` from the authentication principal's name, which in
this codebase is an EMAIL ADDRESS — `admin-a@example.com` in the test academy, a
member of staff's real address in production. So every load of the tournament
page published it. This is BUG-38's exposure by a second route, and PLAN standing
constraint 3.

The three siblings on the same return types — `addTeam`, `getSquad`,
`addToSquad` — were converted with them. `getSquad` was the worst: it serialised
a whole `Player` per squad entry, which is a date of birth and a guardian's phone
number on a list that needs a name and a role.

**The guard could not have caught any of it.** `ResponseDtoLeakTest` enumerates
`com.nca.cricket.dto`, and an entity is not in that package — which is how seven
endpoints leaked while it reported clean. It now also walks every
`@RestController` handler, unwrapping `ResponseEntity`/`List`/`Page`/`Set`/
`Optional`, and fails on a JPA entity. **105 handlers elsewhere still return
entities**, listed as debt by module (fees, players and batches, live scoring,
CMS, expenses, summer camp, enquiries, platform) under the same contract as the
DTO list: it may only ever get shorter. The tournament seven are deliberately NOT
listed, which is what makes the guard enforce them.

---

## BUG-48 — `updateSettings` and `PUT /{id}` have no service-layer role check

**Found:** Phases 31–34 closing pass. **Severity:** low ·
**Status: FIXED** — backend `4f2282b`, spec `c5b3e9a`. The sibling sweep found
**eleven** write methods with no service-layer role check, not the two recorded
here; `PUT /{id}` already had one. `listFixtures` is deliberately exempt — its
write is a self-heal, and gating it would 403 a coach's fixture list.

`TournamentService.updateSettings` resolves the tournament with `getTournament`
(academy-scoped, correct) and then writes, with no role assertion — unlike its
neighbours, which call `validateAdminOrSuperAdmin`. `PUT /{id}` has the same
shape.

**Checked, and the answer came back negative:** a real `ROLE_COACH` token gets
**403** on `PATCH /settings`, on `PUT /{id}` and on `POST /{id}/teams`, and the
tournament's name, `oversPerInnings` and `maxMatchesPerDay` were unchanged
afterwards. `SecurityConfig`'s `/api/admin/**` rule blocks it. So this is not
exploitable today — but that route rule is then the single point of failure on a
write, which is what `.claude/rules/multi-tenancy.md` says not to rely on, and
every neighbouring method in the same service does assert the role.

---

## BUG-49 — The points table counts knockout fixtures

**Found:** Phases 31–34 closing pass. **Severity:** low ·
**Status: FIXED** — backend `449f8c2`, spec `acecd3e`. **Ruling given: a knockout
result never affects the points table.** LEAGUE and GROUP count; KNOCKOUT and
PLAYOFFS do not. Applied to both points tables and to the two ranking calls that
pick qualifiers, since seeding a bracket from a ranking that already counted it
is circular. NOT applied to the statistics boards, which are a separate decision.

`standingsOf` walks `fixtureRepo.findCompletedByTournamentId` with no stage
filter, so once the semis and the final are played the **group** table includes
them: in the closing run's championship the two finalists finish on `P=5` in a
three-match group.

Arguably correct for a league and wrong for a group-and-knockout tournament, and
**undefined by Phase 11** — which is why this is a finding rather than a fix. The
decision is whether a points table means "the group" or "everything played".

---

## BUG-50 — `createExternalPlayer`'s uniqueness checks are unscoped by academy

**Found:** Phases 31–34 closing pass. **Severity:** medium ·
**Status: FIXED** — backend `12e111f` (migration **V105**), spec `a46fe79`.
**Ruling given: a phone belongs to an academy, not to the platform.** The sweep
found EIGHT unscoped call sites across three files, not one — including
`/check-email` and `/check-phone`, which answered for any academy and took no
authentication at all, and `SummerCampEnrollmentService`, whose unscoped email
match could enrol ANOTHER academy's player: a cross-tenant write, not an oracle.
The four unscoped repository methods are deleted. See the backlog
section at the end of this file.

`AdminPlayerService.createExternalPlayer` (`:351`, `:363`):

```java
playerRepo.findByPhone(req.getPhone()).ifPresent(p -> { throw 409; });
playerRepo.findByEmailIgnoreCase(req.getEmail()).ifPresent(p -> { throw 409; });
```

Neither takes `academyId`. Verified:

```
academy A: POST /api/admin/players/external  phone 9100022254  -> 200
academy B: POST /api/admin/players/external  phone 9100022254  -> 409
           {"message":"A player with this phone already exists"}
```

Academy B has no player with that phone. It was told one exists because academy A
has one — a cross-tenant **existence oracle**, and the hard-rule-2 bug class.

It is listed as backlog rather than fixed because the fix is not only a scoping
change: adding `academyId` to both lookups also **changes the product rule** from
"a phone is unique across the platform" to "a phone is unique within an academy",
and that is a decision about whether siblings at two academies, or a shared family
address, may be registered twice. See the backlog entry for what has to be decided
and what is true either way.

---

## BUG-51 — No endpoint advances to the next knockout round

**Found:** Phases 31–34 closing pass. **Severity:** low ·
**Status: FIXED** — backend `a00c85e`, frontend `a641535`.
`POST /{id}/advance-round` pairs the last completed round's winners into the next
using `FixtureGenerator.knockout`, and flags a two-winner tie as the final —
which is what makes the champion derivation fire. It refuses rather than guesses
on an unfinished round, an undecided tie, or a bracket already decided.

`advanceToKnockout` always re-seeds **round 1** from the group standings. There
is no "advance the bracket" call, so after the semis the final must be added as a
**manual fixture** and flagged with `PATCH .../final`. That is what the Fixtures
tab offers and what the closing spec does, so the flow works — but it is a manual
step in an otherwise automatic bracket, and an operator who expects the final to
appear will not find it.

---

## BUG-52 — `addManualFixture` numbers the round by fixture count

**Found:** Phases 31–34 closing pass. **Severity:** low ·
**Status: FIXED** — backend `449f8c2`, spec `acecd3e`. The round is now
`max(roundNumber) + 1`, with an explicit `roundNumber` honoured so a second
simultaneous tie can join round 1. Shown failing first: Expected 2, Received 3.

```java
int round = fixtureRepo.findAllByStageIdOrderByRoundNumberAsc(stage.getId()).size() + 1;
```

After two semi-finals — both correctly round 1, being simultaneous — the final
added to the same stage becomes **round 3**, not round 2. The same defect class
`FixtureGeneratorTest` found in the knockout generator, surviving in the manual
path.

---

## BUG-53 — `linkMatchToFixture` failure is swallowed

**Found:** Phases 31–34 closing pass. **Severity:** low ·
**Status: FIXED** — `7db2727`. It now raises a 30-second error toast carrying the
server's reason and the recovery, without aborting the flow — the match is
created and startable, so a dead end would not be an improvement.

`MatchSetupPage.handleStartMatch`:

```ts
try { await linkMatchToFixture(tournamentId, fixtureId, createdMatch.publicId); }
catch { /* non-fatal */ }
```

`link-match` is the **only** thing that moves a fixture to `IN_PROGRESS`, and a
fixture that is not `IN_PROGRESS` never offers "Live Scorer" — it keeps offering
"Start Match", which would create a second match and rebind `fixtures.match_id`
to it, orphaning the first scored match. Calling that non-fatal turns a
recoverable failure into a silently broken fixture. It should at least warn.

---

## BUG-54 — `createScoredTournament` tags its rows with a clock two workers can share

**Found:** the closeout slice, writing BUG-44's spec. **Severity:** low (test
infrastructure) · **Status: FIXED** — `ae20cde`. The tag is 8 random DIGITS
(`e2e/fixtures/tag.ts`) and the per-spec workarounds are gone. Digits, not hex:
team names are printed into PDF columns sized in points, and a variable-width
tag failed two runs in three while reading as a flaky fixture.
Until then it was worked around inside each spec rather than in the fixture the
five of them share.

`e2e/fixtures/scoredTournament.ts` tags everything it creates with
`${Date.now() % 1000000}` plus a per-PROCESS counter, and tears down by MATCHING
ON THE NAME. Two Playwright projects that start in the same millisecond therefore
build identically-named tournaments, players and batches — and the first teardown
deletes the other project's rows out from under it. Seen as a 404 adding a player
to a squad that had just been created, and as

```
ERROR: update or delete on table "cricket_matches" violates foreign key
constraint "fixtures_match_id_fkey" on table "fixtures"
```

when one project's teardown reached the other's still-linked match.

`championship.ts` already solves this by keying teardown on the tournament's
**public id** rather than its name, and says why in a comment. The closeout slice
worked around it inside its own spec — a worker-unique label, and a teardown key
built from the tournament name rather than the tag — rather than changing a
fixture five other specs depend on. The fixture itself should adopt
`championship.ts`'s pattern.

**This is not an application bug.** It is recorded because it produces failures
that read like application bugs, and it has now cost two sessions time.

---

## BUG-55 — `SummerCampFeeRule.version` is both a domain counter and Hibernate's optimistic-lock field

**Found:** investigating BUG-37's root-cause fix, checking every entity for
whether leaving `@Version` null-until-persist could break optimistic locking.
**Status:** filed, not fixed — pre-existing, unrelated to BUG-37, and out of
scope for that change ("do not touch anything else").

`SummerCampFeeRule` declares its own plain `private Integer version = 1;` — a
genuine business field, the fee-rule revision number, part of the real unique
constraint `(camp_id, batch_count, version)`. It shadows `BaseEntity`'s
`@Version`-annotated field **by name**.

Confirmed empirically (a throwaway JUnit test against the live Hibernate
metamodel, since the two plausible guesses disagree and only one is right):
Hibernate's metamodel still reports `isVersion=true` for this entity —
inherited from `BaseEntity`'s original `@Version` declaration — but the
**runtime value read and written is the subclass's own field**, confirmed
against the live DB column default (`1`, matching the subclass initialiser,
not BaseEntity's `0`).

Root cause is a migration-ordering collision, not application code:
`V9__summer_camps.sql` created `summer_camp_fee_rules.version` as a domain
column (`DEFAULT 1`) before `BaseEntity.@Version` existed. `V17__version.sql`'s
later blanket `ADD COLUMN IF NOT EXISTS version ... DEFAULT 0` rollout across
~29 tables was a silent no-op here — the column already existed — leaving one
physical column to serve two conflicting purposes once the entity started
extending `BaseEntity`.

Two consequences, checked against the entity's actual usage
(`SummerCampService`'s fee-rule creation loop):

- **No observable create-time symptom today.** The loop sets `publicId`
  explicitly before `save()` and never reads `.getId()`/`.getPublicId()` back
  off the discarded return, so it does not trip `SaveReturnDiscardedTest` and
  BUG-37's root-cause fix neither improves nor worsens it — this entity's own
  `isNew()` was already, and remains, incorrectly `false` on create for an
  unrelated reason (its own non-null field, not `BaseEntity`'s).
- **Live risk on the update path.** Hibernate's optimistic-lock mechanism will
  auto-increment this column on *any* field update to an existing row — not
  only on an intentional fee-rule revision — which can desync the "revision
  number" from its intended meaning and collide with the unique constraint.

Not fixed here: needs its own decision (rename the domain column, or give the
entity an explicit `@Version` on a separate physical column) and its own
regression pass, the same reasoning BUG-37 applied to leaving its own root
cause for a dedicated slice.

---

## Backlog — needs a product ruling before it is code

### Is a phone number unique to an academy, or to the platform? (BUG-50)

**What has to be decided.** `createExternalPlayer` refuses a phone or an email
that exists **anywhere on the platform**. Scoping those two lookups by
`academyId` — which hard rule 2 otherwise requires without discussion — also
changes the product rule to "unique within an academy". That is a business
decision, not a code-style one:

- **Unique per academy** (the scoping fix): siblings at two academies, or two
  families sharing one contact number, can both be registered. Two rows then
  exist for one phone, and anything that looks a player up BY phone — a future
  parent portal, an SMS reply handler, a WhatsApp integration — has to say which
  academy it means.
- **Unique per platform** (today's behaviour): one phone, one player, ever. Clean
  for lookups, and wrong for the legitimate case above. It is also the rule that
  produces the leak below.

**What is true either way, and is not up for decision:** the current
implementation is a cross-tenant **existence oracle**. Academy B learns whether a
phone or an email is registered at academy A by watching for the 409, and the
message says which field matched. Whichever rule wins, B must not be able to
discover A's data — a platform-wide rule can be enforced with a database
constraint and a message that does not confirm what matched, rather than with a
cross-tenant read whose result is handed back.

**When it is picked up:** grep the whole of `AdminPlayerService` for siblings in
the same pass. That step has found more almost every time it has been run in this
project.
