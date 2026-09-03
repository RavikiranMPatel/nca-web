# T20 Scoring — Test Plan

Playwright UI suite for the live scoring module, covering the T20 scoring
workbook (`WORKBOOK-EXTRACTED.md`, 248 scenarios) on desktop and mobile.

Companion documents:

| File | What it holds |
|------|---------------|
| `WORKBOOK-EXTRACTED.md` | The workbook, deduped, in its own wording |
| `COVERAGE-MATRIX.md` | Every scenario classified against what the code does |
| `TEST-RESULTS.md` | Generated from the Playwright JSON reporter — never hand-edited |
| `BUGS-FOUND.md` | App bugs (not test bugs), with repro and severity |

---

## Where everything lives

```
nca-web/nca-web/
  playwright.config.ts          three projects; localhost safety gate
  .env.test                     LOCAL CREDENTIALS — gitignored, never committed
  e2e/
    fixtures/
      env.ts                    reads .env.test
      api.ts                    authenticated API client, one per academy
      scoringMatch.ts           the scoringMatch fixture + advanceTo()
      expectState.ts            the one-call state assertion
    specs/
      fixture.spec.ts           harness self-tests
      tenant-isolation.spec.ts  hard rule 2 gate — run these first
    tools/
      build-results.mjs         regenerates TEST-RESULTS.md
    report/                     HTML + JSON reporter output
    .artifacts/                 traces and screenshots from failures
```

---

## First-time setup

Four things must be true before the suite runs.

**1 — Postgres.** A local PostgreSQL 17 on `localhost:5432` with a database
called `nca_scoring_test`. Create it empty and let Flyway build it:

```bash
createdb -h localhost -p 5432 -U postgres nca_scoring_test
```

> The repo's `codebase/docker-compose.yml` is *not* the path in use here — it
> pins `postgres:15` on port 5433 and no container is running. See BUGS-FOUND.md
> BUG-09.

**2 — Backend on 8081.** Port 8080 is occupied by an unrelated local app, so the
scoring backend runs beside it:

```bash
cd nextgen-cricket-academy
./mvnw spring-boot:run -Dspring-boot.run.arguments="\
  --server.port=8081 \
  --spring.datasource.url=jdbc:postgresql://localhost:5432/nca_scoring_test \
  --app.root-domain=localhost \
  --app.email.enabled=false"
```

`--app.root-domain=localhost` makes `TenantResolverFilter` resolve
`<slug>.localhost` to an academy. `--app.email.enabled=false` keeps the suite off
the live dev Brevo key. Flyway applies all 95 migrations to v96 on first boot.

**3 — Two test academies.** The suite needs `TESTACAD_A` and `TESTACAD_B`, each
with a main branch and one `ROLE_ADMIN` user. Both academies need a `slug`
(`testacad-a` / `testacad-b`) because login resolves the tenant from the Host
header. Passwords are generated locally and bcrypt-hashed at strength 10, which
is what `BCryptPasswordEncoder` uses by default.

**4 — `.env.test`.** Gitignored via `.gitignore:26` (`.env.*`) — verify with
`git check-ignore -v .env.test` before writing it. Shape:

```
E2E_API_BASE=http://localhost:8081
E2E_WEB_BASE=http://localhost:5173
E2E_A_SLUG / E2E_A_ORIGIN / E2E_A_EMAIL / E2E_A_PASSWORD
E2E_B_SLUG / E2E_B_ORIGIN / E2E_B_EMAIL / E2E_B_PASSWORD
E2E_DB_NAME / E2E_DB_USER / E2E_DB_HOST / E2E_DB_PORT
```

`E2E_*_ORIGIN` must be `http://<slug>.localhost:8081`, not plain `localhost` —
see "Why login needs a subdomain" below.

---

## Running

```bash
npm run e2e                 # all three projects
npm run e2e:desktop         # Chromium 1440x900
npm run e2e:mobile          # WebKit, iPhone 14
npm run e2e:report          # open the HTML report

npx playwright test --grep @security          # the hard rule 2 gate only
npx playwright test e2e/specs/section-02.spec.ts
```

Playwright starts the Vite dev server itself, with
`VITE_API_PROXY_TARGET=http://localhost:8081` so the browser talks to the test
backend rather than whatever is on 8080.

After any run, regenerate the results table:

```bash
node e2e/tools/build-results.mjs
```

### Projects

| Project | Engine | Device |
|---------|--------|--------|
| `desktop` | Chromium | 1440x900 |
| `mobile` | WebKit | iPhone 14 |
| `mobile-chrome` | Chromium | Pixel 7 |

Every spec runs in all three unless it is explicitly tagged desktop-only. The
live scorer is a mobile-first full-screen layout with no `AppLayout` and no
`BottomNav`, so the same selectors work across all three.

### The safety gate

`playwright.config.ts` refuses to start if `E2E_WEB_BASE` or `E2E_API_BASE` is
not `localhost` / `127.0.0.1`. This suite creates, scores and deletes matches;
pointing it at a deployed environment would write destructive test data into a
live tenant (CLAUDE.md hard rule 5). The check throws at config load, before any
browser starts.

---

## Fixture design

### `scoringMatch`

Creates a fresh match per test and deletes it afterwards — the workbook says to
reset between independent tests.

Built through the **API**, not the setup UI: `MatchSetupPage` is not under test
here, and driving it would make every scoring test depend on it. The sequence is
`createMatch` → `setTeams` → `toss` → `start` → `selectBatter` ×2 →
`correctBowler`.

Players are **guest entries** (`externalName`), so nothing is added to the
academy's real `players` table — verified: `select count(*) from players` stays
at 0 across full runs.

The workbook baseline is asserted at construction, so a fixture drift fails loudly:

```
India vs Australia · 20 overs
Virat Kohli striker · KL Rahul non-striker · Bumrah bowling
```

`correctBowler` is used to install the opening bowler. There is no dedicated
"set opening bowler" endpoint, and `correctBowler` is legal only while
`ballInOver == 0` — which is exactly the state at match start. Without it the UI
renders "Select bowler" and `score()` refuses to post.

### `advanceTo(state)`

Scores deliveries through the API to reach a `NEEDS-FIXTURE` setup state, so the
51 such scenarios do not each hand-roll it:

```ts
await scoringMatch.advanceTo({ legalBalls: 5 });        // "0.6" in workbook terms
await scoringMatch.advanceTo({ runs: [4, 4, 4, 6, 6] }); // put runs on the bat
```

It re-reads server state before each ball, so it follows strike rotation rather
than assuming it.

### `expectState()`

One call checks everything the workbook's "For every delivery verify" list names:

```ts
await expectState(scoringMatch, {
  runs: 1, wickets: 0, balls: 1, over: 1, ballInOver: 1,
  striker: "KL Rahul", nonStriker: "Virat Kohli",
  batters: { "Virat Kohli": { runs: 1, balls: 1 } },
  bowlers: { Bumrah: { legalBalls: 1, runsConceded: 1 } },
  extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
  partnership: { runs: 1, balls: 1 },
  freeHit: false,
}, page);
```

The backend is authoritative, so every expectation is asserted against
`GET .../scoring/state`. When a `page` is passed, the UI-visible subset is **also**
read from the DOM and compared to that same response — a UI/API divergence fails
the test, because it is itself a bug.

Because a UI-driven delivery is an async POST, `expectState` polls the state
endpoint until the headline numbers settle (5s) before asserting in detail, so a
timeout still produces a real field-level message rather than a bare poll error.

**API-only, by necessity** — the live scorer renders none of these:

- the extras breakdown (there is no extras panel in the scorer at all)
- partnership runs and balls
- per-batter fours/sixes (only shown once non-zero)

`extras_penalty` cannot be asserted anywhere: it exists on the `Innings` row but
is absent from `InningsStateDTO` (BUG-04).

### The wagon-wheel prompt is off in tests

`scoringMatch.open()` seeds `nca_ww_enabled=false`. That is the app's own
preference key (`LiveScorerPage.tsx:343`), not a test-only hack. With it on —
the default — any delivery with runs > 0 opens a full-screen
`fixed inset-0 z-[60]` shot-zone modal (`needsWagonWheel`, L298-302) that covers
the scoring pad and blocks the next tap, so no multi-delivery scenario can be
driven through the UI. Scenarios that are actually about shot zones (T20-387)
re-enable it explicitly.

### Cross-tenant safety

`tenant-isolation.spec.ts` runs in every project and gates the suite. It checks
two different things:

1. A foreign academy reading the match → 404 on match, teams and scoring state.
2. **The actor's own academy passing a foreign academy's player id** → 404 on
   `postBall` (batsman, bowler and fielder), `selectBatter`, `correctBowler` and
   `changeWicketkeeper`, with no rows written, and a control call proving
   same-academy players still score.

The second is the one that matters. Match-level scoping was always correct; the
defect fixed in this session (BUG-06) was in *player* resolution, which a
match-level 404 check never exercises. Verified to fail against the pre-fix
build.

If either fails: **stop**. That is a stop-work security bug under CLAUDE.md hard
rule 2, not a test to fix.

---

## Selector conventions

**`data-testid` only.** Text selectors have matched the wrong element in this
codebase before (the `💪 Fitness & Injury` nav button vs the assessment form's
own Fitness tab). Where a control lacks a testid, add one in the same pass — an
attribute-only change, no logic and no visible change.

Naming: `run-0`…`run-6`, `btn-wicket`, `extra-wide`, `team-score`,
`striker-name`, `bowler-figures`. Controls get `btn-`/`run-`/`extra-` prefixes;
readouts are named for what they display.

### Testids added so far

The scoring module had **zero** testids before this suite (the whole app had
four, all on the assessment form). Added to `src/pages/scoring/LiveScorerPage.tsx`:

| testid | What it marks |
|--------|---------------|
| `team-score` | `{runs}/{wickets}` in the header |
| `over-count` | `{over}.{ball} ov` in the header |
| `crr` | current run rate |
| `free-hit-indicator` | the FREE HIT badge (absent when not a free hit) |
| `striker-name`, `nonstriker-name` | batter names |
| `striker-figures`, `nonstriker-figures` | `runs(balls)` plus 4s/6s |
| `bowler-name` | current bowler |
| `bowler-figures` | `overs-maidens-runs-wickets` |
| `scoring-pad` | the pad container; presence means the scorer has loaded |
| `run-0`, `run-1`, `run-2`, `run-3`, `run-4`, `run-6` | run buttons |
| `btn-wicket` | WICKET button |

Later slices will add testids for the extras row, the wide/no-ball/bye pickers,
the wicket modal, undo, pause/resume and the ball-history editor.

---

## Adding a scenario

1. Find its row in `COVERAGE-MATRIX.md` and check the classification.
   `NOT-IMPLEMENTED` and `AMBIGUOUS` scenarios do **not** get a spec — that is
   the point of the classification.
2. Put it in `e2e/specs/section-NN.spec.ts`, one describe block per workbook
   section.
3. **Name the scenario ID in the test title** — `TEST-RESULTS.md` is generated by
   scanning titles for `T20-\d{3}` / `EDGE-\d{2}`. A test can claim several IDs
   by naming them all.

```ts
test("T20-011 one run — Virat +1, KL faces next", async ({ scoringMatch, page }) => {
  await scoringMatch.open(page);
  await page.getByTestId("run-1").click();
  await expectState(scoringMatch, { runs: 1, striker: "KL Rahul" }, page);
});
```

4. Run it in all three projects, then `node e2e/tools/build-results.mjs`.

### When a test fails

Decide **test bug or app bug** before touching anything, with evidence from the
API response or a DB row — not from reading the code.

- Test bug → fix the test.
- App bug → log it in `BUGS-FOUND.md` with file:line, repro and severity. Do not
  fix scoring bugs in this work. Mark the spec `test.fail()` with the bug id so it
  keeps running and reports "expected to fail but passed" once the app is fixed.
- **Tenant-scoping bug → stop-work.** That one is fixed immediately, with a
  cross-tenant test proving it, under CLAUDE.md hard rule 2.

---

## Classification legend

Carried from `COVERAGE-MATRIX.md`:

| Class | Meaning |
|-------|---------|
| `TESTABLE` | Feature exists, UI reachable — drive it through the UI |
| `TESTABLE-BACKEND-ONLY` | Exists in the API but no UI control; test via API, record the gap |
| `NEEDS-FIXTURE` | Testable but needs seeded state — use `advanceTo()` |
| `NOT-IMPLEMENTED` | Feature absent. Not built here; listed so the gap is visible |
| `AMBIGUOUS` | App defines the rule differently from the workbook; app not changed |

Result values in `TEST-RESULTS.md`: `PASS` · `FAIL` · `BLOCKED` ·
`SKIPPED-NOT-IMPLEMENTED` · `AMBIGUOUS` · `EXPECTED-FAIL (app bug)` ·
`UNEXPECTED-PASS — bug may be fixed` · `—` (no spec claims it yet).

---

## Known constraints

- **Tests run as ADMIN.** `ROLE_COACH` cannot load the scorer page and
  `ROLE_SCORER` cannot reach any scoring endpoint — BUG-07 and BUG-08.
- **Teardown has a documented fallback.** No started match can be deleted through
  the API (BUG-10), so `destroyScoringMatch` falls back to a direct DB delete and
  logs loudly. Verified: a full run leaves zero rows behind.
- **Match creation retries.** Match public ids collide under concurrency
  (BUG-11); `createScoringMatch` retries up to five times on that exact
  constraint rather than serialising the suite, which would hide the defect.
- **`retries: 0`.** A flaky scoring assertion is a finding, not something to
  paper over with a re-run.

### Why login needs a subdomain

`AuthController.login` cross-checks the JWT's academy against the academy
resolved from the request Host, and rejects when no academy resolves. So login
must go to `http://<slug>.localhost:8081`. `*.localhost` resolves to 127.0.0.1 at
OS level on macOS, so no `/etc/hosts` entry is needed.

Every *other* call takes its academy from the JWT — `AcademyContextFilter` runs
before `TenantResolverFilter` and the latter only fills a gap — so the browser
can sit on plain `http://localhost:5173` for everything after login. `Api.login`
handles this: it authenticates against the tenant origin, then switches to the
plain API base for all subsequent requests.
