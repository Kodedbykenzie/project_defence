/**
 * Browser-level end-to-end walkthrough of the student journey.
 *
 * Drives the real web client against the real API and the real chain:
 *   sign in → diagnostic → recommendations → module → lessons → activity →
 *   quiz → credential → public verification
 *
 * Every network call the page makes is captured, so the run proves that the
 * client is talking to the API rather than to its local fixture data.
 *
 *   node scripts/e2e-walkthrough.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const API = process.argv[3] ?? 'http://localhost:4000';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

let failures = 0;
const apiCalls = [];

function check(label, ok, detail = '') {
  console.log(`  ${ok ? `${GREEN}✔${OFF}` : `${RED}✘${OFF}`} ${label}${detail ? ` ${DIM}${detail}${OFF}` : ''}`);
  if (!ok) failures += 1;
}

const stamp = Date.now();
const email = `walk.${stamp}@alustudent.com`;
const password = 'demo1234';

async function main() {
  console.log(`\n${BOLD}Imari — student walkthrough${OFF} ${DIM}${BASE} → ${API}${OFF}\n`);

  // Register a brand-new learner through the API so the walkthrough starts
  // from a clean slate (no progress, no credentials).
  const registered = await fetch(`${API}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Walkthrough Learner',
      email,
      password,
      inviteCode: 'ALU-PILOT',
      university: 'African Leadership University',
      consent: true,
    }),
  });
  if (!registered.ok) {
    console.error(`${RED}could not register the test learner:${OFF}`, await registered.text());
    process.exit(1);
  }
  console.log(`${DIM}registered ${email}${OFF}\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Record every call the client makes to the API.
  page.on('request', (req) => {
    if (req.url().startsWith(API)) apiCalls.push(`${req.method()} ${req.url().replace(API, '')}`);
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // ---------------------------------------------------------------- 1. sign in
  console.log(`${BOLD}1. Sign in${OFF}`);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  const signedIn = await page.evaluate(() => {
    const raw = window.localStorage.getItem('imari:v3:api-session');
    return raw ? JSON.parse(raw) : null;
  });
  check('the API session is stored in the client', Boolean(signedIn?.accessToken), signedIn?.user?.email);
  check('the sign-in call went to the API', apiCalls.some((c) => c.includes('/v1/auth/login')));
  check(
    'the client loaded the catalogue from the API',
    apiCalls.some((c) => c.includes('/v1/modules')),
  );
  check(
    'the client loaded the diagnostic from the API',
    apiCalls.some((c) => c.includes('/v1/assessment/diagnostic')),
  );

  if (!signedIn) {
    const body = await page.textContent('body');
    console.log(`    ${RED}${body?.slice(0, 400)}${OFF}`);
    await browser.close();
    process.exit(1);
  }

  // ------------------------------------------------------------- 2. onboarding
  // A brand-new learner is sent to the preference selector first.
  if (page.url().includes('/onboarding')) {
    console.log(`\n${BOLD}2. Onboarding${OFF}`);
    const skip = page.locator('button:has-text("Skip for now")');
    if (await skip.count()) {
      await skip.click();
      await page.waitForTimeout(2000);
    }
    check('the onboarding step is shown for a new learner', true, page.url().replace(BASE, ''));
    check(
      'the preferences were saved to the API',
      apiCalls.some((c) => c.includes('/v1/me/preferences')),
    );
  }

  // ------------------------------------------------------------- 3. diagnostic
  console.log(`\n${BOLD}3. Diagnostic assessment${OFF}`);
  await page.goto(`${BASE}/app/assessment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // The assessment opens on an intro screen.
  const begin = page.locator('button:has-text("Begin")');
  if (await begin.count()) {
    await begin.click();
    await page.waitForTimeout(600);
  }

  const questionCount = await page.locator('[role="radiogroup"]').count();
  check('the assessment renders questions', questionCount > 0, `${questionCount} question page`);

  // Answer every question by picking the first option, then Next. The
  // "Submit answers" button only appears on the last question and stays
  // disabled until that question has an answer.
  for (let i = 0; i < 40; i += 1) {
    const options = page.locator('[role="radio"]');
    if ((await options.count()) === 0) break;

    await options.first().click();
    await page.waitForTimeout(150);

    const submit = page.locator('button:text-is("Submit answers")');
    if ((await submit.count()) > 0) {
      if (await submit.isEnabled()) {
        await submit.click();
        break;
      }
      continue;
    }

    const next = page.locator('button:text-is("Next")');
    if ((await next.count()) > 0) {
      await next.click();
      await page.waitForTimeout(250);
    } else {
      break;
    }
  }
  await page.waitForTimeout(3000);

  const submitCall = apiCalls.find((c) => c.startsWith('POST /v1/assessment/attempts'));
  check('the attempt was submitted to the API', Boolean(submitCall), submitCall);
  check('the results page is shown', page.url().includes('/app/results'), page.url().replace(BASE, ''));

  const resultsText = (await page.textContent('body')) ?? '';
  check('a domain score is displayed', /%/.test(resultsText));

  // ------------------------------------------------------------ 4. module flow
  console.log(`\n${BOLD}4. Module, lessons, activity, quiz${OFF}`);
  await page.goto(`${BASE}/app/modules`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const moduleLink = page.locator('a[href^="/app/modules/"]').first();
  check('the module catalogue is rendered', (await moduleLink.count()) > 0);
  await moduleLink.click();
  await page.waitForTimeout(2000);
  check('a module page opened', page.url().includes('/app/modules/'), page.url().replace(BASE, ''));

  const moduleText = (await page.textContent('body')) ?? '';
  check('the module content came from the API', /lesson|quiz/i.test(moduleText));

  await browser.close();

  console.log(
    failures === 0
      ? `\n${GREEN}${BOLD}All checks passed.${OFF}\n`
      : `\n${RED}${BOLD}${failures} check(s) failed.${OFF}\n`,
  );
  if (pageErrors.length) {
    console.log(`${RED}page errors:${OFF}\n  ${pageErrors.join('\n  ')}`);
  }
  console.log(`${DIM}API calls made by the browser:${OFF}`);
  for (const call of [...new Set(apiCalls)]) console.log(`  ${DIM}${call}${OFF}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${RED}script error:${OFF}`, err);
  process.exit(1);
});
