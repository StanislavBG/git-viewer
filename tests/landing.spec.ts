import { test, expect } from '@playwright/test';

test.describe('landing', () => {
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
});
