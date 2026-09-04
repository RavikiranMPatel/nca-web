# T20 Scoring — Campaign Summary

A Playwright suite covering the 248-scenario T20 scoring workbook against the live
scorer, on desktop and two mobile viewports, plus the thirteen bugs the work
uncovered and fixed along the way.

Companion documents: `WORKBOOK-EXTRACTED.md` (the workbook), `COVERAGE-MATRIX.md`
(every scenario classified), `TEST-RESULTS.md` (generated from the reporter),
`BUGS-FOUND.md` (every bug, with evidence), `TEST-PLAN.md` (how the harness works).

---

## Where it ended up

| | |
|---|---|
| Workbook scenarios | 248 |
| PASS | 153 |
| Skipped, not implemented | 84 |
| Ambiguous — current behaviour pinned | 7 |
| Expected-fail (open bugs) | 4 |
| Tests, all projects | 942 |
| Golden regression | 33 steps, ~1.6s |
| Unexpected failures | **0** |
| Full suite runtime | 249s |
| Smoke runtime (`npm run e2e:smoke`) | 39s, 45 tests |

Projects: `desktop` (Chromium 1440x900), `mobile` (WebKit iPhone 14),
`mobile-chrome` (Chromium Pixel 7) — 222 / 222 / 221 passing respectively, with
two expected-fails and ~90 skips each. Every spec runs in all three except the
golden regression, which runs on desktop and one mobile project.

The seven ambiguous pins are counted separately from PASS on purpose. A pinned
test records what the app actually does where the workbook says something else —
it guards against regression, but it is not agreement with the workbook, and
rolling it into the pass count would overstate coverage. They are T20-002
(custom timing), T20-220/221/225/230/232 (the interruption model) and EDGE-35
(crossing before a catch).

---

## Bugs found and fixed

Thirteen bugs, each fixed in its own backend commit with the test-side change
committed separately, and each verified by capturing state before and after and
proving only the intended field moved.

| Bug | What was wrong | Severity | Fix |
|---|---|---|---|
| BUG-01 | Strike inverted on **every** wide and no ball — the one-run penalty was counted as a run someone had run | critical | `e748bec` |
| BUG-02 | Byes and leg-byes charged to the bowler; eight call sites shared the wrong rule | high | `715a382` |
| BUG-03 | The no-ball Bye and Leg Bye buttons posted identical payloads, so those runs landed in the no-ball bucket | high | `c618147` |
| BUG-04 | `extras_penalty` absent from `InningsStateDTO`, so penalty runs were invisible and extras could not reconcile | medium | `8549c47` |
| BUG-05 | A free hit was cleared by a following wide, and only run outs were permitted on one | high | `6e2ced0` |
| BUG-06 | **`findMTP` looked a player up by public id with no `academyId`** — every scoring endpoint went through it | critical | `e849f60` |
| BUG-10 | No started match could be deleted; a raw Postgres FK error reached the client | high | `b9a58a5` |
| BUG-12 | Undoing to zero deliveries lost both openers and the bowler | medium | `ab34118` |
| BUG-13 | A batter at the crease could be missing from `batterStats` after an undo | low | `ab34118` |
| BUG-14 | The consecutive-over rule was enforced only by the UI picker | medium | `c8c05a8` |
| BUG-15 | Obstruction, handled ball, hit twice and timed out were credited to the bowler | medium | `8cb9fcd` |
| BUG-16 | An undone dismissal left a stale `crease_exited_at` | medium | `ab34118` |
| BUG-17 | A replay erased penalty runs entirely, along with the runs they contributed | high | `8549c47` |

BUG-06 was stop-work under CLAUDE.md hard rule 2: found while reading the scoring
service for Phase 1, fixed before any test was written, the dormant unscoped
repository method deleted, and the fix proven by stashing it and watching the
cross-tenant test go red.

Three of the rest were found only because an earlier fix made them reachable —
BUG-15 by allowing obstruction on a free hit, BUG-16 and BUG-17 while verifying the
fixes for BUG-12 and BUG-04. Each was recorded as its own bug rather than folded in
silently.

Two shared definitions came out of this work and are worth keeping: `BowlingAttribution`
(which runs a bowler is charged, with a matching SQL form) and `BowlerCredit` (which
dismissals a bowler is credited with, as an allow-list). Before them, the same rule
existed in three or four places that did not agree.

---

## Bugs still open

| Bug | What | Severity | Note |
|---|---|---|---|
| BUG-18 | `postBall` has no idempotency key, so any retry double-scores | high | Blocks the offline story; `test.fail()` on T20-348 / EDGE-27 |
| BUG-19 | `extra_type` is unvalidated; an unknown value is stored and its runs vanish from every bucket | high | Same shape as BUG-15; `test.fail()` on EDGE-04 / EDGE-36 |
| BUG-07 | `ROLE_SCORER` cannot reach any scoring endpoint | medium | Needs a product decision on whether the role is real |
| BUG-08 | `ROLE_COACH` cannot load the scorer page it is granted access to | medium | Either the grant or the route guard is wrong |
| BUG-09 | `docker-compose.yml` pins Postgres 15 on 5433; reality is 17 on 5432 | low | Docs/infra |
| BUG-11 | Match public ids are minted from `currentTimeMillis` and collide | medium | Sibling generators already use UUIDs |

---

## Product gaps, by area

These are features the workbook assumes and the app does not have. None is a
defect; together they are the distance between this scorer and the workbook's model
of one. 84 scenarios skip for these reasons.

**Scoring events.** No dead-ball concept of any kind (9 scenarios) — an umpire
calling one cannot be recorded. No short run. No no-ball *reason* or wide *type*
classification (6). Three dismissals are absent from the app entirely: hit the ball
twice, handled the ball, timed out.

**Milestones and analytics.** No duck classifications of any kind (5). No hat-trick,
four-in-four or five-in-an-over detection. No bowler milestone counter, no wicket
maiden. No dropped catch, misfield, or direct-hit/assist distinction.

**Partnerships.** Only the *current* partnership is held, on the innings row. No
partnership is ever persisted, so there is no history, no end time and no milestone
tracking.

**Timing.** No wall-versus-active duration anywhere: interruption time accumulates
only as one cumulative `total_break_seconds` and is never subtracted from a batter
or partnership duration. No drinks-break type. No over-rate rule; the session
estimate is hardcoded in the client as overs x 4.25.

**Interruptions.** No DELAYED or SUSPENDED status — a paused match stays
IN_PROGRESS with a free-text reason. No per-interruption record; the only
per-event trace is the audit log.

**Results.** No FORFEIT or CONCEDED result type. No rain-revision model at all:
`Innings.target` is computed once and never revised, so DLS, VJD, revised targets
and recalculation history have nothing to attach to.

**Powerplay and field restrictions.** Absent from the scoring module entirely.

**Offline.** Deferred by design (CLAUDE.md). No queue, no service worker, no
idempotency — see BUG-18, which has to be solved first.

**Corrections.** No redo. Editing a batter is refused by design. No post-start
batting-order or captain correction. **No audit trail for any scoring correction**:
`ScoringService` writes exactly one audit row in the whole class, inside
`changeWicketkeeper`.

---

## Deploy prerequisites

Read this before any of these fixes reaches a tenant with real scored matches.

**1 — V97 migration.** `V97__no_ball_runs_type.sql` adds a nullable column and a
check constraint to `deliveries`. Additive and safe, applies in place. Flyway runs
with `validate-on-migrate=true`, so it must not be edited after being applied
anywhere.

**2 — Stored stats drift on existing matches.** This is the one that needs a
decision, not just a deploy. BUG-01, BUG-02 and BUG-15 changed how
`innings_bowling_stats` and strike are computed. Those rows are *stored*, written by
`applyBall` at scoring time, and are **not** recomputed on read.

- Paths that recompute from `deliveries` — the scorecard, career and tournament
  stats — will show the new, correct figures immediately.
- The stored rows keep the old, wrong figures until that innings is replayed.

So an existing match can read inconsistently between its scorecard and its stored
bowling figures. A replay of every innings (an undo plus a re-post of the last
delivery triggers one) reconciles them. Decide deliberately whether to run that
sweep, and note that a replay also recomputes maidens, which changed with BUG-02.

**3 — Historical no-ball extras cannot be reclassified.** Pre-V97 no-ball rows have
`no_ball_runs_type = NULL`, and `applyNoBallExtras` deliberately keeps the old
behaviour for them. Matches scored before the deploy keep slightly overstated
`extras_no_ball` and understated byes. There is no data migration and there should
not be: the information was never captured. Team totals, extras totals and bowler
figures are unaffected.

**4 — `GlobalExceptionHandler` contract change.** Constraint violations no longer
return raw Postgres text; they return a stable generic message and log the specific
cause at warn. **A client can no longer branch on which constraint failed.** The
suite's own BUG-11 retry had to be rewritten for this. If any consumer depends on
the old text, it breaks — the right fix is a machine-readable error code, not
putting schema detail back in the message.

**5 — New UI on the live scorer.** The header now shows an extras readout,
`Ex <total> (Nw Nnb Nb Nlb Np)`, on the existing wrap row. It is the only real UI
addition in this work; everything else added to `LiveScorerPage.tsx` is
`data-testid` attributes. Worth a look on a narrow phone before shipping.

**6 — Run the smoke suite.** `npm run e2e:smoke` — sections 2, 3, 5 and the golden
regression on desktop, about 40 seconds. Intended before every deploy.

---

## Running the suite

Full setup is in `TEST-PLAN.md`. In short:

```bash
# once: an empty database, migrated from zero by Flyway on first boot
createdb -h localhost -p 5432 -U postgres nca_scoring_test

# backend on 8081, beside whatever is on 8080
cd nextgen-cricket-academy
./mvnw spring-boot:run -Dspring-boot.run.arguments="\
  --server.port=8081 \
  --spring.datasource.url=jdbc:postgresql://localhost:5432/nca_scoring_test \
  --app.root-domain=localhost --app.email.enabled=false"

# the suite starts its own Vite dev server
cd nca-web/nca-web
npm run e2e            # everything, all three projects, ~250s
npm run e2e:smoke      # sections 2/3/5 + golden, desktop, ~40s
npm run e2e:report     # open the HTML report
node e2e/tools/build-results.mjs   # regenerate TEST-RESULTS.md
```

Credentials live in `.env.test`, which is gitignored and holds two local test
academies. It is not committed; regenerate it per `TEST-PLAN.md` if missing.

The config **refuses to start** unless the target is localhost. This suite creates,
scores and deletes matches; pointed anywhere else it would write destructive test
data into a live tenant.

### The golden regression

`e2e/fixtures/golden/golden-match.json` records the expected full state after each
of the 33 steps of the workbook's sequence. The spec compares live state to it at
every step and fails on the **first** divergence, naming the step.

Regenerate deliberately and read the diff:

```bash
GOLDEN_UPDATE=1 npx playwright test e2e/specs/section-17-golden.spec.ts --project=desktop
```

The fixture is the record of intended behaviour. Changing it is a decision, not a
refresh — its numbers were checked against the workbook's own stated expectations
when it was created.
