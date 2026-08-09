const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';
const MATCH_ID = 'MCH-NCA-1785849061394';
const PASS = 'Verify@123';

async function loginAndNav(browser, w, h, url) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  await page.waitForTimeout(2000);

  // Check what inputs exist
  const inputs = await page.evaluate(function() {
    return Array.from(document.querySelectorAll('input')).map(function(e) {
      return { type: e.type, name: e.name, id: e.id, placeholder: e.placeholder };
    });
  });

  if (inputs.length === 0) {
    // Maybe not on login page, try clicking login link
    const loginLink = await page.$('a[href*="login"], button:has-text("Login"), button:has-text("Sign in")');
    if (loginLink) {
      await loginLink.click();
      await page.waitForTimeout(2000);
    }
  }

  const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]';
  const pwSel = 'input[type="password"]';

  await page.waitForSelector(emailSel, { timeout: 10000 });
  await page.fill(emailSel, 'verifytest@gymkhana.test');
  await page.fill(pwSel, PASS);

  const submitBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("Login")') || await page.$('button:has-text("Sign in")');
  if (submitBtn) await submitBtn.click();

  await page.waitForTimeout(4000);
  console.log('After login, URL:', page.url());

  await page.goto(url);
  await page.waitForTimeout(4000);
  console.log('After nav, URL:', page.url());

  return { ctx, page };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // First check login page
  console.log('\n=== Check login page ===');
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/login');
    await page.waitForTimeout(2000);
    const inputs = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('input')).map(function(e) {
        return { type: e.type, name: e.name, id: e.id, placeholder: e.placeholder };
      });
    });
    console.log('Login inputs:', JSON.stringify(inputs));
    await page.screenshot({ path: '/tmp/login-page.png' });
    await ctx.close();
  }

  // ── ITEM 10 ──────────────────────────────────────────────────────────────
  console.log('\n=== ITEM 10: Header buttons ===');
  for (var i = 0; i < 2; i++) {
    var w = i === 0 ? 375 : 1280;
    var h = i === 0 ? 667 : 720;
    var label = i === 0 ? '375px-mobile' : '1280px-desktop';

    var result = await loginAndNav(browser, w, h, BASE + '/matches/' + MATCH_ID + '/live-score');
    var ctx = result.ctx;
    var page = result.page;

    await page.screenshot({ path: '/tmp/item10-' + label + '.png' });
    console.log(label + ' screenshot saved');

    var allBtns = await page.evaluate(function() {
      return Array.from(document.querySelectorAll('button')).map(function(b) {
        var r = b.getBoundingClientRect();
        return { text: b.textContent.trim().substring(0, 40), w: r.width, h: r.height, visible: r.width > 0 };
      }).filter(function(b) { return b.text && b.visible; });
    });

    var reportBtn = allBtns.find(function(b) { return b.text.toLowerCase().includes('report'); });
    var noteBtn = allBtns.find(function(b) { return b.text.toLowerCase().includes('note'); });
    console.log(label + ' - Report btn:', JSON.stringify(reportBtn) || 'NOT FOUND');
    console.log(label + ' - Note btn:', JSON.stringify(noteBtn) || 'NOT FOUND');
    console.log(label + ' - All visible button texts:', allBtns.map(function(b) { return b.text; }).join(' | '));
    await ctx.close();
  }

  // ── ITEM 9 ───────────────────────────────────────────────────────────────
  console.log('\n=== ITEM 9: Annotations accordion ===');
  {
    var r1 = await loginAndNav(browser, 390, 844, BASE + '/matches/' + MATCH_ID + '/report');
    var pg1 = r1.page;
    await pg1.screenshot({ path: '/tmp/item9-with-annotations.png' });
    var bodyText = await pg1.evaluate(function() { return document.body.innerText; });
    var hasAnn = bodyText.toLowerCase().includes('annotation') || bodyText.includes('watching for byes') || bodyText.toLowerCase().includes('note');
    console.log('Match WITH annotations - annotation content visible:', hasAnn);
    console.log('Body excerpt (first 500):', bodyText.substring(0, 500));
    await r1.ctx.close();

    var r2 = await loginAndNav(browser, 390, 844, BASE + '/matches/MCH-NCA-1785860472256/report');
    var pg2 = r2.page;
    await pg2.screenshot({ path: '/tmp/item9-no-annotations.png' });
    var bodyText2 = await pg2.evaluate(function() { return document.body.innerText; });
    var noAnnSection = !bodyText2.toLowerCase().includes('annotation');
    console.log('Match WITHOUT annotations - no section shown:', noAnnSection);
    await r2.ctx.close();
  }

  // ── ITEM 11 ──────────────────────────────────────────────────────────────
  console.log('\n=== ITEM 11: Scorer regression ===');
  {
    var r3 = await loginAndNav(browser, 390, 844, BASE + '/matches/' + MATCH_ID + '/live-score');
    var pg3 = r3.page;
    await pg3.screenshot({ path: '/tmp/item11-scorer.png' });
    var bodyText3 = await pg3.evaluate(function() { return document.body.innerText; });
    var hasNaN = bodyText3.includes('NaN') || bodyText3.includes('undefined');
    console.log('No NaN/undefined:', !hasNaN);
    var scoreMatch = bodyText3.match(/\d+\/\d+/);
    console.log('Score display:', scoreMatch ? scoreMatch[0] : 'not found');
    console.log('Scorer body (first 400):', bodyText3.substring(0, 400));
    await r3.ctx.close();
  }

  await browser.close();
  console.log('\nAll screenshots saved.');
}

main().catch(function(e) { console.error('Fatal:', e.message); process.exit(1); });
