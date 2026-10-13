import { expect, test } from '@playwright/test';

test('login and verification render without hydration errors', async ({ page }) => {
  const renderErrors: string[] = [];

  page.on('console', (message) => {
    if (
      /hydration|server-rendered html|server rendered html|searchParams.*promise/i.test(
        message.text(),
      )
    ) {
      renderErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (
      /hydration|server-rendered html|server rendered html|searchParams.*promise/i.test(
        error.message,
      )
    ) {
      renderErrors.push(error.message);
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /log in to your workspace/i })).toBeVisible();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/verify\?/);
  await expect(page.getByRole('heading', { name: /enter the code we sent/i })).toBeVisible();
  expect(renderErrors).toEqual([]);
});
