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

    expect(pageErrors, 'pageerror events should fail the smoke test').toHaveLength(0);
    expect(consoleErrors, 'console.error calls should fail the smoke test').toHaveLength(0);
    expect(unhandledRejections, 'unhandled rejections should fail the smoke test').toHaveLength(0);
  });
});
