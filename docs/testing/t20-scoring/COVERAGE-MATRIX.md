# T20 Scoring — Coverage Matrix

Every one of the 248 workbook scenarios (`WORKBOOK-EXTRACTED.md`) classified against what the code actually does. Produced by a read-only Phase 1 pass — no application code was changed.

Paths are relative to `nca-web/nca-web/` (frontend) and `nextgen-cricket-academy/src/main/java/com/nca/cricket/` (backend).

## Classification legend

| Class | Meaning |
|-------|---------|
| **TESTABLE** | Feature exists and the UI control is reachable. Drive it through the UI. |
| **TESTABLE-BACKEND-ONLY** | Feature exists in the API/DB but no UI control reaches it. Test via API; the UI gap is recorded. |
| **NEEDS-FIXTURE** | Testable, but requires seeded state (5 balls bowled, batter on 49, 9 down, a closed innings). Uses `advanceTo()`. |
| **NOT-IMPLEMENTED** | Feature does not exist. Not to be built in this task — listed so the product gap is visible. |
| **AMBIGUOUS** | The app defines the rule differently from the workbook. What the app does is recorded; the app is not changed here. |

## Totals

| Class | Count | % |
|-------|-------|---|
| TESTABLE | 107 | 43% |
| TESTABLE-BACKEND-ONLY | 13 | 5% |
| NEEDS-FIXTURE | 51 | 20% |
| AMBIGUOUS | 9 | 3% |
| NOT-IMPLEMENTED | 68 | 27% |
| **Total** | **248** | |

Directly executable now (TESTABLE + TESTABLE-BACKEND-ONLY + NEEDS-FIXTURE): **171 of 248**. Not executable against the app as built (NOT-IMPLEMENTED + AMBIGUOUS): **77**.

_Reconciled against the final suite run (2026-09-04). Sixteen scenarios moved from
AMBIGUOUS to TESTABLE over the campaign because the fixes for BUG-01 (`e748bec`),
BUG-02 (`715a382`), BUG-03 (`c618147`), BUG-05 (`6e2ced0`), BUG-14 (`c8c05a8`) and
BUG-15 (`8cb9fcd`) made the app match the workbook. The nine still classified
AMBIGUOUS are the ones where the app's model genuinely differs and no fix is
implied: seven have an `@ambiguous` test pinning current behaviour, reported as
AMBIGUOUS-PINNED in `TEST-RESULTS.md` and deliberately not counted as passes._

_The per-section table below is the Phase 1 snapshot and is not re-derived._

## Per-section breakdown

| § | Section | TESTABLE | TESTABLE-BACKEND-ONLY | NEEDS-FIXTURE | AMBIGUOUS | NOT-IMPLEMENTED | Total |
|---|---------|---|---|---|---|---|---|
| 1 | T20 Match Setup & Pre-Match | 6 | · | · | 1 | 1 | 8 |
| 2 | Basic Legal Deliveries | 7 | · | · | · | · | 7 |
| 3 | Extras — Wide / No Ball / Bye / Leg Bye | 12 | 1 | · | 7 | · | 20 |
| 4 | No-Ball / Wide Types & Free Hit | 9 | · | · | 1 | 7 | 17 |
| 5 | Striker / Non-Striker / Last Ball / Over Completion | 3 | · | 13 | · | · | 16 |
| 6 | Wickets & Dismissals | 11 | 3 | · | · | 3 | 17 |
| 7 | Dead Ball / Special Events | 1 | · | · | 1 | 8 | 10 |
| 8 | Bowler Change / Incomplete Over | 3 | · | 3 | · | · | 6 |
| 9 | Milestones / Partnerships / Timing / Live Notes | 1 | 2 | 3 | 3 | 16 | 25 |
| 10 | Match Timing / Pause / Rain | 7 | · | 1 | 5 | · | 13 |
| 11 | T20 Innings End / Target / Rain / Results | 2 | · | 7 | · | 6 | 15 |
| 12 | Super Over / Powerplay / Field Restrictions | · | · | 8 | · | 5 | 13 |
| 13 | Corrections / Undo / Redo / Replay | 5 | · | 4 | 1 | 5 | 15 |
| 14 | Crash / Logout / Offline / Sync | 6 | · | · | 1 | 5 | 12 |
| 15 | Fielding / Batting / Bowling Statistics | 9 | 3 | · | 2 | 4 | 18 |
| 16 | Critical Combination / Edge-Case Matrix | 9 | 4 | 12 | 3 | 8 | 36 |

## NOT-IMPLEMENTED — the product gap

**68 scenarios.** None of these will be built in this task. Grouped by the missing capability:

### Offline queue and sync — deferred by design (CLAUDE.md)

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-346` | Offline scoring | Deferred by design — CLAUDE.md: 'a true offline scoring queue is deferred — it conflicts with this model'. No service worker, no queue, no offline indicator. |
| `T20-347` | Reconnect sync | No sync layer — see T20-346. |
| `T20-348` | Duplicate sync | No idempotency key on `postBall`; a replayed request creates a second delivery. |
| `EDGE-26` | Offline + wicket | See T20-346. |
| `EDGE-27` | Duplicate event | See T20-348. |

### Multi-scorer conflict handling

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-349` | Two scorers conflict | `findByMatchIdAndStatusForUpdate` serialises writes, but there is no version token or conflict surface — a second scorer's ball is silently appended. |
| `EDGE-28` | Concurrent scorers | See T20-349. |

### DLS / VJD / revised targets

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-261` | Revised target | No revised-target field. `Innings.target` is computed as 1st-innings runs + 1 and never revised. |
| `T20-262` | DLS | No DLS. The only DLS/VJD code is `UmpireAssistPage.tsx`, which has no route and is unrelated to scoring. |
| `T20-263` | VJD/custom target | No VJD in the scoring module — see T20-262. |
| `T20-264` | Multiple rain recalculation | No rain recalculation. |

### Powerplay and field restrictions

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-288` | Powerplay start | No powerplay in the scoring module. Only `UmpireAssistPage.tsx` (unrouted) mentions it. |
| `T20-289` | Powerplay end | No powerplay. |
| `T20-290` | Custom powerplay | No powerplay. |
| `T20-291` | Field restriction display | No field-restriction display. |
| `T20-292` | Restriction violation metadata | No field-restriction violation model. |

### Impact / concussion substitute rules

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-006` | Substitute/Impact player | Impact-player league rule does not exist. `match_team_players.is_impact_player` exists (`MatchTeamPlayer.java:61`) but every frontend call site hardcodes `false` and no scoring logic reads it. Plain substitution IS implemented — see T20-319. |
| `EDGE-32` | Concussion/impact substitute | No concussion/impact-substitute eligibility. Generic substitution exists (T20-319) but enforces no like-for-like rule. |

### Dead ball and special events

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-140` | Dead ball — distracted batter | No dead-ball concept anywhere in backend or frontend (grep: zero hits). |
| `T20-141` | Dead ball — animal | No dead-ball concept. |
| `T20-142` | Dead ball — ball bursts | No dead-ball concept. |
| `T20-143` | Dead ball — sight screen | No dead-ball concept. |
| `T20-144` | Dead ball — crowd | No dead-ball concept. |
| `T20-145` | Ball slips before delivery | No dead-ball concept. |
| `T20-147` | Ball lodged in equipment | No special-event model. |
| `T20-148` | Lost ball | No lost-ball / replacement-ball model. |
| `EDGE-15` | Short run + wicket | No short-run concept. |

### No-ball reason / type classification

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-050` | Front-foot no ball | No no-ball reason/type field exists. `Delivery` has only `extraType='NO_BALL'`. |
| `T20-051` | Back-foot no ball | No no-ball classification stored. |
| `T20-052` | High full toss | No no-ball classification stored. |
| `T20-053` | Dangerous bowling | No no-ball classification or sanction metadata. |
| `T20-054` | Multiple bounce | No no-ball classification stored. |
| `T20-055` | Illegal action/throwing | No no-ball classification stored. |

### Dismissal types absent from the app (hit ball twice, timed out)

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-066` | Free hit + hit ball twice | 'Hit ball twice' is not in the UI dismissal list (`LiveScorerPage.tsx:154`) and has no handling. |
| `T20-124` | Hit ball twice | 'Hit ball twice' absent from the UI list. Backend would accept the string but `applyBall` L1086 would wrongly credit the bowler a wicket. |
| `T20-125` | Timed out | 'Timed out' absent from the UI list. Same bowler-credit problem as T20-124. Named in the V22 comment (L199) but never implemented. |
| `EDGE-31` | Timed out after wicket | See T20-125. |

### Duck classifications and batting/bowling milestones

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-182` | Duck | No duck classification anywhere (grep 'duck': zero hits in backend). |
| `T20-183` | Golden Duck | No golden-duck classification. |
| `T20-184` | Diamond Duck | No diamond-duck classification. |
| `T20-185` | Silver Duck | No silver-duck classification. |
| `T20-186` | Pair/King Pair | No pair / king-pair classification. |
| `T20-187` | Bowler 3/4/5 wickets | No bowler milestone counter (3/4/5-fer). Raw wicket count exists. |
| `T20-189` | Wicket maiden | No wicket-maiden field. |
| `T20-190` | Hat-trick | No hat-trick detection. |
| `T20-191` | Four wickets in four balls | No four-in-four detection. |
| `T20-192` | Five wickets in over | No five-in-an-over detection. |

### Partnership history and milestones

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-193` | Partnership 10/25/50/75/100 | No partnership milestone tracking. Live partnership runs/balls DO exist (`Innings` L154-158) and are covered by T20-310 / EDGE-23. |
| `T20-194` | Partnership broken by wicket | No partnership history is persisted. `applyBall` L1136 zeroes `partnershipRuns`/`partnershipBalls` on a wicket; nothing stores the finished partnership's runs/balls/end time. |
| `T20-195` | Partnership broken by retirement | As T20-194. |

### Wall-vs-active timing (rain-adjusted durations, drinks breaks)

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-199` | Partnership duration with rain | No wall-vs-active partnership duration. `MatchLiveAnnotation.partnership_duration_seconds` exists but no interruption time is subtracted. |
| `T20-200` | Drinks break timing | No drinks-break concept and no active-vs-wall time computation. |
| `EDGE-20` | Rain + batter timing | See T20-199. |

### Live-note delivery linkage and client timestamps

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-204` | Note survives delivery correction | The note has no delivery FK, so 'remains linked to delivery ID' cannot hold. |
| `T20-351` | Client/server time | No client timestamp is sent or stored — see T20-203. |

### Fielding analytics (direct hit, dropped catch, misfield, assist split)

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-116` | Run out — direct hit | No direct-hit flag on `Delivery` — only `fielder` / `fielder2`. |
| `T20-371` | Run-out stat | No direct-hit or assist distinction — see T20-116. |
| `T20-373` | Dropped catch | No dropped-catch event. |
| `T20-374` | Direct hit | No direct-hit flag. |
| `T20-376` | Misfield | No misfield event. |

### Redo, and edit-batsman replay

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-311` | Redo | No redo. `undoLastBall` hard-deletes the delivery (`deleteLastDelivery` L244); grep 'redo' across the frontend returns zero hits. |
| `T20-315` | Edit batsman | Explicitly refused: `editDelivery` L729-735 throws 400 for `batsmanPublicId`/`nonStrikerPublicId`/`dismissedPlayerPublicId`. Documented product decision ('Undo back to that ball and re-score instead'). |
| `EDGE-21` | Wrong batter + downstream ball | Edit-batsman is refused — see T20-315. |

### Result types: forfeit and conceded

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-259` | Forfeit | No FORFEIT result type (`ResultType` union, `match.ts:21-28`). |
| `T20-260` | Conceded | No CONCEDED result type. |

### Post-start roster corrections (batting order, captain)

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-318` | Correct batting order | `battingOrder` is only settable via `setTeams`, which throws unless the match is in SETUP (`MatchService` L155). No post-start reorder endpoint. |
| `T20-321` | Change captain | No change-captain endpoint. `isCaptain` is set only in `setTeams`. |

### Audit trail for scoring corrections

| ID | Title | Why it is not implemented |
|----|-------|---------------------------|
| `T20-323` | Audit history | `ScoringService` calls `auditService.audit` exactly once — inside `changeWicketkeeper` (L559). postBall, undoLastBall, editDelivery, awardPenalty, selectBatter, correctBowler and swapBatters write NO audit row, so there is no who/when/old/new/reason trail for a scoring correction. |

## AMBIGUOUS — app defines the rule differently

**25 scenarios.** The app is NOT changed in this task; each row records what it actually does so a product ruling can be made later.

| ID | Title | Workbook expects | What the app does |
|----|-------|------------------|-------------------|
| `T20-002` | Custom T20 timing | Custom innings duration/interval/over-rate rules stored; no hardcoded timing. | `scheduledStartTime` + `inningsIntervalMinutes` are stored per match, but session length is hardcoded `overs × 4.25` (`LiveScorerPage.tsx:42`) and no over-rate rule is stored anywhere. Workbook asks for 'no hardcoded timing'. |
| `T20-031` | No ball + 2 byes | Team +3; batter 0; bowler +1 only; byes +2; illegal. | Workbook: 'bowler +1 only; byes +2'. App records `extraType=NO_BALL, runsExtras=3`, so `extras_bye` stays 0 and the bowler is charged all 3 (`applyBall` L1092). Also the NB 'Bye' and 'Leg Bye' buttons (`LiveScorerPage.tsx:1946`/`1958`) emit an identical request. |
| `T20-032` | No ball + leg byes | Team = NB + leg byes; batter 0; bowler gets NB penalty only. | Same as T20-031 — NB+leg-bye is indistinguishable from NB+bye. |
| `T20-033` | Bye 1/2/3/4 | Team +N; batter 0; bowler 0; legal ball +1. | Workbook: 'bowler 0'. `applyBall` L1092 charges the bowler `runsBatsman + runsExtras` for every extra type including BYE. |
| `T20-034` | Leg bye 1/2/3/4 | Team +N; batter 0; bowler 0; legal ball +1. | Same as T20-033 for LEG_BYE. |
| `T20-036` | Overthrow on bye | All credited as byes; batter/bowler 0. | Bye picker maxes at 5. Bowler attribution as T20-033. |
| `T20-037` | Overthrow on leg bye | All credited as leg byes; batter/bowler 0. | Leg-bye picker maxes at 5. Bowler attribution as T20-033. |
| `T20-039` | Overthrow on no ball | NB penalty + applicable chargeable runs; byes/leg-byes excluded from bowler. | 'byes/leg-byes excluded from bowler' is not implemented — see T20-031. |
| `T20-065` | Free hit + obstruction | Configured obstruction outcome; no accidental forbidden dismissal. | Under the Laws, obstructing the field IS allowed off a free hit. `postBall` L162 allows only RUN_OUT, so the app blocks it. |
| `T20-149` | Helmet on ground hit | Penalty runs separately represented. | `awardPenalty` gives a fixed 5 runs to either side, which covers the helmet case. But `extras_penalty` is stored on `Innings` (L78) and is NOT exposed in `BallResponseDTO.InningsStateDTO` (fields end at `extrasLegBye`, L68), so penalty runs cannot be 'separately represented' in the live UI. |
| `T20-198` | Retired hurt timing | retiredHurtTime, returnTime, outTime preserved. | `current_stint_started_at` is the return time and `crease_exited_at` is written once and never overwritten, but there is no distinct `retiredHurtTime` field — the three timestamps the workbook asks for are not all separable. |
| `T20-201` | Live note context | Note auto-captures match/innings/over/ball/delivery ID, score/wickets, batters, bowler, partnership, timestamps, user. | `MatchLiveAnnotation` captures innings/over/ball, both batters, bowler, partnership runs+balls, score/wickets, RRR, projected score and user (entity L34-104). It does NOT capture a delivery ID — there is no delivery FK. |
| `T20-203` | Note timestamp | clientTimestamp + serverTimestamp; server authoritative for audit. | Only server `created_at` (entity L64). No client timestamp is sent or stored. |
| `T20-220` | T20 timing configuration | Scheduled innings duration, interval and over-rate values stored. | See T20-002 — over-rate rules are not stored and session length is hardcoded. |
| `T20-221` | Rain pause | DELAYED; score/over/players unchanged; interruption start saved. | Interruption start IS saved (`paused_at`, MatchService L739) and score/over/players are untouched, but there is no DELAYED status — the match stays IN_PROGRESS with a `pauseReason` set. |
| `T20-225` | Lightning | SUSPENDED; authorized resume. | 'Lightning' preset exists and resume is gated to ADMIN/SUPER_ADMIN (`validateAdminOrSuperAdmin`), but there is no SUSPENDED status. |
| `T20-230` | Drinks break | Timer starts; scoring disabled; duration captured. | No drinks-break feature. A custom pause reason plus `totalBreakSeconds` gets the duration, but there is no timer and no separate break type. |
| `T20-232` | Multiple interruptions | Each interruption separately stored with type/start/end/duration/user. | Each pause/resume writes an audit row with reason, timestamp and actor (MatchService L744/L772), but only a cumulative `total_break_seconds` is stored — there is no per-interruption record with its own start/end/duration. |
| `T20-317` | Penalty runs | Team/extras updated according to category. | `awardPenalty` works, but `extras_penalty` is not in `BallResponseDTO` — see T20-149. |
| `T20-350` | Partial save failure | Not falsely marked committed; retry safe. | `postBall` is a single transaction so a partial write cannot commit, and the UI surfaces the error, but forcing a partial failure deterministically from a browser test is not practical. |
| `T20-382` | Bowling runs | Bowler conceded runs match attribution. | `applyBall` L1092 charges the bowler for byes, leg-byes and penalty runs — see T20-033. |
| `T20-386` | Extras summary | Wides/NBs/byes/LBs/penalties reconcile. | Wides / no-balls / byes / leg-byes reconcile, but penalties are missing from the DTO and NB-byes are folded into the no-ball bucket — see T20-031 and T20-149. |
| `EDGE-08` | No ball + 4 byes | Team +5; batter 0; bowler +1 only; byes +4. | See T20-031 — byes are folded into the no-ball bucket and fully charged to the bowler. |
| `EDGE-29` | Helmet penalty + wicket | Penalty and wicket separately reconciled. | See T20-149 — penalty runs are not separately represented in the live state. |
| `EDGE-35` | Caught and crossed before catch | Current applicable law/rule outcome used; do not use obsolete crossing logic. | No crossing model. `applyBall` L1101 rotates strike on odd total runs regardless of dismissal, and the wicket modal lets a scorer attach 0-4 runs to a Caught. Needs a product ruling before it can be asserted. |

## TESTABLE-BACKEND-ONLY — UI gaps

**13 scenarios.** The API supports these; no UI control reaches them.

| ID | Title | Gap |
|----|-------|-----|
| `T20-026` | Wide + run out | UI GAP: the wide toggle is gated to Stumped only (`LiveScorerPage.tsx:2641`), so wide + run out cannot be recorded from the UI. `BallRequest` supports it. |
| `T20-117` | Run out — throw + keeper | UI GAP: the wicket modal exposes one fielder only. `fielder2PublicId` exists on `BallRequest` (`scoring.ts:12`) with no control. |
| `T20-118` | Run out — throw + bowler | As T20-117. |
| `T20-119` | Multiple fielders in run out | As T20-117. |
| `T20-196` | Batter in time | `innings_batting_stats.crease_entered_at` + `current_stint_started_at` (V87) exist in the DB but are not returned by any scoring API — verify by DB row. |
| `T20-197` | Batter out time | `crease_exited_at` (`applyBall` L1066). Delivery `created_at` is the separate delivery timestamp. |
| `T20-370` | Catch stat | Catches are derivable (`TournamentStatsService` L380, `ScorecardService` L645) but the live scorer shows no fielding stats. |
| `T20-372` | Stumping stat | `countKeeperStumpingsInRange` (`ScorecardService` L646). |
| `T20-375` | Assist | `fielder2` exists on `Delivery` (L90) but has no UI — see T20-117. |
| `EDGE-01` | Wide + run out | UI GAP — see T20-026. |
| `EDGE-05` | No ball + catch | UI GAP: no no-ball toggle in the wicket modal. Backend only blocks non-run-out dismissals when `isFreeHit` is true (`postBall` L162) — a CAUGHT on a plain no-ball is NOT blocked. Expect a failure against the workbook. |
| `EDGE-06` | No ball + run out | UI GAP — as EDGE-05; run out is the legal case. |
| `EDGE-07` | No ball + stumping | UI GAP — as EDGE-05. |

## Full matrix

### 1. T20 Match Setup & Pre-Match

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-001` | Create standard T20 | TESTABLE | `MatchService.createMatch` L81; `MatchSetupPage.tsx`. totalOvers/ballsPerOver stored. |
| `T20-002` | Custom T20 timing | AMBIGUOUS | `scheduledStartTime` + `inningsIntervalMinutes` are stored per match, but session length is hardcoded `overs × 4.25` (`LiveScorerPage.tsx:42`) and no over-rate rule is stored anywhere. Workbook asks for 'no hardcoded timing'. |
| `T20-003` | Toss — bat | TESTABLE | `MatchService.recordToss` L194. |
| `T20-004` | Toss — bowl | TESTABLE | `MatchService.recordToss` L194. |
| `T20-005` | Playing XI = 11 | TESTABLE | `addPlayersToTeam` L589 caps at 11 (12 when `allowExtendedSquad`). |
| `T20-006` | Substitute/Impact player | NOT-IMPLEMENTED | Impact-player league rule does not exist. `match_team_players.is_impact_player` exists (`MatchTeamPlayer.java:61`) but every frontend call site hardcodes `false` and no scoring logic reads it. Plain substitution IS implemented — see T20-319. |
| `T20-007` | Openers | TESTABLE | `ScoringService.selectBatter` L595 with `position: striker|nonstriker`. |
| `T20-008` | Opening bowler | TESTABLE | Bowler picker; `innings.currentBowler`. |

### 2. Basic Legal Deliveries

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-010` | Dot ball | TESTABLE | `score(0)` -> `postBall`; `applyBall` L1029 increments totalBalls. |
| `T20-011` | One run | TESTABLE | Strike rotation `applyBall` L1101 (odd total runs). |
| `T20-012` | Two runs | TESTABLE |  |
| `T20-013` | Three runs | TESTABLE |  |
| `T20-014` | Four | TESTABLE | `bs.setFours` `applyBall` L1051. |
| `T20-015` | Six | TESTABLE | `bs.setSixes` `applyBall` L1052. |
| `T20-016` | Batter balls faced | TESTABLE | `countsBallFaced = isLegal || NO_BALL` `applyBall` L1046. |

### 3. Extras — Wide / No Ball / Bye / Leg Bye

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-020` | Wide | TESTABLE | Wide picker WD+0 -> `score(0,'WIDE',1)`. NOTE: `applyBall` L1101 swaps strike whenever `runsBatsman+runsExtras` is odd, so a plain wide (extras=1) rotates strike. Expect a strike-rotation failure here. |
| `T20-021` | Wide + 1 run | TESTABLE | WD+1 -> runsExtras 2. |
| `T20-022` | Wide + 2 runs | TESTABLE | WD+2 -> runsExtras 3. |
| `T20-023` | Wide + 3 runs | TESTABLE | WD+3 -> runsExtras 4. |
| `T20-024` | Wide to boundary | TESTABLE | WD+4 -> runsExtras 5. Matches workbook '+5 wides'. |
| `T20-025` | Wide + stumping | TESTABLE | Wicket modal exposes the 'Wide ball (stumped off wide)' toggle, but ONLY when dismissalType == 'Stumped' (`LiveScorerPage.tsx:2641`). |
| `T20-026` | Wide + run out | TESTABLE-BACKEND-ONLY | UI GAP: the wide toggle is gated to Stumped only (`LiveScorerPage.tsx:2641`), so wide + run out cannot be recorded from the UI. `BallRequest` supports it. |
| `T20-027` | No ball | TESTABLE | `applyBall` L1143 sets freeHit when extraType == NO_BALL. |
| `T20-028` | No ball + 1 bat run | TESTABLE | NB sub-picker 'Batsman' -> `score(n,'NO_BALL',1)`. |
| `T20-029` | No ball + four | TESTABLE |  |
| `T20-030` | No ball + six | TESTABLE |  |
| `T20-031` | No ball + 2 byes | TESTABLE | Workbook satisfied since BUG-03 (`c618147`): the NB penalty goes to `extras_no_ball` and the 2 byes to `extras_bye`; the bowler is charged +1 only (BUG-02, `715a382`).|
| `T20-032` | No ball + leg byes | TESTABLE | As T20-031, to `extras_leg_bye`. The NB Bye and Leg Bye buttons now post distinct deliveries.|
| `T20-033` | Bye 1/2/3/4 | TESTABLE | Workbook satisfied since BUG-02 (`715a382`): byes are no longer charged to the bowler.|
| `T20-034` | Leg bye 1/2/3/4 | TESTABLE | As T20-033 for leg-byes.|
| `T20-035` | Overthrow on bat | TESTABLE | '5, 7' overthrow picker -> `score(5)` / `score(7)` as batsman runs. |
| `T20-036` | Overthrow on bye | TESTABLE | As T20-033 — overthrow runs on a bye are all byes, bowler 0.|
| `T20-037` | Overthrow on leg bye | TESTABLE | As T20-033 for leg-byes.|
| `T20-038` | Overthrow on wide | TESTABLE | Wide picker goes to WD+6 -> 7 wides. |
| `T20-039` | Overthrow on no ball | TESTABLE | Workbook satisfied since BUG-02 + BUG-03: NB penalty to the bowler and to `extras_no_ball`, the byes/leg-byes to their own bucket and not charged.|

### 4. No-Ball / Wide Types & Free Hit

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-050` | Front-foot no ball | NOT-IMPLEMENTED | No no-ball reason/type field exists. `Delivery` has only `extraType='NO_BALL'`. |
| `T20-051` | Back-foot no ball | NOT-IMPLEMENTED | No no-ball classification stored. |
| `T20-052` | High full toss | NOT-IMPLEMENTED | No no-ball classification stored. |
| `T20-053` | Dangerous bowling | NOT-IMPLEMENTED | No no-ball classification or sanction metadata. |
| `T20-054` | Multiple bounce | NOT-IMPLEMENTED | No no-ball classification stored. |
| `T20-055` | Illegal action/throwing | NOT-IMPLEMENTED | No no-ball classification stored. |
| `T20-056` | Off-side wide | TESTABLE | Expected outcome is only 'Wide; illegal delivery', which is testable. Wide sub-type is not stored (no field). |
| `T20-057` | Leg-side wide | TESTABLE | As T20-056. |
| `T20-058` | Above-head wide | TESTABLE | As T20-056. |
| `T20-059` | No ball creates free hit | TESTABLE | `isFreeHit` banner `LiveScorerPage.tsx:1354`; server-authoritative via `BallResponseDTO.isFreeHit`. |
| `T20-060` | Free hit + bowled | TESTABLE | `postBall` L162 rejects any non-RUN_OUT dismissal on a free hit with 400. Assert the rejection and that no wicket lands. |
| `T20-061` | Free hit + LBW | TESTABLE | As T20-060. |
| `T20-062` | Free hit + caught | TESTABLE | As T20-060. |
| `T20-063` | Free hit + stumped | TESTABLE | As T20-060. |
| `T20-064` | Free hit + run out | TESTABLE | RUN_OUT is the one dismissal allowed on a free hit (`postBall` L162). |
| `T20-065` | Free hit + obstruction | TESTABLE | Workbook satisfied since BUG-05 (`6e2ced0`): obstructing the field now stands on a free hit, alongside run out, hit the ball twice and handled the ball; bowled, caught, LBW, stumped and hit wicket stay refused.|
| `T20-066` | Free hit + hit ball twice | NOT-IMPLEMENTED | 'Hit ball twice' is not in the UI dismissal list (`LiveScorerPage.tsx:154`) and has no handling. |

### 5. Striker / Non-Striker / Last Ball / Over Completion

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-080` | Odd-run strike | TESTABLE | `applyBall` L1101. |
| `T20-081` | Even-run strike | TESTABLE |  |
| `T20-082` | Last legal ball = dot | NEEDS-FIXTURE | advanceTo(5 legal balls). Over-end swap `applyBall` L1122. |
| `T20-083` | Last legal ball = 1 | NEEDS-FIXTURE | advanceTo(5). Run swap then over swap = striker unchanged. |
| `T20-084` | Last legal ball = 2 | NEEDS-FIXTURE | advanceTo(5). |
| `T20-085` | Last legal ball = 3 | NEEDS-FIXTURE | advanceTo(5). |
| `T20-086` | Last legal ball = 4 | NEEDS-FIXTURE | advanceTo(5). |
| `T20-087` | Last legal ball = 6 | NEEDS-FIXTURE | advanceTo(5). |
| `T20-088` | Last ball wide | NEEDS-FIXTURE | advanceTo(5); wide must not advance totalBalls (`applyBall` L1029). |
| `T20-089` | Last ball wide + run | NEEDS-FIXTURE | advanceTo(5). |
| `T20-090` | Last ball no ball | NEEDS-FIXTURE | advanceTo(5). |
| `T20-091` | Last ball bye | NEEDS-FIXTURE | advanceTo(5); BYE is a legal ball. |
| `T20-092` | Last ball leg bye | NEEDS-FIXTURE | advanceTo(5); LEG_BYE is a legal ball. |
| `T20-093` | Six legal balls with wides/NBs mixed | TESTABLE | Score a mixed over in-test; assert overNumber only increments on the 6th legal ball. |
| `T20-094` | New bowler after over | NEEDS-FIXTURE | Bowler picker marks the previous bowler 'Bowled last over' and hard-disables (`LiveScorerPage.tsx:2473`); `applyBall` L1125 sets `lastBowler`. |
| `T20-095` | Maximum overs reached | NEEDS-FIXTURE | Quota = `totalOvers / 5` (`postBall` L98). Use a 5-over fixture match so the quota is 1 over. |

### 6. Wickets & Dismissals

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-110` | Bowled | TESTABLE |  |
| `T20-111` | Caught | TESTABLE | Fielder picker shown for Caught (`LiveScorerPage.tsx:2619`). Catch counts come from `TournamentStatsService` L380 / `ScorecardService` L645. |
| `T20-112` | LBW | TESTABLE |  |
| `T20-113` | Stumped | TESTABLE | Keeper auto-selected as fielder (`LiveScorerPage.tsx:2576`). |
| `T20-114` | Run out — striker | TESTABLE |  |
| `T20-115` | Run out — non-striker | TESTABLE | 'Run out at which end?' selector (`LiveScorerPage.tsx:2656`). |
| `T20-116` | Run out — direct hit | NOT-IMPLEMENTED | No direct-hit flag on `Delivery` — only `fielder` / `fielder2`. |
| `T20-117` | Run out — throw + keeper | TESTABLE-BACKEND-ONLY | UI GAP: the wicket modal exposes one fielder only. `fielder2PublicId` exists on `BallRequest` (`scoring.ts:12`) with no control. |
| `T20-118` | Run out — throw + bowler | TESTABLE-BACKEND-ONLY | As T20-117. |
| `T20-119` | Multiple fielders in run out | TESTABLE-BACKEND-ONLY | As T20-117. |
| `T20-120` | Retired Hurt | TESTABLE | RETIRED_HURT: not a wicket (`applyBall` L1031), `isOut` not set (L1061), not a bowler wicket (L1088). Fixed in V87. |
| `T20-121` | Retired Hurt returns | TESTABLE | `selectBatter` re-entry sets `currentStintStartedAt` on every call (`ScoringService` L652 comment; V87). |
| `T20-122` | Retired Out | TESTABLE | RETIRED_OUT counts as a wicket but not a bowler wicket (`applyBall` L1089). |
| `T20-123` | Obstructing the field | TESTABLE | 'Obstructing Field' -> OBSTRUCTING_FIELD (`LiveScorerPage.tsx:163`, `confirmWicket` L877). |
| `T20-124` | Hit ball twice | NOT-IMPLEMENTED | 'Hit ball twice' absent from the UI list. Backend would accept the string but `applyBall` L1086 would wrongly credit the bowler a wicket. |
| `T20-125` | Timed out | NOT-IMPLEMENTED | 'Timed out' absent from the UI list. Same bowler-credit problem as T20-124. Named in the V22 comment (L199) but never implemented. |
| `T20-126` | Mankad/non-striker run out | TESTABLE | Run Out + non-striker + 'Non-striker end'. |

### 7. Dead Ball / Special Events

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-140` | Dead ball — distracted batter | NOT-IMPLEMENTED | No dead-ball concept anywhere in backend or frontend (grep: zero hits). |
| `T20-141` | Dead ball — animal | NOT-IMPLEMENTED | No dead-ball concept. |
| `T20-142` | Dead ball — ball bursts | NOT-IMPLEMENTED | No dead-ball concept. |
| `T20-143` | Dead ball — sight screen | NOT-IMPLEMENTED | No dead-ball concept. |
| `T20-144` | Dead ball — crowd | NOT-IMPLEMENTED | No dead-ball concept. |
| `T20-145` | Ball slips before delivery | NOT-IMPLEMENTED | No dead-ball concept. |
| `T20-146` | Valid delivery hits stumps | TESTABLE | This is just a normal Bowled — asserts the app does NOT cancel it. |
| `T20-147` | Ball lodged in equipment | NOT-IMPLEMENTED | No special-event model. |
| `T20-148` | Lost ball | NOT-IMPLEMENTED | No lost-ball / replacement-ball model. |
| `T20-149` | Helmet on ground hit | TESTABLE | `awardPenalty` gives a fixed 5 runs to either side, which covers the helmet case. But `extras_penalty` is stored on `Innings` (L78) and is NOT exposed in `BallResponseDTO.InningsStateDTO` (fields end at `extrasLegBye`, L68), so penalty runs cannot be 'separately represented' in the live UI. |

### 8. Bowler Change / Incomplete Over

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-160` | Bowler injured mid-over | NEEDS-FIXTURE | `bowlerInjuryReplace` (ScoringController L210) — valid only when ballInOver > 0. |
| `T20-161` | Bowler suspended mid-over | TESTABLE | Same endpoint; `BowlerInjuryReplaceRequest` carries no reason field, so 'suspended' vs 'injured' is not distinguishable. |
| `T20-162` | Wrong bowler before ball | TESTABLE | `correctBowler` (ScoringService L302) — rejected with 400 unless ballInOver == 0. |
| `T20-163` | Wrong bowler after ball | NEEDS-FIXTURE | `editDelivery` accepts `bowlerPublicId` (L778) then full replay. |
| `T20-164` | Incomplete over due to rain | NEEDS-FIXTURE | advanceTo(3 balls in an over), pause, resume, assert next ball is x.4. |
| `T20-165` | Resume after interruption | TESTABLE | `pauseMatch` / `resumeMatch` (MatchService L726/L756). |

### 9. Milestones / Partnerships / Timing / Live Notes

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-180` | Batting 50 | NEEDS-FIXTURE | advanceTo(50 runs). NOTE: there is no in-match milestone indicator; fifties are only derived post-hoc in `CareerStatsService` L122. |
| `T20-181` | Batting 100 | NEEDS-FIXTURE | As T20-180 (`CareerStatsService` L94/L122). |
| `T20-182` | Duck | NOT-IMPLEMENTED | No duck classification anywhere (grep 'duck': zero hits in backend). |
| `T20-183` | Golden Duck | NOT-IMPLEMENTED | No golden-duck classification. |
| `T20-184` | Diamond Duck | NOT-IMPLEMENTED | No diamond-duck classification. |
| `T20-185` | Silver Duck | NOT-IMPLEMENTED | No silver-duck classification. |
| `T20-186` | Pair/King Pair | NOT-IMPLEMENTED | No pair / king-pair classification. |
| `T20-187` | Bowler 3/4/5 wickets | NOT-IMPLEMENTED | No bowler milestone counter (3/4/5-fer). Raw wicket count exists. |
| `T20-188` | Maiden | NEEDS-FIXTURE | Maidens ARE tracked (`postBall` L186, `replayInnings` L917). NOTE: the over-runs sum includes byes/leg-byes, so an over with a bye is not counted a maiden. |
| `T20-189` | Wicket maiden | NOT-IMPLEMENTED | No wicket-maiden field. |
| `T20-190` | Hat-trick | NOT-IMPLEMENTED | No hat-trick detection. |
| `T20-191` | Four wickets in four balls | NOT-IMPLEMENTED | No four-in-four detection. |
| `T20-192` | Five wickets in over | NOT-IMPLEMENTED | No five-in-an-over detection. |
| `T20-193` | Partnership 10/25/50/75/100 | NOT-IMPLEMENTED | No partnership milestone tracking. Live partnership runs/balls DO exist (`Innings` L154-158) and are covered by T20-310 / EDGE-23. |
| `T20-194` | Partnership broken by wicket | NOT-IMPLEMENTED | No partnership history is persisted. `applyBall` L1136 zeroes `partnershipRuns`/`partnershipBalls` on a wicket; nothing stores the finished partnership's runs/balls/end time. |
| `T20-195` | Partnership broken by retirement | NOT-IMPLEMENTED | As T20-194. |
| `T20-196` | Batter in time | TESTABLE-BACKEND-ONLY | `innings_batting_stats.crease_entered_at` + `current_stint_started_at` (V87) exist in the DB but are not returned by any scoring API — verify by DB row. |
| `T20-197` | Batter out time | TESTABLE-BACKEND-ONLY | `crease_exited_at` (`applyBall` L1066). Delivery `created_at` is the separate delivery timestamp. |
| `T20-198` | Retired hurt timing | TESTABLE | `current_stint_started_at` is the return time and `crease_exited_at` is written once and never overwritten, but there is no distinct `retiredHurtTime` field — the three timestamps the workbook asks for are not all separable. |
| `T20-199` | Partnership duration with rain | NOT-IMPLEMENTED | No wall-vs-active partnership duration. `MatchLiveAnnotation.partnership_duration_seconds` exists but no interruption time is subtracted. |
| `T20-200` | Drinks break timing | NOT-IMPLEMENTED | No drinks-break concept and no active-vs-wall time computation. |
| `T20-201` | Live note context | TESTABLE | `MatchLiveAnnotation` captures innings/over/ball, both batters, bowler, partnership runs+balls, score/wickets, RRR, projected score and user (entity L34-104). It does NOT capture a delivery ID — there is no delivery FK. |
| `T20-202` | Live note category | TESTABLE | 11 categories in the note form (`LiveScorerPage.tsx:1424`); `category` column on the entity. |
| `T20-203` | Note timestamp | AMBIGUOUS | Only server `created_at` (entity L64). No client timestamp is sent or stored. |
| `T20-204` | Note survives delivery correction | NOT-IMPLEMENTED | The note has no delivery FK, so 'remains linked to delivery ID' cannot hold. |

### 10. Match Timing / Pause / Rain

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-220` | T20 timing configuration | AMBIGUOUS | See T20-002 — over-rate rules are not stored and session length is hardcoded. |
| `T20-221` | Rain pause | AMBIGUOUS | Interruption start IS saved (`paused_at`, MatchService L739) and score/over/players are untouched, but there is no DELAYED status — the match stays IN_PROGRESS with a `pauseReason` set. |
| `T20-222` | Rain resume | TESTABLE | `resumeMatch` accumulates `totalBreakSeconds` (MatchService L764). |
| `T20-223` | Bad light | TESTABLE | 'Bad Light' preset (`PAUSE_REASONS`, `LiveScorerPage.tsx:1078`). |
| `T20-224` | Wet outfield | TESTABLE | `postBall` L69 returns 409 while paused; the scoring pad also gets `pointer-events-none` (`LiveScorerPage.tsx:1680`). |
| `T20-225` | Lightning | AMBIGUOUS | 'Lightning' preset exists and resume is gated to ADMIN/SUPER_ADMIN (`validateAdminOrSuperAdmin`), but there is no SUSPENDED status. |
| `T20-226` | Medical emergency | TESTABLE | 'Medical Emergency' preset. |
| `T20-227` | Equipment failure | TESTABLE | 'Equipment Failure' preset. |
| `T20-228` | Crowd interruption | TESTABLE | 'Crowd' preset. |
| `T20-229` | Power failure | TESTABLE | Not a preset, but the pause modal accepts free text (`LiveScorerPage.tsx:3283`). |
| `T20-230` | Drinks break | AMBIGUOUS | No drinks-break feature. A custom pause reason plus `totalBreakSeconds` gets the duration, but there is no timer and no separate break type. |
| `T20-231` | Over-rate warning | NEEDS-FIXTURE | The match clock renders 'Xm behind' / 'Xm ahead' (`LiveScorerPage.tsx:1401-1409`) — needs `scheduledStartTime` set on the fixture match. |
| `T20-232` | Multiple interruptions | AMBIGUOUS | Each pause/resume writes an audit row with reason, timestamp and actor (MatchService L744/L772), but only a cumulative `total_break_seconds` is stored — there is no per-interruption record with its own start/end/duration. |

### 11. T20 Innings End / Target / Rain / Results

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-250` | All out | NEEDS-FIXTURE | `isInningsComplete` L1163 (`allOut`). Needs 10 wickets — use a short XI or advanceTo. |
| `T20-251` | 20 overs completed | NEEDS-FIXTURE | `oversComplete` L1164. Use a 2-over fixture match rather than 120 balls. |
| `T20-252` | Target achieved | NEEDS-FIXTURE | `targetReached` L1166 — needs a closed 1st innings. |
| `T20-253` | Target achieved by boundary | NEEDS-FIXTURE | As T20-252. |
| `T20-254` | Target achieved by extra | NEEDS-FIXTURE | As T20-252. |
| `T20-255` | Target not achieved | NEEDS-FIXTURE | `recordResult` WON_BY_RUNS. |
| `T20-256` | Tie | NEEDS-FIXTURE | Tie -> `closeInnings` L395 auto-creates the Super Over innings. |
| `T20-257` | No Result | TESTABLE | `resultType = NO_RESULT` (`match.ts:27`). |
| `T20-258` | Abandoned | TESTABLE | `resultType = ABANDONED`. |
| `T20-259` | Forfeit | NOT-IMPLEMENTED | No FORFEIT result type (`ResultType` union, `match.ts:21-28`). |
| `T20-260` | Conceded | NOT-IMPLEMENTED | No CONCEDED result type. |
| `T20-261` | Revised target | NOT-IMPLEMENTED | No revised-target field. `Innings.target` is computed as 1st-innings runs + 1 and never revised. |
| `T20-262` | DLS | NOT-IMPLEMENTED | No DLS. The only DLS/VJD code is `UmpireAssistPage.tsx`, which has no route and is unrelated to scoring. |
| `T20-263` | VJD/custom target | NOT-IMPLEMENTED | No VJD in the scoring module — see T20-262. |
| `T20-264` | Multiple rain recalculation | NOT-IMPLEMENTED | No rain recalculation. |

### 12. Super Over / Powerplay / Field Restrictions

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-280` | One Super Over | NEEDS-FIXTURE | Implemented (V92): `buildSuperOverInnings` MatchService L412; match status SUPER_OVER; `maxBalls`/`maxWickets` per innings. |
| `T20-281` | Super Over batting pair | NEEDS-FIXTURE | `existsDismissedInPriorSuperOverInnings` (`selectBatter` L625). |
| `T20-282` | Super Over wicket | NEEDS-FIXTURE |  |
| `T20-283` | Super Over ends by wickets | NEEDS-FIXTURE | `innings.maxWickets` overrides in `isInningsComplete` L1156. |
| `T20-284` | Super Over six balls | NEEDS-FIXTURE | `innings.maxBalls` overrides in `isInningsComplete` L1159. |
| `T20-285` | Super Over tie | NEEDS-FIXTURE | `closeInnings` L359 chains a further Super Over. |
| `T20-286` | Multiple Super Overs | NEEDS-FIXTURE | `consecutiveTiedSuperOvers`; coin flip at 3 (`LiveScorerPage.tsx:3314`). |
| `T20-287` | Same-player restriction | NEEDS-FIXTURE | Batter: `selectBatter` L625. Bowler: `postBall` L112 blocks consecutive-SO bowlers. |
| `T20-288` | Powerplay start | NOT-IMPLEMENTED | No powerplay in the scoring module. Only `UmpireAssistPage.tsx` (unrouted) mentions it. |
| `T20-289` | Powerplay end | NOT-IMPLEMENTED | No powerplay. |
| `T20-290` | Custom powerplay | NOT-IMPLEMENTED | No powerplay. |
| `T20-291` | Field restriction display | NOT-IMPLEMENTED | No field-restriction display. |
| `T20-292` | Restriction violation metadata | NOT-IMPLEMENTED | No field-restriction violation model. |

### 13. Corrections / Undo / Redo / Replay

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-310` | Undo last ball | NEEDS-FIXTURE | `undoLastBall` L225 -> `replayInnings` L870, which rebuilds striker/non-striker/partnership/free-hit from scratch (L895-901). |
| `T20-311` | Redo | NOT-IMPLEMENTED | No redo. `undoLastBall` hard-deletes the delivery (`deleteLastDelivery` L244); grep 'redo' across the frontend returns zero hits. |
| `T20-312` | Undo over | NEEDS-FIXTURE | Repeat undo six times. |
| `T20-313` | Edit dismissal | TESTABLE | `editDelivery` `dismissalType` L777. NOTE: clearing `dismissalType` to "" does not clear `delivery.isWicket` — likely a bug to confirm. |
| `T20-314` | Edit extras | TESTABLE | `editDelivery` `extraType`/`runsExtras` L768-776, then full replay. |
| `T20-315` | Edit batsman | NOT-IMPLEMENTED | Explicitly refused: `editDelivery` L729-735 throws 400 for `batsmanPublicId`/`nonStrikerPublicId`/`dismissedPlayerPublicId`. Documented product decision ('Undo back to that ball and re-score instead'). |
| `T20-316` | Edit bowler | TESTABLE | `editDelivery` `bowlerPublicId` L778. |
| `T20-317` | Penalty runs | TESTABLE | `awardPenalty` works, but `extras_penalty` is not in `BallResponseDTO` — see T20-149. |
| `T20-318` | Correct batting order | NOT-IMPLEMENTED | `battingOrder` is only settable via `setTeams`, which throws unless the match is in SETUP (`MatchService` L155). No post-start reorder endpoint. |
| `T20-319` | Replace player | TESTABLE | `substitutePlayer` (MatchService L856) with a reason; Model B (fresh stats). |
| `T20-320` | Change keeper | TESTABLE | `changeWicketkeeper` (ScoringService L498) writes a `wicketkeeper_changes` row keyed on `before_sequence_number`, so history is unchanged. |
| `T20-321` | Change captain | NOT-IMPLEMENTED | No change-captain endpoint. `isCaptain` is set only in `setTeams`. |
| `T20-322` | Recalculate score | NEEDS-FIXTURE | Any undo or edit triggers `replayInnings`, which recomputes every aggregate from the delivery stream. |
| `T20-323` | Audit history | NOT-IMPLEMENTED | `ScoringService` calls `auditService.audit` exactly once — inside `changeWicketkeeper` (L559). postBall, undoLastBall, editDelivery, awardPenalty, selectBatter, correctBowler and swapBatters write NO audit row, so there is no who/when/old/new/reason trail for a scoring correction. |
| `T20-324` | Replay innings | NEEDS-FIXTURE | `replayInnings` L870. |

### 14. Crash / Logout / Offline / Sync

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-340` | Autosave every ball | TESTABLE | Every tap is a synchronous `postBall` inside one `@Transactional` (L60). |
| `T20-341` | Crash after normal ball | TESTABLE | Reload the page; `getScoringState` L795 restores server-authoritative state. |
| `T20-342` | Crash after wide | TESTABLE | As T20-341. |
| `T20-343` | Crash after wicket | TESTABLE | As T20-341; `selectBatter` persists the new batter server-side (ScoringController L156 comment). |
| `T20-344` | Logout/relogin | TESTABLE | Clear the token, log in again, reopen the scorer. |
| `T20-345` | Browser refresh | TESTABLE | As T20-341. |
| `T20-346` | Offline scoring | NOT-IMPLEMENTED | Deferred by design — CLAUDE.md: 'a true offline scoring queue is deferred — it conflicts with this model'. No service worker, no queue, no offline indicator. |
| `T20-347` | Reconnect sync | NOT-IMPLEMENTED | No sync layer — see T20-346. |
| `T20-348` | Duplicate sync | NOT-IMPLEMENTED | No idempotency key on `postBall`; a replayed request creates a second delivery. |
| `T20-349` | Two scorers conflict | NOT-IMPLEMENTED | `findByMatchIdAndStatusForUpdate` serialises writes, but there is no version token or conflict surface — a second scorer's ball is silently appended. |
| `T20-350` | Partial save failure | AMBIGUOUS | `postBall` is a single transaction so a partial write cannot commit, and the UI surfaces the error, but forcing a partial failure deterministically from a browser test is not practical. |
| `T20-351` | Client/server time | NOT-IMPLEMENTED | No client timestamp is sent or stored — see T20-203. |

### 15. Fielding / Batting / Bowling Statistics

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `T20-370` | Catch stat | TESTABLE-BACKEND-ONLY | Catches are derivable (`TournamentStatsService` L380, `ScorecardService` L645) but the live scorer shows no fielding stats. |
| `T20-371` | Run-out stat | NOT-IMPLEMENTED | No direct-hit or assist distinction — see T20-116. |
| `T20-372` | Stumping stat | TESTABLE-BACKEND-ONLY | `countKeeperStumpingsInRange` (`ScorecardService` L646). |
| `T20-373` | Dropped catch | NOT-IMPLEMENTED | No dropped-catch event. |
| `T20-374` | Direct hit | NOT-IMPLEMENTED | No direct-hit flag. |
| `T20-375` | Assist | TESTABLE-BACKEND-ONLY | `fielder2` exists on `Delivery` (L90) but has no UI — see T20-117. |
| `T20-376` | Misfield | NOT-IMPLEMENTED | No misfield event. |
| `T20-377` | Batting reconciliation | TESTABLE | Sum batter runs + all extras vs `innings.totalRuns`. NOTE: penalty runs are in the total but absent from the extras DTO, so a UI-only reconciliation will not close — see T20-149. |
| `T20-378` | Batting balls | TESTABLE | `applyBall` L1046. |
| `T20-379` | 4s/6s | TESTABLE | `applyBall` L1051-1052. |
| `T20-380` | Strike rate | TESTABLE | Computed in `ScorecardService`; `balls == 0` handling to be confirmed by test. |
| `T20-381` | Bowling overs | TESTABLE | `bos.legalBalls` L1094; `fmtOvers` divides by ballsPerOver. |
| `T20-382` | Bowling runs | TESTABLE | Workbook satisfied since BUG-02 (`715a382`): the bowler is charged batsman runs, all runs off a wide, and the no-ball penalty only.|
| `T20-383` | Bowling wickets | TESTABLE | `isBowlerWicket` excludes RUN_OUT / RETIRED_HURT / RETIRED_OUT (L1086-1089). |
| `T20-384` | Economy | TESTABLE | Derived from runsConceded / overs; inherits the T20-382 attribution question. |
| `T20-385` | Dot balls | TESTABLE | `isDot = isLegal && runsBatsman == 0 && extraType == null` (L1084) — a leg-bye ball is correctly not a dot. |
| `T20-386` | Extras summary | TESTABLE | Workbook satisfied since BUG-04 (`8549c47`): `extrasPenalty` is on `InningsStateDTO` and both scorecard DTOs, so wides, no-balls, byes, leg-byes and penalties all reconcile against the team total.|
| `T20-387` | Wagon wheel/scoring area | TESTABLE | `WagonWheelModal.tsx` + `PATCH .../deliveries/{id}/shot-zone` (ScoringController L93). |

### 16. Critical Combination / Edge-Case Matrix

| ID | Title | Class | Evidence / note |
|----|-------|-------|-----------------|
| `EDGE-01` | Wide + run out | TESTABLE-BACKEND-ONLY | UI GAP — see T20-026. |
| `EDGE-02` | Wide + stumping | TESTABLE | See T20-025. |
| `EDGE-03` | Wide to boundary | TESTABLE | WD+4 -> 5 wides. |
| `EDGE-04` | Wide + bye classification conflict | TESTABLE | `Delivery.extraType` is a single column, so wide+bye is structurally impossible. Assert the stored extraType is exactly one value; note there is no explicit validation message. |
| `EDGE-05` | No ball + catch | TESTABLE-BACKEND-ONLY | UI GAP: no no-ball toggle in the wicket modal. Backend only blocks non-run-out dismissals when `isFreeHit` is true (`postBall` L162) — a CAUGHT on a plain no-ball is NOT blocked. Expect a failure against the workbook. |
| `EDGE-06` | No ball + run out | TESTABLE-BACKEND-ONLY | UI GAP — as EDGE-05; run out is the legal case. |
| `EDGE-07` | No ball + stumping | TESTABLE-BACKEND-ONLY | UI GAP — as EDGE-05. |
| `EDGE-08` | No ball + 4 byes | TESTABLE | See T20-031 — byes are folded into the no-ball bucket and fully charged to the bowler. |
| `EDGE-09` | Free hit + bowled | TESTABLE | See T20-060. |
| `EDGE-10` | Free hit + run out | TESTABLE | See T20-064. |
| `EDGE-11` | Last ball + wide + run | NEEDS-FIXTURE | advanceTo(5). |
| `EDGE-12` | Last ball + NB + four | NEEDS-FIXTURE | advanceTo(5). |
| `EDGE-13` | Last ball + bye | NEEDS-FIXTURE | advanceTo(5). |
| `EDGE-14` | Last ball + wicket | NEEDS-FIXTURE | advanceTo(5). |
| `EDGE-15` | Short run + wicket | NOT-IMPLEMENTED | No short-run concept. |
| `EDGE-16` | Retired hurt + partnership | TESTABLE | Partnership resets on a RETIRED_HURT delivery because `applyBall` L1136 branches on `isWicket`, which is true for retirements. |
| `EDGE-17` | Retired hurt + return + wicket | TESTABLE | V87 covers the return path; see T20-120/121. |
| `EDGE-18` | Bowler injured + over completion | NEEDS-FIXTURE | `bowlerInjuryReplace` mid-over; figures split across two `InningsBowlingStat` rows. |
| `EDGE-19` | Rain + incomplete over | NEEDS-FIXTURE | See T20-164. |
| `EDGE-20` | Rain + batter timing | NOT-IMPLEMENTED | See T20-199. |
| `EDGE-21` | Wrong batter + downstream ball | NOT-IMPLEMENTED | Edit-batsman is refused — see T20-315. |
| `EDGE-22` | Wrong bowler + completed over | NEEDS-FIXTURE | `editDelivery` bowler change + replay; but no audit row is written — see T20-323. |
| `EDGE-23` | Undo after wicket | NEEDS-FIXTURE | `replayInnings` restores partnership and strike, not just the score (L895-901). |
| `EDGE-24` | Undo after resume | NEEDS-FIXTURE | Undo is blocked while paused (`undoLastBall` L230 -> 409), so resume first; `total_break_seconds` is not touched by a replay. |
| `EDGE-25` | Crash after correction | NEEDS-FIXTURE | Edit, then reload. |
| `EDGE-26` | Offline + wicket | NOT-IMPLEMENTED | See T20-346. |
| `EDGE-27` | Duplicate event | NOT-IMPLEMENTED | See T20-348. |
| `EDGE-28` | Concurrent scorers | NOT-IMPLEMENTED | See T20-349. |
| `EDGE-29` | Helmet penalty + wicket | TESTABLE | See T20-149 — penalty runs are not separately represented in the live state. |
| `EDGE-30` | Obstruction during run | TESTABLE | OBSTRUCTING_FIELD is in the UI list; runs on the ball are selectable 0-4. |
| `EDGE-31` | Timed out after wicket | NOT-IMPLEMENTED | See T20-125. |
| `EDGE-32` | Concussion/impact substitute | NOT-IMPLEMENTED | No concussion/impact-substitute eligibility. Generic substitution exists (T20-319) but enforces no like-for-like rule. |
| `EDGE-33` | Super Over after tie | NEEDS-FIXTURE | See T20-280. |
| `EDGE-34` | Multiple Super Over tie | NEEDS-FIXTURE | See T20-286. |
| `EDGE-35` | Caught and crossed before catch | AMBIGUOUS | No crossing model. `applyBall` L1101 rotates strike on odd total runs regardless of dismissal, and the wicket modal lets a scorer attach 0-4 runs to a Caught. Needs a product ruling before it can be asserted. |
| `EDGE-36` | Wide cannot also be bye | TESTABLE | Structurally prevented — see EDGE-04. |
