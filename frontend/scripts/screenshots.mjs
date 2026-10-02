import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const OUT = new URL('../../docs/screenshots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  { url: '/app', name: 'student-dashboard' },
  { url: '/app/assessment', name: 'assessment' },
  { url: '/app/modules', name: 'modules' },
  { url: '/app/credentials', name: 'credentials' },
  { url: '/app/progress', name: 'progress' },
  { url: '/verify', name: 'verify' },
];
const adminPages = [
  { url: '/admin', name: 'admin-dashboard' },
  { url: '/admin/students', name: 'admin-students' },
  { url: '/admin/credentials', name: 'admin-credentials' },
  { url: '/admin/invites', name: 'admin-invites' },
  { url: '/admin/modules', name: 'admin-modules' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Student login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'aline@alustudent.com');
  await page.fill('input[type="password"]', 'demo1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  for (const p of pages) {
    await page.goto(`${BASE}${p.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${p.name}.png` });
    console.log('saved', p.name);
  }

  // Logout + admin login
  await page.evaluate(() => localStorage.removeItem('imari:v3:session'));
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'admin@imari.rw');
  await page.fill('input[type="password"]', 'demo1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  for (const p of adminPages) {
    await page.goto(`${BASE}${p.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${p.name}.png` });
    console.log('saved', p.name);
  }

  await browser.close();
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
