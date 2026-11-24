import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  
  console.log('Navigating to http://localhost:5173/login');
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded successfully');
    await page.screenshot({ path: '/tmp/test4.png' });
    console.log('Screenshot saved');
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
})();