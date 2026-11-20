// End-to-end auth check against a running console server.
//   BASE_URL=http://localhost:3000 CHROMIUM=/path/to/chrome node e2e/auth.mjs
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const PASSWORD = 'bunk3d-staff-dev'; // mock adapter only
const CODE = '123456'; // mock adapter only
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => ['error'].includes(m.type()) && !/40[13]/.test(m.text()) && errors.push(m.text()));
page.on('response', (r) => r.status() === 404 && errors.push('404 ' + r.url()));
const path = () => new URL(page.url()).pathname + new URL(page.url()).search;

async function signIn(email, { code = CODE, password = PASSWORD } = {}) {
  await page.goto(BASE + '/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('6-digit code').waitFor({ timeout: 8000 }).catch(() => {});
  if (await page.getByLabel('6-digit code').count()) {
    await page.getByLabel('6-digit code').fill(code);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
}

// 1. Everything is behind sign-in.
for (const c of ['/crew-hq', '/college-hq', '/collab-hq', '/vendor', '/finance', '/ops']) {
  await page.goto(BASE + c);
  check(`signed out: ${c} redirects to sign in`, path().startsWith('/login?next=' + encodeURIComponent(c)), path());
}
await page.goto(BASE + '/');
check('signed out: / goes to sign in', path().startsWith('/login'));
const api = await ctx.request.get(BASE + '/api/auth/session');
check('signed out: session API says 401', api.status() === 401);

// 2. Bad credentials.
await page.goto(BASE + '/login');
await page.getByLabel('Work email').fill('ops@seed.example');
await page.getByLabel('Password').fill('not-the-password');
await page.getByRole('button', { name: 'Continue' }).click();
await page.locator('.alert').waitFor();
check('wrong password shows a generic error', (await page.locator('.alert').innerText()).includes('isn’t right'));
await page.getByLabel('Work email').fill('nobody@seed.example');
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(400);
check('unknown email gives the same error', (await page.locator('.alert').innerText()).includes('isn’t right'));

// 3. Wrong code, then right code.
await signIn('ops@seed.example', { code: '000000' });
await page.locator('.alert').waitFor();
check('wrong code shows tries left', /tries left|try left/.test(await page.locator('.alert').innerText()));
await page.getByLabel('6-digit code').fill(CODE);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/ops**', { timeout: 8000 });
check('ops lands on its own console', path().startsWith('/ops'), path());
await page.getByText('Seed Operations', { exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
check('account menu shows who is signed in', (await page.getByText('Seed Operations', { exact: true }).count()) > 0);
const cookies = await ctx.cookies();
const sess = cookies.find((c) => c.name === 'bunk3d_staff');
check('session cookie is httpOnly and SameSite=Lax', !!sess && sess.httpOnly && sess.sameSite === 'Lax');
check('cookie is not readable from page scripts', !(await page.evaluate(() => document.cookie)).includes('bunk3d_staff'));

// 4. Role isolation.
for (const other of ['/finance', '/crew-hq', '/college-hq', '/collab-hq', '/vendor']) {
  await page.goto(BASE + other);
  check(`ops cannot open ${other}`, path().startsWith('/ops'), path());
}
await page.goto(BASE + '/login');
check('signed-in user is sent away from sign in', path().startsWith('/ops'));

// 5. Tampered cookie.
await ctx.addCookies([{ ...sess, value: sess.value.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) }]);
await page.goto(BASE + '/ops');
check('tampered cookie is rejected', path().startsWith('/login'), path());
await ctx.clearCookies();

// 6. Sign out.
await signIn('finance@seed.example');
await page.waitForURL('**/finance**', { timeout: 8000 });
check('finance lands on finance', path().startsWith('/finance'));
await page.getByRole('button', { name: 'Sign out' }).click();
await page.waitForURL('**/login**');
await page.goto(BASE + '/finance');
check('after sign out the console is closed again', path().startsWith('/login'));

// 7. Each role reaches its console.
const roles = { 'club.lead@seed.example': '/crew-hq', 'club.coordinator@seed.example': '/crew-hq', 'college.admin@seed.example': '/college-hq', 'brand.owner@seed.example': '/collab-hq', 'brand.member@seed.example': '/collab-hq', 'vendor@seed.example': '/vendor', 'finance.approver@seed.example': '/finance', 'ops.lead@seed.example': '/ops' };
for (const [email, home] of Object.entries(roles)) {
  await ctx.clearCookies();
  await signIn(email);
  await page.waitForURL('**' + home + '**', { timeout: 8000 }).catch(() => {});
  check(`${email} reaches ${home}`, path().startsWith(home), path());
}

// 8. Deep link survives sign in.
await ctx.clearCookies();
await page.goto(BASE + '/ops/audit');
await page.getByLabel('Work email').fill('ops@seed.example');
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByLabel('6-digit code').fill(CODE);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/ops/audit', { timeout: 8000 }).catch(() => {});
check('deep link is restored after sign in', path() === '/ops/audit', path());

check('no browser errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
