# T20 Cricket Scoring — Test Scenario Workbook (extracted)

Source: `~/Desktop/T20_Cricket_Scoring_Complete_Test_Scenarios.pdf` (71 pages, extracted with `pdftotext -layout`).

**Extraction note.** The PDF renders sections 1–15 twice (pages 3–32 and 33–62); the two copies are byte-identical after whitespace normalisation, and were deduped by scenario ID — 212 scenarios × 2 occurrences. Section 16 (`EDGE-01`–`EDGE-36`), section 17 (golden regression sequence) and section 18 (sign-off checklist) appear once.

**Unique scenario count: 248** — 212 `T20-xxx` (sections 1–15) + 36 `EDGE-xx` (section 16). Sections 17 and 18 are checklists, not ID'd scenarios; they are reproduced verbatim as appendices.

Wording below is the workbook's own, unedited.

## Preamble

**Purpose.** A practical manual/automation test workbook covering the T20 scoring scenarios discussed: ball scoring, extras, wickets, strike changes, over completion, interruptions, timing, partnerships, live notes, corrections, recovery, offline sync, statistics, Super Over and rare edge cases.

**Baseline.** India vs Australia • T20 • 20 overs • Virat Kohli striker • KL Rahul non-striker • Bumrah bowler. Reset the match between independent tests.

**For every delivery verify.** Team score • wickets • batter runs/balls • bowler overs/runs/wickets • extras • legal-ball count • striker/non-striker • partnership • timestamps • audit/event history.

## Section index

| § | Title | Scenario IDs | Count |
|---|-------|--------------|-------|
| 1 | T20 Match Setup & Pre-Match | `T20-001` – `T20-008` | 8 |
| 2 | Basic Legal Deliveries | `T20-010` – `T20-016` | 7 |
| 3 | Extras — Wide / No Ball / Bye / Leg Bye | `T20-020` – `T20-039` | 20 |
| 4 | No-Ball / Wide Types & Free Hit | `T20-050` – `T20-066` | 17 |
| 5 | Striker / Non-Striker / Last Ball / Over Completion | `T20-080` – `T20-095` | 16 |
| 6 | Wickets & Dismissals | `T20-110` – `T20-126` | 17 |
| 7 | Dead Ball / Special Events | `T20-140` – `T20-149` | 10 |
| 8 | Bowler Change / Incomplete Over | `T20-160` – `T20-165` | 6 |
| 9 | Milestones / Partnerships / Timing / Live Notes | `T20-180` – `T20-204` | 25 |
| 10 | Match Timing / Pause / Rain | `T20-220` – `T20-232` | 13 |
| 11 | T20 Innings End / Target / Rain / Results | `T20-250` – `T20-264` | 15 |
| 12 | Super Over / Powerplay / Field Restrictions | `T20-280` – `T20-292` | 13 |
| 13 | Corrections / Undo / Redo / Replay | `T20-310` – `T20-324` | 15 |
| 14 | Crash / Logout / Offline / Sync | `T20-340` – `T20-351` | 12 |
| 15 | Fielding / Batting / Bowling Statistics | `T20-370` – `T20-387` | 18 |
| 16 | Critical Combination / Edge-Case Matrix | `EDGE-01` – `EDGE-36` | 36 |
| 17 | Golden T20 Regression Match | — (28-step sequence) | — |
| 18 | Final QA Sign-Off | — (checklist) | — |
| | **Total ID'd scenarios** | | **248** |

## 1. T20 Match Setup & Pre-Match

### T20-001 — Create standard T20

- **Setup:** New match.
- **Action:** Create T20.
- **Expected:** 20 overs configured; timing profile attached; teams/venue saved.
- **Verify:** match state • database

### T20-002 — Custom T20 timing

- **Setup:** 20-over competition with custom timing.
- **Action:** Save custom timing.
- **Expected:** Custom innings duration/interval/over-rate rules stored; no hardcoded timing.
- **Verify:** timing config

### T20-003 — Toss — bat

- **Setup:** Team A wins toss.
- **Action:** Choose Bat.
- **Expected:** Team A bats first.
- **Verify:** innings

### T20-004 — Toss — bowl

- **Setup:** Team A wins toss.
- **Action:** Choose Bowl.
- **Expected:** Team B bats first.
- **Verify:** innings

### T20-005 — Playing XI = 11

- **Setup:** Squad available.
- **Action:** Select exactly 11.
- **Expected:** XI valid; no duplicates.
- **Verify:** roster

### T20-006 — Substitute/Impact player

- **Setup:** Applicable league rule enabled.
- **Action:** Apply legal replacement.
- **Expected:** Eligibility and reason/time recorded.
- **Verify:** roster • audit

### T20-007 — Openers

- **Setup:** Match ready.
- **Action:** Select Virat/KL.
- **Expected:** Virat striker, KL non-striker.
- **Verify:** UI • state

### T20-008 — Opening bowler

- **Setup:** Match ready.
- **Action:** Select Bumrah.
- **Expected:** Bumrah starts over.
- **Verify:** state

## 2. Basic Legal Deliveries

### T20-010 — Dot ball

- **Setup:** 0/0, 0.0, Virat striker.
- **Action:** Record 0.
- **Expected:** 0/0; 0.1; Virat faces; batter/bowler legal ball +1.
- **Verify:** score • balls • strike

### T20-011 — One run

- **Setup:** Virat striker.
- **Action:** Record 1.
- **Expected:** 1/0; Virat +1; KL faces next.
- **Verify:** score • strike

### T20-012 — Two runs

- **Setup:** Virat striker.
- **Action:** Record 2.
- **Expected:** 2/0; Virat +2; Virat remains striker.
- **Verify:** score • strike

### T20-013 — Three runs

- **Setup:** Virat striker.
- **Action:** Record 3.
- **Expected:** 3/0; Virat +3; KL faces.
- **Verify:** score • strike

### T20-014 — Four

- **Setup:** Virat striker.
- **Action:** Record 4.
- **Expected:** 4/0; Virat +4; 4 counter +1.
- **Verify:** score • 4s

### T20-015 — Six

- **Setup:** Virat striker.
- **Action:** Record 6.
- **Expected:** 6/0; Virat +6; 6 counter +1.
- **Verify:** score • 6s

### T20-016 — Batter balls faced

- **Setup:** Legal 1/2/4/6.
- **Action:** Record delivery.
- **Expected:** Batter ball faced increments; illegal extras handled separately.
- **Verify:** batting stats

## 3. Extras — Wide / No Ball / Bye / Leg Bye

### T20-020 — Wide

- **Setup:** Virat striker.
- **Action:** Record 1 wide.
- **Expected:** Team +1; batter +0; bowler +1; legal ball unchanged.
- **Verify:** team • batter • bowler • legal ball

### T20-021 — Wide + 1 run

- **Setup:** Wide; one additional run.
- **Action:** Record wide + run.
- **Expected:** Team +2; wide +2; batter 0; bowler +2; illegal delivery.
- **Verify:** extras • strike

### T20-022 — Wide + 2 runs

- **Setup:** Wide; two additional runs.
- **Action:** Record wide +2.
- **Expected:** Team +3; batter 0; bowler +3; illegal delivery.
- **Verify:** extras

### T20-023 — Wide + 3 runs

- **Setup:** Wide; three additional runs.
- **Action:** Record wide +3.
- **Expected:** Team +4; batter 0; bowler +4.
- **Verify:** extras

### T20-024 — Wide to boundary

- **Setup:** Keeper misses; wide reaches boundary.
- **Action:** Record boundary wide.
- **Expected:** Scenario total +5 wides; bowler +5; illegal delivery.
- **Verify:** wides • bowler

### T20-025 — Wide + stumping

- **Setup:** Wide; striker leaves crease; no run attempt; keeper breaks stumps.
- **Action:** Record event.
- **Expected:** Wide recorded; stumping only if legally valid; no legal ball.
- **Verify:** dismissal • extras

### T20-026 — Wide + run out

- **Setup:** Wide; batter attempts run; throw breaks wicket.
- **Action:** Record event.
- **Expected:** Wide extras + run out; correct batter out; no legal ball.
- **Verify:** dismissal • extras

### T20-027 — No ball

- **Setup:** No ball, no bat run.
- **Action:** Record NB.
- **Expected:** Team +1; batter 0; bowler +1; legal ball unchanged; free-hit state.
- **Verify:** score • free hit

### T20-028 — No ball + 1 bat run

- **Setup:** NB + 1 off bat.
- **Action:** Record NB+1.
- **Expected:** Team +2; batter +1; bowler +2.
- **Verify:** score

### T20-029 — No ball + four

- **Setup:** NB + four off bat.
- **Action:** Record NB+4.
- **Expected:** Team +5; Virat +4; bowler +5; illegal delivery.
- **Verify:** score • bowler

### T20-030 — No ball + six

- **Setup:** NB + six off bat.
- **Action:** Record NB+6.
- **Expected:** Team +7; Virat +6; bowler +7.
- **Verify:** score

### T20-031 — No ball + 2 byes

- **Setup:** NB; batter misses; 2 byes.
- **Action:** Record NB+2 byes.
- **Expected:** Team +3; batter 0; bowler +1 only; byes +2; illegal.
- **Verify:** extras • bowler

### T20-032 — No ball + leg byes

- **Setup:** NB plus applicable leg-bye runs.
- **Action:** Record components.
- **Expected:** Team = NB + leg byes; batter 0; bowler gets NB penalty only.
- **Verify:** extras

### T20-033 — Bye 1/2/3/4

- **Setup:** Legal delivery; batter misses.
- **Action:** Record bye.
- **Expected:** Team +N; batter 0; bowler 0; legal ball +1.
- **Verify:** extras • bowler

### T20-034 — Leg bye 1/2/3/4

- **Setup:** Legal delivery; applicable leg bye.
- **Action:** Record leg bye.
- **Expected:** Team +N; batter 0; bowler 0; legal ball +1.
- **Verify:** extras

### T20-035 — Overthrow on bat

- **Setup:** Bat runs plus overthrow.
- **Action:** Record total.
- **Expected:** Team/batter/bowler attribution and final ends correct.
- **Verify:** delivery breakdown

### T20-036 — Overthrow on bye

- **Setup:** Bye plus overthrow.
- **Action:** Record total.
- **Expected:** All credited as byes; batter/bowler 0.
- **Verify:** extras

### T20-037 — Overthrow on leg bye

- **Setup:** Leg bye plus overthrow.
- **Action:** Record total.
- **Expected:** All credited as leg byes; batter/bowler 0.
- **Verify:** extras

### T20-038 — Overthrow on wide

- **Setup:** Wide plus additional/overthrow runs.
- **Action:** Record total.
- **Expected:** All applicable runs credited to wides; illegal ball.
- **Verify:** extras

### T20-039 — Overthrow on no ball

- **Setup:** NB plus running/overthrow.
- **Action:** Record components.
- **Expected:** NB penalty + applicable chargeable runs; byes/leg-byes excluded from bowler.
- **Verify:** extras • bowler

## 4. No-Ball / Wide Types & Free Hit

### T20-050 — Front-foot no ball

- **Setup:** Bowler oversteps.
- **Action:** Signal NB.
- **Expected:** No-ball reason saved; illegal ball.
- **Verify:** reason

### T20-051 — Back-foot no ball

- **Setup:** Configured violation.
- **Action:** Signal NB.
- **Expected:** No-ball event saved.
- **Verify:** reason

### T20-052 — High full toss

- **Setup:** Configured no-ball height.
- **Action:** Record NB.
- **Expected:** No-ball classification stored.
- **Verify:** reason

### T20-053 — Dangerous bowling

- **Setup:** Umpire calls NB.
- **Action:** Record event.
- **Expected:** NB + applicable sanction metadata.
- **Verify:** reason

### T20-054 — Multiple bounce

- **Setup:** Delivery violates bounce rule.
- **Action:** Record NB.
- **Expected:** NB classification stored.
- **Verify:** reason

### T20-055 — Illegal action/throwing

- **Setup:** Illegal action called.
- **Action:** Record NB.
- **Expected:** NB classification stored.
- **Verify:** reason

### T20-056 — Off-side wide

- **Setup:** Ball outside allowed reach.
- **Action:** Record wide.
- **Expected:** Wide; illegal delivery.
- **Verify:** extras

### T20-057 — Leg-side wide

- **Setup:** Ball outside allowed reach.
- **Action:** Record wide.
- **Expected:** Wide; illegal delivery.
- **Verify:** extras

### T20-058 — Above-head wide

- **Setup:** Configured wide condition.
- **Action:** Record wide.
- **Expected:** Wide; illegal delivery.
- **Verify:** extras

### T20-059 — No ball creates free hit

- **Setup:** NB completed.
- **Action:** Proceed to next ball.
- **Expected:** Free-hit indicator shown for next eligible delivery.
- **Verify:** state • UI

### T20-060 — Free hit + bowled

- **Setup:** Free hit; ball hits stumps.
- **Action:** Record.
- **Expected:** Bowled not awarded under configured free-hit rules.
- **Verify:** dismissal validation

### T20-061 — Free hit + LBW

- **Setup:** Free hit; LBW appeal.
- **Action:** Record.
- **Expected:** LBW not awarded under configured free-hit rules.
- **Verify:** dismissal validation

### T20-062 — Free hit + caught

- **Setup:** Free hit; catch completed.
- **Action:** Record.
- **Expected:** Caught not awarded under configured free-hit rules.
- **Verify:** dismissal validation

### T20-063 — Free hit + stumped

- **Setup:** Free hit; keeper breaks stumps.
- **Action:** Record.
- **Expected:** Stumping not awarded under configured free-hit rules.
- **Verify:** dismissal validation

### T20-064 — Free hit + run out

- **Setup:** Free hit; batter attempts run; wicket broken.
- **Action:** Record run out.
- **Expected:** Run out allowed; correct batter out.
- **Verify:** dismissal

### T20-065 — Free hit + obstruction

- **Setup:** Free hit; obstruction.
- **Action:** Record event.
- **Expected:** Configured obstruction outcome; no accidental forbidden dismissal.
- **Verify:** dismissal

### T20-066 — Free hit + hit ball twice

- **Setup:** Free hit; hit-ball-twice event.
- **Action:** Record.
- **Expected:** Configured outcome recorded.
- **Verify:** dismissal

## 5. Striker / Non-Striker / Last Ball / Over Completion

### T20-080 — Odd-run strike

- **Setup:** Virat scores 1 or 3.
- **Action:** Complete delivery.
- **Expected:** Strike changes before next delivery.
- **Verify:** strike

### T20-081 — Even-run strike

- **Setup:** Virat scores 2 or 4.
- **Action:** Complete delivery.
- **Expected:** Virat remains striker until over-end logic.
- **Verify:** strike

### T20-082 — Last legal ball = dot

- **Setup:** 0.6 legal dot.
- **Action:** Complete.
- **Expected:** Over 1.0; ends swap; KL faces next over.
- **Verify:** over • strike

### T20-083 — Last legal ball = 1

- **Setup:** 0.6; Virat 1.
- **Action:** Complete.
- **Expected:** Run swap then over-end swap; verify Virat faces next over.
- **Verify:** strike

### T20-084 — Last legal ball = 2

- **Setup:** 0.6; Virat 2.
- **Action:** Complete.
- **Expected:** Over ends; KL faces next over.
- **Verify:** strike

### T20-085 — Last legal ball = 3

- **Setup:** 0.6; Virat 3.
- **Action:** Complete.
- **Expected:** Run swap + over-end swap; verify final striker.
- **Verify:** strike

### T20-086 — Last legal ball = 4

- **Setup:** 0.6; Virat 4.
- **Action:** Complete.
- **Expected:** Over ends; KL faces next over.
- **Verify:** strike

### T20-087 — Last legal ball = 6

- **Setup:** 0.6; Virat 6.
- **Action:** Complete.
- **Expected:** Over ends; KL faces next over.
- **Verify:** strike

### T20-088 — Last ball wide

- **Setup:** 0.6; wide.
- **Action:** Record wide.
- **Expected:** Still 0.6; over not complete.
- **Verify:** legal count

### T20-089 — Last ball wide + run

- **Setup:** 0.6; wide + run.
- **Action:** Record.
- **Expected:** Still 0.6; over not complete.
- **Verify:** legal count

### T20-090 — Last ball no ball

- **Setup:** 0.6; NB.
- **Action:** Record.
- **Expected:** Still 0.6; over not complete.
- **Verify:** legal count

### T20-091 — Last ball bye

- **Setup:** 0.6; 1 bye.
- **Action:** Record.
- **Expected:** Legal ball; over completes; ends swap.
- **Verify:** legal count

### T20-092 — Last ball leg bye

- **Setup:** 0.6; 1 LB.
- **Action:** Record.
- **Expected:** Legal ball; over completes; ends swap.
- **Verify:** legal count

### T20-093 — Six legal balls with wides/NBs mixed

- **Setup:** Use wides/NBs among deliveries.
- **Action:** Complete six legal balls.
- **Expected:** Over increments only after six legal balls; illegal deliveries do not consume a ball.
- **Verify:** legal count

### T20-094 — New bowler after over

- **Setup:** Over complete.
- **Action:** Select next bowler.
- **Expected:** Eligible new bowler; previous bowler not consecutive.
- **Verify:** bowler

### T20-095 — Maximum overs reached

- **Setup:** Bowler at configured max.
- **Action:** Try selecting.
- **Expected:** System blocks/flags ineligible bowler.
- **Verify:** eligibility

## 6. Wickets & Dismissals

### T20-110 — Bowled

- **Setup:** Legal ball hits stumps.
- **Action:** Record bowled.
- **Expected:** Wicket +1; batter out; bowler wicket +1; new batter required.
- **Verify:** wicket

### T20-111 — Caught

- **Setup:** Fielder completes catch.
- **Action:** Record catch + fielder.
- **Expected:** Wicket +1; batter out; bowler wicket +1 where applicable; fielder catch +1.
- **Verify:** fielding

### T20-112 — LBW

- **Setup:** Legal ball satisfies LBW.
- **Action:** Record LBW.
- **Expected:** Wicket +1; bowler wicket +1.
- **Verify:** wicket

### T20-113 — Stumped

- **Setup:** Legal ball; striker out; no run attempt; keeper breaks stumps.
- **Action:** Record stumping.
- **Expected:** Wicket +1; keeper stumping +1; bowler wicket +1 where applicable.
- **Verify:** fielding

### T20-114 — Run out — striker

- **Setup:** Striker attempting run.
- **Action:** Record run out.
- **Expected:** Correct batter out; run attribution correct; no bowler wicket.
- **Verify:** out batter

### T20-115 — Run out — non-striker

- **Setup:** Non-striker out at bowler end.
- **Action:** Record run out.
- **Expected:** Correct batter out and end state.
- **Verify:** out batter

### T20-116 — Run out — direct hit

- **Setup:** Direct hit breaks wicket.
- **Action:** Record.
- **Expected:** Run out + direct-hit stat.
- **Verify:** fielding

### T20-117 — Run out — throw + keeper

- **Setup:** Keeper completes throw.
- **Action:** Record.
- **Expected:** Run out; fielding assist/keeper involvement correct.
- **Verify:** fielding

### T20-118 — Run out — throw + bowler

- **Setup:** Bowler breaks stumps from throw.
- **Action:** Record.
- **Expected:** Run out; correct fielding attribution.
- **Verify:** fielding

### T20-119 — Multiple fielders in run out

- **Setup:** Several fielders handle ball.
- **Action:** Record.
- **Expected:** Primary/assist fielders retained.
- **Verify:** fielding

### T20-120 — Retired Hurt

- **Setup:** Virat retires hurt.
- **Action:** Select Retired Hurt.
- **Expected:** No wicket; status RETIRED_HURT; replacement batter enters.
- **Verify:** wickets • status

### T20-121 — Retired Hurt returns

- **Setup:** Virat returns later.
- **Action:** Select return.
- **Expected:** Previous runs/balls retained; return timestamp saved.
- **Verify:** timeline

### T20-122 — Retired Out

- **Setup:** Virat retires out.
- **Action:** Select Retired Out.
- **Expected:** Dismissal/wicket state recorded; return restricted by rules.
- **Verify:** wicket

### T20-123 — Obstructing the field

- **Setup:** Applicable obstruction occurs.
- **Action:** Record dismissal.
- **Expected:** Correct dismissal and runs.
- **Verify:** dismissal

### T20-124 — Hit ball twice

- **Setup:** Applicable event.
- **Action:** Record.
- **Expected:** Correct law-based outcome.
- **Verify:** dismissal

### T20-125 — Timed out

- **Setup:** New batter fails configured arrival time.
- **Action:** Trigger timeout.
- **Expected:** Timed-out dismissal/innings progression correct.
- **Verify:** timer

### T20-126 — Mankad/non-striker run out

- **Setup:** Non-striker leaves before release; wicket broken.
- **Action:** Record run out.
- **Expected:** Correct batter out; event stored.
- **Verify:** dismissal

## 7. Dead Ball / Special Events

### T20-140 — Dead ball — distracted batter

- **Setup:** Umpire calls dead ball.
- **Action:** Record.
- **Expected:** No accidental legal ball/score.
- **Verify:** status

### T20-141 — Dead ball — animal

- **Setup:** Animal enters field.
- **Action:** Record dead ball/interruption.
- **Expected:** Status and event saved.
- **Verify:** status

### T20-142 — Dead ball — ball bursts

- **Setup:** Ball bursts.
- **Action:** Record.
- **Expected:** Correct dead-ball/replacement flow.
- **Verify:** ball

### T20-143 — Dead ball — sight screen

- **Setup:** Sight-screen issue.
- **Action:** Record.
- **Expected:** Delivery not accidentally counted.
- **Verify:** legal ball

### T20-144 — Dead ball — crowd

- **Setup:** Crowd interference.
- **Action:** Record.
- **Expected:** Status and audit correct.
- **Verify:** status

### T20-145 — Ball slips before delivery

- **Setup:** Umpire judges no delivery.
- **Action:** Record dead ball.
- **Expected:** No legal ball.
- **Verify:** legal count

### T20-146 — Valid delivery hits stumps

- **Setup:** Ball was delivered and then hits stumps.
- **Action:** Record wicket.
- **Expected:** Valid wicket; do not cancel incorrectly.
- **Verify:** wicket

### T20-147 — Ball lodged in equipment

- **Setup:** Special event occurs.
- **Action:** Record applicable outcome.
- **Expected:** Event/award and audit stored.
- **Verify:** event

### T20-148 — Lost ball

- **Setup:** Ball lost.
- **Action:** Trigger workflow.
- **Expected:** Replacement ball and applicable scoring award stored.
- **Verify:** ball

### T20-149 — Helmet on ground hit

- **Setup:** Ball hits helmet on ground.
- **Action:** Record penalty.
- **Expected:** Penalty runs separately represented.
- **Verify:** penalty

## 8. Bowler Change / Incomplete Over

### T20-160 — Bowler injured mid-over

- **Setup:** 3 legal balls completed; bowler injured.
- **Action:** Replace bowler.
- **Expected:** Replacement finishes over; figures split correctly; eligibility enforced.
- **Verify:** overs • stats

### T20-161 — Bowler suspended mid-over

- **Setup:** Bowler unavailable.
- **Action:** Replace.
- **Expected:** Remaining balls completed by eligible bowler; audit saved.
- **Verify:** eligibility

### T20-162 — Wrong bowler before ball

- **Setup:** Wrong bowler selected.
- **Action:** Correct before delivery.
- **Expected:** Correct bowler used; audit correction.
- **Verify:** validation

### T20-163 — Wrong bowler after ball

- **Setup:** Wrong bowler saved.
- **Action:** Edit and recalculate.
- **Expected:** Bowling figures corrected; score unchanged.
- **Verify:** recalculation

### T20-164 — Incomplete over due to rain

- **Setup:** 12.3; rain.
- **Action:** Pause/resume.
- **Expected:** Next ball = 12.4; no skipped/duplicated ball.
- **Verify:** over

### T20-165 — Resume after interruption

- **Setup:** Match paused.
- **Action:** Resume.
- **Expected:** Same score, over, striker, non-striker, bowler.
- **Verify:** state

## 9. Milestones / Partnerships / Timing / Live Notes

### T20-180 — Batting 50

- **Setup:** Batter 49; scores 1.
- **Action:** Record.
- **Expected:** 50 milestone + stats.
- **Verify:** milestone

### T20-181 — Batting 100

- **Setup:** Batter 99; scores 1.
- **Action:** Record.
- **Expected:** 100 milestone + stats.
- **Verify:** milestone

### T20-182 — Duck

- **Setup:** Batter dismissed on 0.
- **Action:** Record.
- **Expected:** Duck classification.
- **Verify:** stats

### T20-183 — Golden Duck

- **Setup:** Dismissed first ball on 0.
- **Action:** Record.
- **Expected:** Golden duck.
- **Verify:** stats

### T20-184 — Diamond Duck

- **Setup:** Applicable no-ball/facing condition.
- **Action:** Record.
- **Expected:** Diamond duck classification per configured definition.
- **Verify:** stats

### T20-185 — Silver Duck

- **Setup:** Applicable configured condition.
- **Action:** Record.
- **Expected:** Silver duck classification per configured definition.
- **Verify:** stats

### T20-186 — Pair/King Pair

- **Setup:** Applicable innings/match condition.
- **Action:** Complete relevant innings.
- **Expected:** Classification stored where applicable.
- **Verify:** stats

### T20-187 — Bowler 3/4/5 wickets

- **Setup:** Take milestone wicket.
- **Action:** Record.
- **Expected:** Correct milestone counter.
- **Verify:** bowling

### T20-188 — Maiden

- **Setup:** Six legal balls, zero bowler-conceded runs.
- **Action:** Complete over.
- **Expected:** Maiden = 1.
- **Verify:** bowling

### T20-189 — Wicket maiden

- **Setup:** Six legal balls, wicket, zero conceded.
- **Action:** Complete over.
- **Expected:** Wicket maiden recorded.
- **Verify:** bowling

### T20-190 — Hat-trick

- **Setup:** Three qualifying wickets.
- **Action:** Complete sequence.
- **Expected:** Hat-trick recorded.
- **Verify:** milestone

### T20-191 — Four wickets in four balls

- **Setup:** Four qualifying wickets.
- **Action:** Complete sequence.
- **Expected:** Milestone recorded.
- **Verify:** milestone

### T20-192 — Five wickets in over

- **Setup:** Five wickets in one over where legal.
- **Action:** Complete.
- **Expected:** Milestone recorded.
- **Verify:** milestone

### T20-193 — Partnership 10/25/50/75/100

- **Setup:** Partnership crosses milestone.
- **Action:** Record delivery.
- **Expected:** Milestone and runs/balls correct.
- **Verify:** partnership

### T20-194 — Partnership broken by wicket

- **Setup:** Active partnership.
- **Action:** Dismiss batter.
- **Expected:** End time, runs, balls saved.
- **Verify:** partnership

### T20-195 — Partnership broken by retirement

- **Setup:** Active partnership.
- **Action:** Retire batter.
- **Expected:** Partnership/timing updated correctly.
- **Verify:** partnership

### T20-196 — Batter in time

- **Setup:** Batter enters at known client/server time.
- **Action:** Confirm entry.
- **Expected:** inTime captured; both timestamps retained.
- **Verify:** timestamp

### T20-197 — Batter out time

- **Setup:** Batter dismissed at known time.
- **Action:** Confirm wicket.
- **Expected:** outTime = confirmation time; delivery timestamp separately stored.
- **Verify:** timestamp

### T20-198 — Retired hurt timing

- **Setup:** Retire, return, later out.
- **Action:** Record all.
- **Expected:** retiredHurtTime, returnTime, outTime preserved.
- **Verify:** timeline

### T20-199 — Partnership duration with rain

- **Setup:** 75m wall duration, 15m rain.
- **Action:** Pause/resume then wicket.
- **Expected:** Wall = 75m; interruption = 15m; active = 60m.
- **Verify:** timing

### T20-200 — Drinks break timing

- **Setup:** 45m wall duration, 5m break.
- **Action:** Record break then wicket.
- **Expected:** Wall = 45m; active = 40m.
- **Verify:** timing

### T20-201 — Live note context

- **Setup:** At 14.3, team 112/3; batter stats and partnership known.
- **Action:** Tap Add Note; type observation.
- **Expected:** Note auto-captures match/innings/over/ball/delivery ID, score/wickets, batters, bowler, partnership, timestamps, user.
- **Verify:** note snapshot

### T20-202 — Live note category

- **Setup:** Add tactical/batting/bowling/fielding/injury/umpire/interruption note.
- **Action:** Save.
- **Expected:** Category stored; note does not alter score.
- **Verify:** metadata

### T20-203 — Note timestamp

- **Setup:** Client clock differs from server.
- **Action:** Save note.
- **Expected:** clientTimestamp + serverTimestamp; server authoritative for audit.
- **Verify:** timestamp

### T20-204 — Note survives delivery correction

- **Setup:** Note attached to delivery.
- **Action:** Edit delivery.
- **Expected:** Note remains linked to delivery ID; audit retained.
- **Verify:** link • audit

## 10. Match Timing / Pause / Rain

### T20-220 — T20 timing configuration

- **Setup:** New T20.
- **Action:** Open timing config.
- **Expected:** Scheduled innings duration, interval and over-rate values stored.
- **Verify:** config

### T20-221 — Rain pause

- **Setup:** 145/3 at 14.2.
- **Action:** Pause → Rain.
- **Expected:** DELAYED; score/over/players unchanged; interruption start saved.
- **Verify:** status

### T20-222 — Rain resume

- **Setup:** Paused.
- **Action:** Resume.
- **Expected:** LIVE; same score/over; interruption duration calculated.
- **Verify:** state • duration

### T20-223 — Bad light

- **Setup:** Live match.
- **Action:** Pause → Bad Light.
- **Expected:** Reason/status saved.
- **Verify:** status

### T20-224 — Wet outfield

- **Setup:** Live match.
- **Action:** Pause → Wet Outfield.
- **Expected:** Scoring disabled while paused.
- **Verify:** status

### T20-225 — Lightning

- **Setup:** Live match.
- **Action:** Suspend → Lightning.
- **Expected:** SUSPENDED; authorized resume.
- **Verify:** status

### T20-226 — Medical emergency

- **Setup:** Live match.
- **Action:** Pause → Medical.
- **Expected:** Status/reason saved.
- **Verify:** status

### T20-227 — Equipment failure

- **Setup:** Live match.
- **Action:** Pause → Equipment.
- **Expected:** Status/reason saved.
- **Verify:** status

### T20-228 — Crowd interruption

- **Setup:** Live match.
- **Action:** Pause → Crowd.
- **Expected:** Status/reason saved.
- **Verify:** status

### T20-229 — Power failure

- **Setup:** Live match.
- **Action:** Suspend.
- **Expected:** No scoring while suspended.
- **Verify:** status

### T20-230 — Drinks break

- **Setup:** Configured break.
- **Action:** Start break.
- **Expected:** Timer starts; scoring disabled; duration captured.
- **Verify:** timer

### T20-231 — Over-rate warning

- **Setup:** Approach configured innings time.
- **Action:** Open dashboard.
- **Expected:** Time/over-rate warning displayed without changing score.
- **Verify:** UI

### T20-232 — Multiple interruptions

- **Setup:** Rain + drinks + medical.
- **Action:** Pause/resume each.
- **Expected:** Each interruption separately stored with type/start/end/duration/user.
- **Verify:** audit

## 11. T20 Innings End / Target / Rain / Results

### T20-250 — All out

- **Setup:** 10th wicket.
- **Action:** Record wicket.
- **Expected:** Innings ends immediately.
- **Verify:** status

### T20-251 — 20 overs completed

- **Setup:** Wickets remain.
- **Action:** Complete 20th over.
- **Expected:** Innings ends at 20.0.
- **Verify:** overs

### T20-252 — Target achieved

- **Setup:** Chase reaches target.
- **Action:** Record winning run.
- **Expected:** Innings ends immediately; win by wickets.
- **Verify:** result

### T20-253 — Target achieved by boundary

- **Setup:** Target = 4; batter hits 4.
- **Action:** Record.
- **Expected:** Innings ends on boundary.
- **Verify:** target

### T20-254 — Target achieved by extra

- **Setup:** Target reached by applicable extra.
- **Action:** Record.
- **Expected:** Innings ends when target reached.
- **Verify:** target

### T20-255 — Target not achieved

- **Setup:** Chase below target at 20.0.
- **Action:** Finish innings.
- **Expected:** Win by runs.
- **Verify:** result

### T20-256 — Tie

- **Setup:** Both innings equal.
- **Action:** Finish chase.
- **Expected:** Result = tie; Super Over if required.
- **Verify:** result

### T20-257 — No Result

- **Setup:** Rain prevents completion.
- **Action:** Abandon per rules.
- **Expected:** No Result.
- **Verify:** result

### T20-258 — Abandoned

- **Setup:** Match cannot continue.
- **Action:** Admin abandons.
- **Expected:** ABANDONED; no false winner.
- **Verify:** status

### T20-259 — Forfeit

- **Setup:** Authorized forfeit.
- **Action:** Confirm.
- **Expected:** Forfeit result + audit.
- **Verify:** result

### T20-260 — Conceded

- **Setup:** Team concedes.
- **Action:** Confirm.
- **Expected:** Conceded result + audit.
- **Verify:** result

### T20-261 — Revised target

- **Setup:** Rain changes target.
- **Action:** Apply revised target.
- **Expected:** Original and revised target retained; required runs recalc.
- **Verify:** target

### T20-262 — DLS

- **Setup:** Rain-affected chase.
- **Action:** Apply DLS result.
- **Expected:** Target/overs update; method/input/version audited.
- **Verify:** DLS

### T20-263 — VJD/custom target

- **Setup:** Competition uses custom method.
- **Action:** Apply.
- **Expected:** Configured method reflected.
- **Verify:** target

### T20-264 — Multiple rain recalculation

- **Setup:** Target already revised; new interruption.
- **Action:** Recalculate.
- **Expected:** Latest version authoritative; prior calculations retained.
- **Verify:** version

## 12. Super Over / Powerplay / Field Restrictions

### T20-280 — One Super Over

- **Setup:** T20 tied.
- **Action:** Start Super Over.
- **Expected:** New phase/innings; main score immutable.
- **Verify:** phase

### T20-281 — Super Over batting pair

- **Setup:** Super Over starts.
- **Action:** Select eligible batters.
- **Expected:** Eligibility rules enforced.
- **Verify:** roster

### T20-282 — Super Over wicket

- **Setup:** Batter dismissed.
- **Action:** Record.
- **Expected:** Super Over state updates independently.
- **Verify:** score

### T20-283 — Super Over ends by wickets

- **Setup:** Two wickets.
- **Action:** Record second wicket.
- **Expected:** Super Over innings ends.
- **Verify:** status

### T20-284 — Super Over six balls

- **Setup:** Six legal balls.
- **Action:** Complete.
- **Expected:** Super Over ends at 1.0.
- **Verify:** overs

### T20-285 — Super Over tie

- **Setup:** Equal scores.
- **Action:** Finish both.
- **Expected:** Repeat/tie-break workflow.
- **Verify:** result

### T20-286 — Multiple Super Overs

- **Setup:** First tied.
- **Action:** Start another.
- **Expected:** New phase; previous retained.
- **Verify:** phase

### T20-287 — Same-player restriction

- **Setup:** Restricted competition.
- **Action:** Attempt invalid player.
- **Expected:** UI/backend block.
- **Verify:** eligibility

### T20-288 — Powerplay start

- **Setup:** T20 starts.
- **Action:** Record deliveries.
- **Expected:** Powerplay indicator active.
- **Verify:** UI

### T20-289 — Powerplay end

- **Setup:** Configured boundary reached.
- **Action:** Complete over.
- **Expected:** Restriction changes exactly at configured point.
- **Verify:** UI

### T20-290 — Custom powerplay

- **Setup:** Custom competition.
- **Action:** Load match.
- **Expected:** Custom restriction used.
- **Verify:** config

### T20-291 — Field restriction display

- **Setup:** Configured 30-yard restrictions.
- **Action:** View scorer.
- **Expected:** Current restriction visible.
- **Verify:** UI

### T20-292 — Restriction violation metadata

- **Setup:** Authorized scorer/admin records violation.
- **Action:** Save.
- **Expected:** Violation event stored separately unless scoring rule says otherwise.
- **Verify:** audit

## 13. Corrections / Undo / Redo / Replay

### T20-310 — Undo last ball

- **Setup:** 100/2 at 10.4; record four.
- **Action:** Undo.
- **Expected:** Back to 100/2 at 10.4; batter/bowler/strike/partnership restored.
- **Verify:** all derived state

### T20-311 — Redo

- **Setup:** Undo previous four.
- **Action:** Redo.
- **Expected:** Four reapplied exactly.
- **Verify:** state

### T20-312 — Undo over

- **Setup:** Mixed over completed.
- **Action:** Undo over.
- **Expected:** Prior state restored according to product policy; timeline correct.
- **Verify:** timeline

### T20-313 — Edit dismissal

- **Setup:** Bowled should be Run Out.
- **Action:** Edit.
- **Expected:** Dismissal, bowler wicket, fielder and batter status recalc.
- **Verify:** stats

### T20-314 — Edit extras

- **Setup:** Bye should be Leg Bye.
- **Action:** Edit.
- **Expected:** Extras category corrected; score remains correct where total unchanged.
- **Verify:** extras

### T20-315 — Edit batsman

- **Setup:** Wrong striker.
- **Action:** Correct.
- **Expected:** Batting/strike state recalculates.
- **Verify:** state

### T20-316 — Edit bowler

- **Setup:** Wrong bowler.
- **Action:** Correct.
- **Expected:** Bowling figures recalc.
- **Verify:** stats

### T20-317 — Penalty runs

- **Setup:** Authorized penalty.
- **Action:** Enter.
- **Expected:** Team/extras updated according to category.
- **Verify:** extras

### T20-318 — Correct batting order

- **Setup:** Wrong order.
- **Action:** Edit.
- **Expected:** Scorecard order corrected; totals unchanged.
- **Verify:** scorecard

### T20-319 — Replace player

- **Setup:** Legal replacement.
- **Action:** Replace.
- **Expected:** Eligibility/reason/time saved.
- **Verify:** roster

### T20-320 — Change keeper

- **Setup:** Keeper changes.
- **Action:** Update.
- **Expected:** Future fielding events use new keeper; history unchanged.
- **Verify:** fielding

### T20-321 — Change captain

- **Setup:** Captain changes.
- **Action:** Update.
- **Expected:** Metadata/permissions update; audit.
- **Verify:** admin

### T20-322 — Recalculate score

- **Setup:** Derived state intentionally altered in test.
- **Action:** Replay/recalculate.
- **Expected:** Derived score matches source events.
- **Verify:** replay

### T20-323 — Audit history

- **Setup:** Several edits/undos.
- **Action:** Open audit.
- **Expected:** Who/when/old/new/reason recorded.
- **Verify:** audit

### T20-324 — Replay innings

- **Setup:** Delivery stream exists.
- **Action:** Replay from ball 1.
- **Expected:** Final state exactly matches expected scorecard.
- **Verify:** replay

## 14. Crash / Logout / Offline / Sync

### T20-340 — Autosave every ball

- **Setup:** Record delivery.
- **Action:** Inspect persistence.
- **Expected:** Delivery committed after save; state restorable.
- **Verify:** DB

### T20-341 — Crash after normal ball

- **Setup:** Record four; force close.
- **Action:** Reopen.
- **Expected:** Exact state restored.
- **Verify:** recovery

### T20-342 — Crash after wide

- **Setup:** Record wide; force close.
- **Action:** Reopen.
- **Expected:** Same illegal-ball position restored.
- **Verify:** recovery

### T20-343 — Crash after wicket

- **Setup:** Record wicket; force close.
- **Action:** Reopen.
- **Expected:** Wicket/new-batter state restored.
- **Verify:** recovery

### T20-344 — Logout/relogin

- **Setup:** Score several balls.
- **Action:** Logout/login.
- **Expected:** Last committed state restored.
- **Verify:** recovery

### T20-345 — Browser refresh

- **Setup:** Live screen.
- **Action:** Refresh.
- **Expected:** Exact state restored.
- **Verify:** recovery

### T20-346 — Offline scoring

- **Setup:** Disconnect network.
- **Action:** Score several balls.
- **Expected:** Local queue; Offline indicator; no lost balls.
- **Verify:** offline

### T20-347 — Reconnect sync

- **Setup:** Offline queue exists.
- **Action:** Reconnect.
- **Expected:** Events sync once in order; server state matches local.
- **Verify:** sync

### T20-348 — Duplicate sync

- **Setup:** Retry same event.
- **Action:** Sync again.
- **Expected:** Idempotency prevents duplicate.
- **Verify:** idempotency

### T20-349 — Two scorers conflict

- **Setup:** Two clients edit same delivery.
- **Action:** Submit.
- **Expected:** Version/conflict handling; no silent overwrite.
- **Verify:** concurrency

### T20-350 — Partial save failure

- **Setup:** Simulate API/DB failure.
- **Action:** Submit delivery.
- **Expected:** Not falsely marked committed; retry safe.
- **Verify:** error handling

### T20-351 — Client/server time

- **Setup:** Clock differs.
- **Action:** Save delivery/note.
- **Expected:** Both timestamps retained; server authoritative.
- **Verify:** timestamps

## 15. Fielding / Batting / Bowling Statistics

### T20-370 — Catch stat

- **Setup:** Fielder catches.
- **Action:** Record.
- **Expected:** Catch +1.
- **Verify:** fielding

### T20-371 — Run-out stat

- **Setup:** Fielder run out.
- **Action:** Record.
- **Expected:** Run-out +1; direct hit/assist if applicable.
- **Verify:** fielding

### T20-372 — Stumping stat

- **Setup:** Keeper stumps batter.
- **Action:** Record.
- **Expected:** Stumping +1.
- **Verify:** fielding

### T20-373 — Dropped catch

- **Setup:** Catch chance missed.
- **Action:** Record optional event.
- **Expected:** Dropped-catch analytics +1; no wicket.
- **Verify:** analytics

### T20-374 — Direct hit

- **Setup:** Direct hit run out.
- **Action:** Record.
- **Expected:** Direct-hit +1.
- **Verify:** fielding

### T20-375 — Assist

- **Setup:** Multiple fielders.
- **Action:** Record.
- **Expected:** Primary/assist retained.
- **Verify:** fielding

### T20-376 — Misfield

- **Setup:** Misfield causes runs.
- **Action:** Record.
- **Expected:** Event linked; scoring totals remain correct.
- **Verify:** fielding

### T20-377 — Batting reconciliation

- **Setup:** Mixed scoring.
- **Action:** Open scorecard.
- **Expected:** Batter runs + extras + penalties reconcile to team total.
- **Verify:** scorecard

### T20-378 — Batting balls

- **Setup:** Legal/illegal mixed.
- **Action:** Open batting card.
- **Expected:** Balls faced correct.
- **Verify:** stats

### T20-379 — 4s/6s

- **Setup:** Boundaries recorded.
- **Action:** Open card.
- **Expected:** Counters match deliveries.
- **Verify:** stats

### T20-380 — Strike rate

- **Setup:** Runs/balls known.
- **Action:** Open card.
- **Expected:** SR calculation correct; zero-ball handling defined.
- **Verify:** stats

### T20-381 — Bowling overs

- **Setup:** Wides/NBs + legal balls.
- **Action:** Open card.
- **Expected:** Overs use legal-ball count.
- **Verify:** stats

### T20-382 — Bowling runs

- **Setup:** Bat/wide/NB/bye/LB mix.
- **Action:** Open card.
- **Expected:** Bowler conceded runs match attribution.
- **Verify:** stats

### T20-383 — Bowling wickets

- **Setup:** Bowled/caught/LBW/stumped/run out mix.
- **Action:** Open card.
- **Expected:** Only bowler-credit dismissals counted.
- **Verify:** stats

### T20-384 — Economy

- **Setup:** Bowler figures known.
- **Action:** Open card.
- **Expected:** Economy correct.
- **Verify:** stats

### T20-385 — Dot balls

- **Setup:** Dots + extras.
- **Action:** Open card.
- **Expected:** Dot-ball definition consistently applied.
- **Verify:** stats

### T20-386 — Extras summary

- **Setup:** All extra types.
- **Action:** Open card.
- **Expected:** Wides/NBs/byes/LBs/penalties reconcile.
- **Verify:** stats

### T20-387 — Wagon wheel/scoring area

- **Setup:** Optional shot tags.
- **Action:** Open analysis.
- **Expected:** Location stats match tagged deliveries without changing score.
- **Verify:** analytics

## 16. Critical Combination / Edge-Case Matrix

### EDGE-01 — Wide + run out

- **Setup:** Wide; batter attempts run; wicket broken.
- **Action:** Record.
- **Expected:** Wide + run out; illegal ball; correct batter out.
- **Verify:** score • state • audit

### EDGE-02 — Wide + stumping

- **Setup:** Wide; striker leaves crease; no run attempt.
- **Action:** Record.
- **Expected:** Wide + legally valid stumping if applicable; illegal ball.
- **Verify:** score • state • audit

### EDGE-03 — Wide to boundary

- **Setup:** Keeper misses; boundary.
- **Action:** Record.
- **Expected:** All applicable runs wides.
- **Verify:** score • state • audit

### EDGE-04 — Wide + bye classification conflict

- **Setup:** Attempt to select both wide and bye.
- **Action:** Save.
- **Expected:** UI/backend prevents invalid double classification.
- **Verify:** score • state • audit

### EDGE-05 — No ball + catch

- **Setup:** NB; catch completed.
- **Action:** Record.
- **Expected:** Catch not awarded under configured rules.
- **Verify:** score • state • audit

### EDGE-06 — No ball + run out

- **Setup:** NB; batter attempts run; wicket broken.
- **Action:** Record.
- **Expected:** NB penalty + applicable runs; run out allowed.
- **Verify:** score • state • audit

### EDGE-07 — No ball + stumping

- **Setup:** NB; keeper breaks stumps.
- **Action:** Record.
- **Expected:** Stumping not awarded under configured rules.
- **Verify:** score • state • audit

### EDGE-08 — No ball + 4 byes

- **Setup:** NB; batter misses; four byes.
- **Action:** Record.
- **Expected:** Team +5; batter 0; bowler +1 only; byes +4.
- **Verify:** score • state • audit

### EDGE-09 — Free hit + bowled

- **Setup:** Free hit; ball hits stumps.
- **Action:** Record.
- **Expected:** No bowled dismissal.
- **Verify:** score • state • audit

### EDGE-10 — Free hit + run out

- **Setup:** Free hit; run attempted; wicket broken.
- **Action:** Record.
- **Expected:** Run out allowed.
- **Verify:** score • state • audit

### EDGE-11 — Last ball + wide + run

- **Setup:** 0.6 wide + run.
- **Action:** Record.
- **Expected:** Still 0.6; over not complete.
- **Verify:** score • state • audit

### EDGE-12 — Last ball + NB + four

- **Setup:** 0.6 NB + four.
- **Action:** Record.
- **Expected:** Still 0.6; +5; over not complete.
- **Verify:** score • state • audit

### EDGE-13 — Last ball + bye

- **Setup:** 0.6 bye.
- **Action:** Record.
- **Expected:** Legal ball; over completes.
- **Verify:** score • state • audit

### EDGE-14 — Last ball + wicket

- **Setup:** 0.6 legal wicket.
- **Action:** Record.
- **Expected:** Over completes; wicket state correct.
- **Verify:** score • state • audit

### EDGE-15 — Short run + wicket

- **Setup:** 2 attempted, 1 short, wicket.
- **Action:** Record.
- **Expected:** Completed runs and out batter correct.
- **Verify:** score • state • audit

### EDGE-16 — Retired hurt + partnership

- **Setup:** Batter retires during partnership.
- **Action:** Record.
- **Expected:** Partnership/timing/status correct.
- **Verify:** score • state • audit

### EDGE-17 — Retired hurt + return + wicket

- **Setup:** Batter returns then out.
- **Action:** Record.
- **Expected:** Full timeline correct.
- **Verify:** score • state • audit

### EDGE-18 — Bowler injured + over completion

- **Setup:** Bowler injured after 3 legal balls.
- **Action:** Replace.
- **Expected:** Replacement completes; figures split.
- **Verify:** score • state • audit

### EDGE-19 — Rain + incomplete over

- **Setup:** Rain at 12.3.
- **Action:** Pause/resume.
- **Expected:** Next ball 12.4.
- **Verify:** score • state • audit

### EDGE-20 — Rain + batter timing

- **Setup:** Batter spans rain delay.
- **Action:** Pause/resume; wicket.
- **Expected:** Wall vs active time correct.
- **Verify:** score • state • audit

### EDGE-21 — Wrong batter + downstream ball

- **Setup:** Wrong striker saved.
- **Action:** Correct then continue.
- **Expected:** Replay restores correct downstream state.
- **Verify:** score • state • audit

### EDGE-22 — Wrong bowler + completed over

- **Setup:** Wrong bowler saved.
- **Action:** Correct after over.
- **Expected:** Figures recalc; audit preserved.
- **Verify:** score • state • audit

### EDGE-23 — Undo after wicket

- **Setup:** Wicket saved.
- **Action:** Undo.
- **Expected:** Wicket/new batter/partnership/strike restored.
- **Verify:** score • state • audit

### EDGE-24 — Undo after resume

- **Setup:** Resume then score.
- **Action:** Undo score.
- **Expected:** Interruption history remains; only scoring event reverted.
- **Verify:** score • state • audit

### EDGE-25 — Crash after correction

- **Setup:** Delivery edited.
- **Action:** Crash/reopen.
- **Expected:** Correct version restored.
- **Verify:** score • state • audit

### EDGE-26 — Offline + wicket

- **Setup:** Wicket recorded offline.
- **Action:** Reconnect.
- **Expected:** Wicket syncs once.
- **Verify:** score • state • audit

### EDGE-27 — Duplicate event

- **Setup:** Same delivery submitted twice.
- **Action:** Retry.
- **Expected:** No duplicate score.
- **Verify:** score • state • audit

### EDGE-28 — Concurrent scorers

- **Setup:** Two clients edit same delivery.
- **Action:** Submit.
- **Expected:** Conflict detected; no silent overwrite.
- **Verify:** score • state • audit

### EDGE-29 — Helmet penalty + wicket

- **Setup:** Helmet penalty and wicket sequence.
- **Action:** Record.
- **Expected:** Penalty and wicket separately reconciled.
- **Verify:** score • state • audit

### EDGE-30 — Obstruction during run

- **Setup:** Run + obstruction.
- **Action:** Record.
- **Expected:** Correct dismissal/award.
- **Verify:** score • state • audit

### EDGE-31 — Timed out after wicket

- **Setup:** Replacement late.
- **Action:** Trigger timeout.
- **Expected:** Timed-out state correct.
- **Verify:** score • state • audit

### EDGE-32 — Concussion/impact substitute

- **Setup:** Configured rule.
- **Action:** Apply replacement.
- **Expected:** Eligibility enforced.
- **Verify:** score • state • audit

### EDGE-33 — Super Over after tie

- **Setup:** T20 tied.
- **Action:** Start Super Over.
- **Expected:** Independent phase.
- **Verify:** score • state • audit

### EDGE-34 — Multiple Super Over tie

- **Setup:** First Super Over tied.
- **Action:** Start next.
- **Expected:** Previous phase immutable; new phase independent.
- **Verify:** score • state • audit

### EDGE-35 — Caught and crossed before catch

- **Setup:** Batters cross before catch completion.
- **Action:** Record catch.
- **Expected:** Current applicable law/rule outcome used; do not use obsolete crossing logic.
- **Verify:** score • state • audit

### EDGE-36 — Wide cannot also be bye

- **Setup:** Attempt invalid classification.
- **Action:** Save.
- **Expected:** Validation prevents impossible combined classification.
- **Verify:** score • state • audit

## 17. Golden T20 Regression Match

Run this mixed sequence after every major scoring-engine change. Record the expected state after each delivery and compare the final scorecard, event stream and timeline.

- Start 0/0 with Virat* / KL and Bumrah.
- 0.1 dot → 0/0.
- 0.2 single → 1/0; KL striker.
- 0.3 two → 3/0; KL remains striker.
- 0.4 wide → 4/0; legal-ball position unchanged.
- Wide + 2 additional runs → +3 wides; legal-ball position unchanged.
- No-ball → +1; free-hit state.
- No-ball + four → +5; batter +4.
- Legal dot and legal bye/leg-bye sequence.
- Complete over and verify end swap + new bowler.
- Record a wicket and replace batter.
- Record a run out after a completed run.
- Add a live coaching note with automatic score/batter/partnership/time context.
- Pause for rain; verify scoring disabled and score frozen.
- Resume at exact next ball.
- Retire a batter hurt; later return.
- Free hit + run out.
- Wide + run out.
- No-ball + catch attempt; verify no invalid wicket.
- Complete another mixed over.
- Undo last ball and verify all dependent state.
- Redo and verify exact restoration.
- Edit a previous delivery and replay innings.
- Force crash/reopen and compare state.
- Go offline, score, reconnect and verify idempotent sync.
- Finish at 20.0, all out, or target achieved.
- Generate scorecard and reconcile batting/bowling/extras/partnerships.
- Lock, publish, attempt unauthorized edit.

## 18. Final QA Sign-Off


**Scoring**

- Team total reconciles
- Batter runs/balls correct
- Bowler overs/runs/wickets correct
- Extras reconcile
- Legal-ball count correct
- Strike correct

**Wickets**

- All configured dismissals tested
- Run-out variants tested
- Wide/NB combinations tested
- Free-hit restrictions tested
- Retired Hurt vs Retired Out tested

**Timing**

- Match timestamps
- Batter in/out/retire/return timestamps
- Partnership wall/active duration
- Interruption start/end/duration
- T20 timing config not hardcoded

**Reliability**

- Autosave
- Crash recovery
- Logout/relogin
- Refresh
- Offline queue
- Reconnect/idempotency
- Multi-scorer conflicts
- Undo/redo/replay
- Audit history

**Live analysis**

- Notes capture delivery context
- Team score/wickets
- Individual batter score/balls
- Bowler
- Partnership runs/balls/duration
- Client + server timestamp
- Note categories/tags
- Note survives corrections

**Administration**

- Pause/resume/suspend/cancel
- Archive/publish
- Lock/unlock
- Manual penalty runs
- Batting order/player/keeper/captain corrections
