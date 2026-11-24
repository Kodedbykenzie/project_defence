import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  console.log('Navigating to http://127.0.0.1:5173/login');
  try {
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully');
    await page.screenshot({ path: '/tmp/test2.png' });
    console.log('Screenshot saved');
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
})();