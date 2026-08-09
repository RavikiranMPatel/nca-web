import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const MATCH_ID = 'MCH-NCA-1785849061394';
const PASS = 'Verify@123';

async function loginAndNav(browser, w, h, url) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.fill('input[type="email"]', 'verifytest@gymkhana.test');
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.goto(url);
  await page.waitForTimeout(3000);
  return { ctx, page };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ── ITEM 10 ──────────────────────────────────────────────────────────────
  console.log('\n=== ITEM 10: Header buttons at 375px and 1280px ===');
  for (const [w, h, label] of [[375, 667, '375px-mobile'], [1280, 720, '1280px-desktop']]) {
    const { ctx, page } = await loginAndNav(browser, w, h,
      `${BASE}/matches/${MATCH_ID}/live-score`);
    
    await page.screenshot({ path: `/tmp/item10-${label}.png` });
    console.log(`${label} screenshot saved`);
    
    // Find buttons by text content
    const allBtns = await page.$$eval('button', btns => 
      btns.map(b => ({ text: b.textContent?.trim().substring(0,30), w: b.offsetWidth, h: b.offsetHeight }))
           .filter(b => b.text && b.w > 0)
    );
    const reportBtn = allBtns.find(b => b.text.toLowerCase().includes('report'));
    const noteBtn = allBtns.find(b => b.text.toLowerCase().includes('note'));
    console.log(`${label} - Report btn:`, reportBtn || 'NOT FOUND');
    console.log(`${label} - Note btn:`, noteBtn || 'NOT FOUND');
    await ctx.close();
  }

  // ── ITEM 9 ───────────────────────────────────────────────────────────────
  console.log('\n=== ITEM 9: Annotations accordion in MatchReportPage ===');
  {
    // Match WITH annotations
    const { ctx: ctx1, page: pg1 } = await loginAndNav(browser, 390, 844,
      `${BASE}/matches/${MATCH_ID}/report`);
    await pg1.screenshot({ path: '/tmp/item9-with-annotations.png' });
    
    const bodyText = await pg1.evaluate(() => document.body.innerText);
    const hasAnn = bodyText.toLowerCase().includes('annotation') || bodyText.toLowerCase().includes('watching for byes');
    console.log('Match WITH annotations - accordion visible:', hasAnn);
    if (hasAnn) {
      // Try clicking to expand
      const annSection = await pg1.$('[data-testid="annotations"], button:has-text("Annotation"), button:has-text("Note")');
      if (annSection) {
        await annSection.click();
        await pg1.waitForTimeout(500);
        await pg1.screenshot({ path: '/tmp/item9-annotations-expanded.png' });
        console.log('Annotations accordion expanded - screenshot saved');
      }
    }
    await ctx1.close();

    // Match WITHOUT annotations (Practice Match Test - no annotations)
    const { ctx: ctx2, page: pg2 } = await loginAndNav(browser, 390, 844,
      `${BASE}/matches/MCH-NCA-1785860472256/report`);
    await pg2.screenshot({ path: '/tmp/item9-no-annotations.png' });
    const bodyText2 = await pg2.evaluate(() => document.body.innerText);
    const noAnn = !bodyText2.toLowerCase().includes('annotation');
    console.log('Match WITHOUT annotations - no accordion shown:', noAnn);
    await ctx2.close();
  }

  // ── ITEM 11 ──────────────────────────────────────────────────────────────
  console.log('\n=== ITEM 11: Regression - scoring sequence after WK change ===');
  {
    const { ctx, page } = await loginAndNav(browser, 390, 844,
      `${BASE}/matches/${MATCH_ID}/live-score`);
    
    await page.screenshot({ path: '/tmp/item11-scorer-state.png' });
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    // Check score displays (no NaN, no undefined, normal state)
    const hasNaN = bodyText.includes('NaN') || bodyText.includes('undefined') || bodyText.includes('null');
    console.log('No NaN/undefined in scorer:', !hasNaN);
    
    // Check if current over strip is visible
    const hasOverStrip = bodyText.includes('over') || bodyText.includes('Over');
    console.log('Over strip visible:', hasOverStrip);
    
    // Look for score display
    const scoreMatch = bodyText.match(/\d+\/\d+/);
    console.log('Score display:', scoreMatch ? scoreMatch[0] : 'not found');
    
    console.log('Scorer page rendered, body preview:', bodyText.substring(0, 200));
    await ctx.close();
  }

  await browser.close();
  console.log('\n=== All screenshots saved to /tmp/item10-*.png, /tmp/item9-*.png, /tmp/item11-*.png ===');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
