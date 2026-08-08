/**
 * Playwright test for the two-step delete match flow in MatchListPage.
 *
 * Tests:
 * 1. Delete a match with NO performances → single confirm dialog → gone from list
 * 2. Delete a match WITH performances → step 1 dialog → Cancel → match still in list
 * 3. Delete a match WITH performances → step 1 dialog → 409 received → step 2 dialog
 *    shows correct count → confirm → match gone from list
 */
import { chromium } from 'playwright';

const BASE     = 'http://localhost:5173';
const API      = 'http://localhost:8080';
const HOST_GYM = 'gymkhana.localhost';

// Unique suffix per run so no title ever collides with a previous run's leftovers
const RUN_ID   = Date.now();
const T1_TITLE = `UI-DelTest-NP-${RUN_ID}`;      // no performances
const T2_TITLE = `UI-DelTest-Cncl-${RUN_ID}`;    // cancelled after 409
const T3_TITLE = `UI-DelTest-Cnfm-${RUN_ID}`;    // confirmed deletion

// ── helpers ──────────────────────────────────────────────────────────────────
async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Host: HOST_GYM },
    body: JSON.stringify({ email: 'verifytest@gymkhana.test', password: 'Verify@123' }),
  });
  const d = await r.json();
  if (!d.accessToken) throw new Error('Login failed: ' + JSON.stringify(d));
  return d;
}

async function createMatch(token, title) {
  const r = await fetch(`${API}/api/admin/cricket/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Host: HOST_GYM, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, matchDate: '2026-08-08', totalOvers: 5, matchType: 'PRACTICE' }),
  });
  const d = await r.json();
  if (!d.publicId) throw new Error('createMatch failed: ' + JSON.stringify(d));
  return d.publicId;
}

// Walk up from the title text to the card container, then click its delete button.
// Using ancestor::div[4] (or whichever level gives the card root) — relies on title
// having exactly this many div ancestors before the card boundary.
async function clickDeleteForMatch(page, matchTitle) {
  const titleEl = page.locator(`text="${matchTitle}"`).first();
  // Try from the outermost reasonable ancestor inward to find the delete button
  for (const level of [2, 3, 4, 5]) {
    try {
      const card = titleEl.locator(`xpath=ancestor::div[${level}]`);
      const btn  = card.locator('[title="Delete match"]');
      if (await btn.count() > 0) {
        await btn.click();
        return;
      }
    } catch { /* try next level */ }
  }
  throw new Error(`Could not find delete button for match: ${matchTitle}`);
}

function report(label, pass, detail) {
  console.log(`\n${pass ? '[PASS] ✓' : '[FAIL] ✗'} ${label}`);
  if (detail) console.log(`    ${detail}`);
}

// Wait for the title element to disappear instead of a fixed timeout
async function waitForMatchGone(page, title, timeoutMs = 8000) {
  try {
    await page.waitForSelector(`text="${title}"`, { state: 'detached', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

let allPassed = true;
const authData = await login();
const { accessToken: token, academyId, branchId, academyName, branchName } = authData;

const browser = await chromium.launch({ headless: true });

async function makeCtx() {
  const ctx = await browser.newContext();
  await ctx.addInitScript((a) => {
    localStorage.setItem('accessToken',    a.token);
    localStorage.setItem('userRole',       'ROLE_SUPER_ADMIN');
    localStorage.setItem('academyId',      a.academyId);
    localStorage.setItem('academyPublicId','ACY-GYMKHANA');
    localStorage.setItem('academyName',    a.academyName);
    localStorage.setItem('branchId',       a.branchId);
    localStorage.setItem('branchName',     a.branchName);
    localStorage.setItem('userName',       'VerifyAdmin');
    localStorage.setItem('userEmail',      'verifytest@gymkhana.test');
  }, { token, academyId, branchId, academyName, branchName });
  return ctx;
}

// ─── TEST 1: Delete match with ZERO performances — single confirm dialog ─────
console.log('\n=== TEST 1: Delete match with no performances (single-step confirm) ===');
{
  await createMatch(token, T1_TITLE);
  const ctx  = await makeCtx();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/admin/cricket/matches`);
  await page.waitForSelector(`text="${T1_TITLE}"`, { timeout: 10000 });

  await clickDeleteForMatch(page, T1_TITLE);

  // Step-1 dialog should appear
  const dlg1 = page.locator('text=Delete Match?');
  await dlg1.waitFor({ timeout: 3000 });
  const step1Visible = await dlg1.isVisible();
  allPassed = allPassed && step1Visible;
  report('Step-1 "Delete Match?" dialog appears', step1Visible, '');

  // Click Delete (the confirm button — last "Delete" button visible in the dialog)
  await page.locator('button:has-text("Delete")').last().click();

  // Wait for the match title to disappear from the DOM (not a fixed sleep)
  const gone = await waitForMatchGone(page, T1_TITLE);
  const stillVisible = await page.locator(`text="${T1_TITLE}"`).count();
  const pass = gone && stillVisible === 0;
  allPassed = allPassed && pass;
  report('Match removed from list after single-step delete',
    pass, `Occurrences in list: ${stillVisible} (expected 0)`);

  await ctx.close();
}

// ─── TEST 2: Delete with performances — Cancel on step 2 ─────────────────────
console.log('\n=== TEST 2: Delete with performances — Cancel on step-2 dialog ===');
{
  const matchId = await createMatch(token, T2_TITLE);

  const { execSync } = await import('child_process');
  const uuid = execSync(
    `PGPASSWORD=Password1 psql -h localhost -U postgres -d rkmp_prod_test1 -t -c "SELECT id FROM cricket_matches WHERE public_id='${matchId}';"`
  ).toString().trim();

  execSync(
    `PGPASSWORD=Password1 psql -h localhost -U postgres -d rkmp_prod_test1 -c "` +
    `INSERT INTO match_performances (id, public_id, academy_id, branch_id, player_id, match_date, match_type, player_role, cricket_match_id, is_deleted, is_shared_with_player, version, created_at, updated_at) ` +
    `VALUES (gen_random_uuid(), 'PERF-CNCL-${RUN_ID}', 'caa032ca-2f6b-4f2a-b21f-de0751caf302', 'cecb1ecc-8b84-469a-8a74-447fd4a06bd7', ` +
    `'ade18db9-1208-4c2b-a0fe-a40f68900817', '2026-08-08', 'PRACTICE_MATCH', 'BATSMEN', '${uuid}', false, false, 0, now(), now());"`
  );

  const ctx  = await makeCtx();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/cricket/matches`);
  await page.waitForSelector(`text="${T2_TITLE}"`, { timeout: 10000 });

  await clickDeleteForMatch(page, T2_TITLE);
  await page.locator('text=Delete Match?').waitFor({ timeout: 3000 });
  await page.locator('button:has-text("Delete")').last().click();

  const dlg2 = page.locator('text=Also delete performance records?');
  await dlg2.waitFor({ timeout: 5000 });
  const step2Visible = await dlg2.isVisible();
  allPassed = allPassed && step2Visible;
  report('Step-2 "Also delete performance records?" dialog appears after 409', step2Visible, '');

  const countText = await page.locator('text=1 linked performance record').isVisible();
  allPassed = allPassed && countText;
  report('Dialog shows correct count (1)', countText, '');

  await page.locator('button:has-text("Cancel")').last().click();
  await page.waitForTimeout(500);

  const stillThere = await page.locator(`text="${T2_TITLE}"`).count();
  const pass = stillThere > 0;
  allPassed = allPassed && pass;
  report('Match still in list after Cancel', pass, `Occurrences: ${stillThere} (expected ≥ 1)`);

  await ctx.close();
}

// ─── TEST 3: Delete with performances — Confirm on step 2 ────────────────────
console.log('\n=== TEST 3: Delete with performances — Confirm "Delete anyway" on step-2 ===');
{
  const matchId = await createMatch(token, T3_TITLE);

  const { execSync } = await import('child_process');
  const uuid = execSync(
    `PGPASSWORD=Password1 psql -h localhost -U postgres -d rkmp_prod_test1 -t -c "SELECT id FROM cricket_matches WHERE public_id='${matchId}';"`
  ).toString().trim();

  execSync(
    `PGPASSWORD=Password1 psql -h localhost -U postgres -d rkmp_prod_test1 -c "` +
    `INSERT INTO match_performances (id, public_id, academy_id, branch_id, player_id, match_date, match_type, player_role, cricket_match_id, is_deleted, is_shared_with_player, version, created_at, updated_at) VALUES ` +
    `(gen_random_uuid(), 'PERF-CNFM-A-${RUN_ID}', 'caa032ca-2f6b-4f2a-b21f-de0751caf302', 'cecb1ecc-8b84-469a-8a74-447fd4a06bd7', ` +
    `'ade18db9-1208-4c2b-a0fe-a40f68900817', '2026-08-08', 'PRACTICE_MATCH', 'BOWLER', '${uuid}', false, false, 0, now(), now()), ` +
    `(gen_random_uuid(), 'PERF-CNFM-B-${RUN_ID}', 'caa032ca-2f6b-4f2a-b21f-de0751caf302', 'cecb1ecc-8b84-469a-8a74-447fd4a06bd7', ` +
    `'ade18db9-1208-4c2b-a0fe-a40f68900817', '2026-08-08', 'PRACTICE_MATCH', 'BATSMEN', '${uuid}', false, false, 0, now(), now());"`
  );

  const ctx  = await makeCtx();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/cricket/matches`);
  await page.waitForSelector(`text="${T3_TITLE}"`, { timeout: 10000 });

  await clickDeleteForMatch(page, T3_TITLE);
  await page.locator('text=Delete Match?').waitFor({ timeout: 3000 });
  await page.locator('button:has-text("Delete")').last().click();

  await page.locator('text=Also delete performance records?').waitFor({ timeout: 5000 });
  const count2 = await page.locator('text=2 linked performance records').isVisible();
  allPassed = allPassed && count2;
  report('Step-2 dialog shows count = 2', count2, '');

  await page.locator('button:has-text("Delete anyway")').click();

  // Wait for the match title to disappear from the DOM
  const gone = await waitForMatchGone(page, T3_TITLE);
  const goneFromList = gone && (await page.locator(`text="${T3_TITLE}"`).count()) === 0;
  allPassed = allPassed && goneFromList;
  report('Match gone from list after step-2 confirm', goneFromList, '');

  const matchLeft = execSync(
    `PGPASSWORD=Password1 psql -h localhost -U postgres -d rkmp_prod_test1 -t -c "SELECT COUNT(*) FROM cricket_matches WHERE public_id='${matchId}';"`
  ).toString().trim();
  const perfLeft = execSync(
    `PGPASSWORD=Password1 psql -h localhost -U postgres -d rkmp_prod_test1 -t -c "SELECT COUNT(*) FROM match_performances WHERE cricket_match_id='${uuid}';"`
  ).toString().trim();

  allPassed = allPassed && matchLeft === '0' && perfLeft === '0';
  report(`DB: match rows = ${matchLeft}, performance rows = ${perfLeft} (both expected 0)`,
    matchLeft === '0' && perfLeft === '0', '');

  await ctx.close();
}

await browser.close();

console.log('\n' + '='.repeat(60));
console.log(allPassed ? 'ALL TESTS PASSED ✓' : 'ONE OR MORE TESTS FAILED ✗');
console.log('='.repeat(60));
process.exit(allPassed ? 0 : 1);
