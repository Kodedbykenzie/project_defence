import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  console.log('Testing basic connectivity...');
  try {
    await page.goto('about:blank');
    console.log('about:blank loaded');
    await page.goto('http://example.com');
    console.log('example.com loaded');
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
})();