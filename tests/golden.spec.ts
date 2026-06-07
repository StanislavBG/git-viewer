import { test, expect } from '@playwright/test';

test.describe('golden path', () => {
  test('dashboard boots and renders the persona on one line', async ({ page }) => {
    await page.goto('/');
    const name = page.getByRole('heading', { level: 1, name: 'Bilko Bibitkov' });
    await expect(name).toBeVisible();
    // One line: the H1 must not wrap into two visual rows.
    const box = await name.boundingBox();
    const lineHeight = await name.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize) * 1.5,
    );
    expect(box!.height).toBeLessThan(lineHeight);
  });
});
