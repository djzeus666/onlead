import { test, expect } from '@playwright/test';

const DEMO = { email: 'artem@onlead.local', password: 'demo1234' };

async function loginToken(request) {
  const login = await request.post('/api/auth/login', { data: DEMO });
  if (!login.ok()) return null;
  const { token } = await login.json();
  return token || null;
}

async function seedSession(page, token) {
  await page.goto('/');
  await page.evaluate((t) => {
    sessionStorage.setItem('onlead-token', t);
    localStorage.setItem('onlead-token-pay', t);
  }, token);
}

test.describe('OnLead critical flows', () => {
  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('onlead');
  });

  test('login and /api/me snapshot', async ({ request }) => {
    const token = await loginToken(request);
    if (!token) test.skip(true, 'Demo user not present in local data store');

    const me = await request.get('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const snap = await me.json();
    expect(snap.user?.email).toBeTruthy();
    expect(Array.isArray(snap.campaigns)).toBe(true);
  });

  test('hash route subscriptions anchor loads SPA', async ({ page, request }) => {
    const token = await loginToken(request);
    if (!token) test.skip(true, 'Demo user missing');
    await seedSession(page, token);
    await page.goto('/#/office/subscriptions#leadgen');
    await expect(page.locator('#app')).not.toBeEmpty();
    await expect(page).toHaveURL(/subscriptions/);
  });

  test('content office route renders shell', async ({ page, request }) => {
    const token = await loginToken(request);
    if (!token) test.skip(true, 'Demo user missing');
    await seedSession(page, token);
    await page.goto('/#/office/content');
    await expect(page.locator('#app')).not.toBeEmpty();
    await expect(page).toHaveURL(/content/);
  });

  test('team API invite validation', async ({ request }) => {
    const token = await loginToken(request);
    if (!token) test.skip(true, 'Demo user missing');

    const team = await request.get('/api/team', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(team.ok()).toBeTruthy();
    const payload = await team.json();
    expect(Array.isArray(payload.members)).toBe(true);
    expect(payload.members.some((m) => m.role === 'owner')).toBe(true);

    const badInvite = await request.post('/api/team/invite', {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: 'not-an-email', role: 'member' },
    });
    expect(badInvite.status()).toBe(400);
  });
});
