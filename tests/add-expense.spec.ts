import { expect, test } from '@playwright/test';

test('adds an expense without a Paid by field', async ({ page }) => {
  await page.goto('/transactions');

  await page.getByRole('button', { name: 'Add transaction' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add Expense' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Paid by')).toHaveCount(0);

  await dialog.getByRole('textbox', { name: 'Amount' }).fill('125.50');
  await dialog.getByLabel(/Category/).selectOption('Groceries');
  await dialog.getByLabel('Description').fill('Playwright test expense');
  await dialog.getByRole('button', { name: /Save Expense/ }).click();

  await expect(
    page.getByRole('article', { name: /Playwright test expense, Groceries/ }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
