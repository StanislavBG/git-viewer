import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('hosted portfolio shows no owner chrome', async ({ page }) => {
  // the sample fixture lags the GitData contract (no achievements/activity/essays/now), so layer it over the bundled data
  const data = {
    ...JSON.parse(readFileSync('public/data.json', 'utf8')),
    ...JSON.parse(readFileSync('public/data.sample.json', 'utf8')),
  };
  data.developer.avatarUrl = 'https://example.com/avatar.png';
  await page.route('**/api/git-viewer/u/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        login: 'octocat',
        tier: 'free',
        lockedCount: 0,
        updatedAt: new Date().toISOString(),
        data,
      }),
    }),
  );
  await page.goto('/?u=octocat');
  await expect(page.getByRole('heading', { level: 1, name: data.developer.name })).toBeVisible();
  await expect(page.getByText('offline pipeline')).toHaveCount(0);
  await expect(page.getByText('No public commits in the last 12 months')).toHaveCount(0);
  const portrait = page.locator('.hero .portrait');
  await expect(portrait).toHaveText('');
  const content = await portrait.evaluate((el) => getComputedStyle(el, '::after').content);
  expect(['none', 'normal']).toContain(content);
});

test('hosted portfolio with no activity shows the empty notice', async ({ page }) => {
  const data = {
    ...JSON.parse(readFileSync('public/data.json', 'utf8')),
    ...JSON.parse(readFileSync('public/data.sample.json', 'utf8')),
  };
  data.totalCommitsYear = 0;
  data.heatmap = data.heatmap.map((d: { count: number }) => ({ ...d, count: 0, projects: [] }));
  await page.route('**/api/git-viewer/u/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        login: 'vitejs',
        tier: 'free',
        lockedCount: 0,
        updatedAt: new Date().toISOString(),
        data,
      }),
    }),
  );
  await page.goto('/?u=vitejs');
  await expect(
    page.getByText('No public commits in the last 12 months for @vitejs.'),
  ).toBeVisible();
});

test('persona tenant fetches the real login and never shows it', async ({ page }) => {
  const base = {
    ...JSON.parse(readFileSync('public/data.json', 'utf8')),
    ...JSON.parse(readFileSync('public/data.sample.json', 'utf8')),
  };
  base.developer.avatarUrl = 'https://example.com/avatar.png';
  const data = JSON.parse(JSON.stringify(base).split('octocat').join('StanislavBG'));
  data.developer.name = 'StanislavBG';
  data.developer.login = 'StanislavBG';
  const paths: string[] = [];
  await page.route('**/api/git-viewer/u/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    paths.push(path);
    if (!/\/stanislavbg$/i.test(path)) return route.fulfill({ status: 404, body: '{}' });
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        login: 'StanislavBG',
        tier: 'free',
        lockedCount: 0,
        updatedAt: new Date().toISOString(),
        data,
      }),
    });
  });
  await page.goto('/?u=BilkoBibitkov');
  await expect(page.getByText('Bilko Bibitkov').first()).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('StanislavBG');
  expect(paths.some((p) => /\/stanislavbg$/i.test(p))).toBe(true);

  await page.goto('/?u=StanislavBG');
  await expect(page.getByText('Bilko Bibitkov').first()).toBeVisible();
  await expect(page).toHaveURL(/\?u=BilkoBibitkov/);
});
