const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';
const MATCH_ID = 'MCH-NCA-1785849061394';
const PASS = 'Verify@123';

async function doLogin(page) {
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.fill('input[type="email"]', 'verifytest@gymkhana.test');
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/home|dashboard/, { timeout: 10000 }).catch(function() {});
  await page.waitForTimeout(1500);
  console.log('Logged in, URL:', page.url());
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ── ITEM 10: Header buttons at 375px and 1280px ──────────────────────────
  console.log('\n=== ITEM 10: Header buttons at 375px and 1280px ===');
  for (var i = 0; i < 2; i++) {
    var w = i === 0 ? 375 : 1280;
    var h = i === 0 ? 667 : 720;
    var label = i === 0 ? '375px-mobile' : '1280px-desktop';

    var ctx = await browser.newContext({ viewport: { width: w, height: h } });
    var page = await ctx.newPage();
    await doLogin(page);

    await page.goto(BASE + '/admin/cricket/matches/' + MATCH_ID + '/score');
    await page.waitForTimeout(5000);
    console.log(label + ' live-score URL:', page.url());
    await page.screenshot({ path: '/tmp/item10-' + label + '.png' });

    var allBtns = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('button')).map(function(b) {
        var r = b.getBoundingClientRect();
        return { text: b.textContent.trim().substring(0, 40), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
      }).filter(function(b) { return b.text && b.w > 0 && b.h > 0; });
    });

    var reportBtn = allBtns.find(function(b) { return b.text.toLowerCase().includes('report'); });
    var noteBtn = allBtns.find(function(b) { return b.text.toLowerCase().includes('note'); });
    console.log(label + ' - Report btn:', reportBtn ? JSON.stringify(reportBtn) : 'NOT FOUND');
    console.log(label + ' - Note btn:', noteBtn ? JSON.stringify(noteBtn) : 'NOT FOUND');
    if (!reportBtn && !noteBtn) {
      console.log(label + ' - All btns:', allBtns.map(function(b) { return '"' + b.text + '"'; }).join(', '));
    }
    await ctx.close();
  }

  // ── ITEM 9: Annotations accordion ────────────────────────────────────────
  console.log('\n=== ITEM 9: Annotations accordion ===');

  // With annotations
  var ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  var pg1 = await ctx1.newPage();
  await doLogin(pg1);
  await pg1.goto(BASE + '/admin/cricket/matches/' + MATCH_ID + '/report');
  await pg1.waitForTimeout(5000);
  console.log('Report page URL:', pg1.url());
  await pg1.screenshot({ path: '/tmp/item9-report-initial.png' });

  var bodyText = await pg1.evaluate(function() { return document.body.innerText; });
  var hasAnn = bodyText.toLowerCase().includes('annotation') || bodyText.includes('watching for byes');
  console.log('Match WITH annotations - accordion section visible:', hasAnn);

  if (hasAnn) {
    // Try to click accordion header
    var annBtn = await pg1.$('button:has-text("Annotation"), button:has-text("annotation"), [data-testid="annotations-header"]');
    if (annBtn) {
      await annBtn.click();
      await pg1.waitForTimeout(800);
      await pg1.screenshot({ path: '/tmp/item9-annotations-expanded.png' });
      console.log('Annotations expanded - screenshot saved');
    } else {
      console.log('Annotations already visible (not collapsed) or button has different label');
    }
    var bodyAfter = await pg1.evaluate(function() { return document.body.innerText; });
    var noteVisible = bodyAfter.includes('watching for byes') || bodyAfter.includes('Sanjay taking');
    console.log('Note text "watching for byes" visible:', noteVisible);
  }
  await ctx1.close();

  // Without annotations (Practice Match Test)
  var ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  var pg2 = await ctx2.newPage();
  await doLogin(pg2);
  await pg2.goto(BASE + '/admin/cricket/matches/MCH-NCA-1785860472256/report');
  await pg2.waitForTimeout(5000);
  await pg2.screenshot({ path: '/tmp/item9-no-annotations.png' });
  var bodyText2 = await pg2.evaluate(function() { return document.body.innerText; });
  var noAnnSection = !bodyText2.toLowerCase().includes('annotation');
  console.log('Match WITHOUT annotations - no section:', noAnnSection);
  await ctx2.close();

  // ── ITEM 11: Scoring regression ───────────────────────────────────────────
  console.log('\n=== ITEM 11: Scorer regression ===');
  var ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  var pg3 = await ctx3.newPage();
  await doLogin(pg3);
  await pg3.goto(BASE + '/admin/cricket/matches/' + MATCH_ID + '/score');
  await pg3.waitForTimeout(5000);
  await pg3.screenshot({ path: '/tmp/item11-scorer.png' });
  var bodyText3 = await pg3.evaluate(function() { return document.body.innerText; });
  var hasNaN = bodyText3.includes('NaN') || bodyText3.includes('undefined');
  console.log('No NaN/undefined:', !hasNaN);
  var scoreMatch = bodyText3.match(/\d+\/\d+/);
  console.log('Score display:', scoreMatch ? scoreMatch[0] : 'not found (check screenshot)');
  console.log('Body (first 300):', bodyText3.substring(0, 300));
  await ctx3.close();

  await browser.close();
  console.log('\nAll screenshots saved to /tmp/');
}

main().catch(function(e) { console.error('Fatal:', e.message, e.stack); process.exit(1); });
