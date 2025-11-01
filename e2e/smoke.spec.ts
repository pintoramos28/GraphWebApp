import { test, expect } from '@playwright/test';

test.describe('App bootstrap', () => {
  test('home page has title text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /graph builder/i })).toBeVisible();
  });
});

