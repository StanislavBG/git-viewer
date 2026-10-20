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
  const portrait = page.locator('.hero .portrait');
  await expect(portrait).toHaveText('');
  const content = await portrait.evaluate((el) => getComputedStyle(el, '::after').content);
  expect(['none', 'normal']).toContain(content);
});
