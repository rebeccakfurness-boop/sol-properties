// Renders brochure/brochure.html to assets/serangan-sands-brochure.pdf (A4).
// Needs Playwright with Chromium installed: `npx playwright install chromium`.
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.join(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'brochure/brochure.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(root, 'assets/serangan-sands-brochure.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('Wrote', out);
})();
