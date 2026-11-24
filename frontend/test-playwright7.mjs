import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  
  console.log('Navigating to http://127.0.0.1:5173/login');
  try {
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded successfully');
    await page.screenshot({ path: '/tmp/test7.png' });
    console.log('Screenshot saved');
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
})();