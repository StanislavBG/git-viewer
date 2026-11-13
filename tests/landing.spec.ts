import { test, expect } from '@playwright/test';
import { communityPortfolios, avatarUrl } from '../src/data/landing';

test.describe('landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/git-viewer/**', (route) => route.abort());
  });

  test('pitch renders and never requests data.json', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/?landing=1');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your Git, your Résumé.' }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Your Git, your Résumé · git-viewer by Bilko');
    expect(requests.filter((u) => /data\.json|\/api\/git-viewer/.test(u))).toEqual([]);
  });

  test('valid github URL navigates to ?u=octocat', async ({ page }) => {
    await page.goto('/?landing=1');
    await page.getByRole('textbox').first().fill('https://github.com/octocat');
    await page.getByRole('textbox').first().press('Enter');
    await expect(page).toHaveURL(/\?u=octocat$/);
  });

  test('invalid input shows an alert', async ({ page }) => {
    await page.goto('/?landing=1');
    await page.getByRole('textbox').first().fill('not a user!');
    await page.getByRole('textbox').first().press('Enter');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('user-built portfolios are celebrated with links', async ({ page }, testInfo) => {
    test.skip(communityPortfolios.length === 0, 'no community portfolios listed');
    await page.route('https://avatars.githubusercontent.com/**', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      }),
    );
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?landing=1');
    await expect(page.getByRole('heading', { level: 3, name: 'Built by our users' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'More examples' })).toBeVisible();
    for (const [i, p] of communityPortfolios.entries()) {
      const sel = 'a[data-track="community-open-' + (i + 1) + '"]';
      const link = page.locator(sel);
      await expect(link).toHaveAttribute('href', '?u=' + p.login);
      await expect(link).toContainText('@' + p.login);
      await expect(page.locator('[data-track-redact] ' + sel)).toHaveCount(1);
      await expect(link.locator('img')).toHaveAttribute('src', avatarUrl(p.login));
    }
    await page.locator('.landing-community').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('landing-community-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('landing-community-mobile.png'), fullPage: true });
    expect(requests.filter((u) => /data\.json|\/api\/git-viewer/.test(u))).toEqual([]);
  });
});
