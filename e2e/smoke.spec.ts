import { test, expect } from '@playwright/test';

test.describe('smoke guard rails', () => {
  test('renders app shell without runtime violations', async ({ page }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    const unhandledRejections: string[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.exposeFunction('reportUnhandledRejection', (message: string) => {
      unhandledRejections.push(message);
    });

    await page.addInitScript(() => {
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const normalized =
          reason instanceof Error
            ? `${reason.name}: ${reason.message}`
            : typeof reason === 'object'
              ? JSON.stringify(reason)
              : String(reason);
        // @ts-expect-error this function is injected by Playwright
        window.reportUnhandledRejection?.(normalized);
      });
    });

    await page.goto('/');

    const shell = page.getByTestId('app-shell');
    await expect(shell).toBeVisible();

    const chart = page
      .getByTestId('sample-scatter')
      .locator('canvas, svg')
      .first();
    await expect(chart).toBeVisible();

    const fileInput = page.locator('[data-testid="dataset-file-input"]');
    await fileInput.setInputFiles('tests/fixtures/sample.csv');

    const successAlert = page
      .getByRole('alert')
      .filter({ hasText: 'Imported sample.csv' });
    await expect(successAlert).toBeVisible({ timeout: 20000 });

    const previewTable = page.getByTestId('data-preview-table');
    await expect(previewTable).toBeVisible();
    await expect(previewTable).toContainText('Aurora');

    const typeSelector = page.getByLabel('Column type for Hours');
    await typeSelector.click();
    await page.getByRole('option', { name: 'String' }).click();
    await expect(typeSelector).toContainText('String');

    await page.route('**/sample-url.csv', async (route) => {
      const csv = 'team,hours\nOrion,20\nHelios,18';
      await route.fulfill({
        status: 200,
        body: csv,
        headers: {
          'Content-Type': 'text/csv'
        }
      });
    });

    await page.getByLabel('Import from URL').fill('https://example.com/sample-url.csv');
    await page.getByTestId('dataset-url-import').click();

    await expect(page.getByTestId('data-preview-table')).toContainText('Orion');

    expect(pageErrors, 'pageerror events should fail the smoke test').toHaveLength(0);
    expect(consoleErrors, 'console.error calls should fail the smoke test').toHaveLength(0);
    expect(unhandledRejections, 'unhandled rejections should fail the smoke test').toHaveLength(0);
  });
});
