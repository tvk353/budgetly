import { expect, test } from './helpers/auth-fixture';

test('adds an expense from the Home dashboard', async ({ page }) => {
  await page.goto('/workspaces');
  await page.getByRole('button', { name: 'Choose Household workspace' }).click();
  await expect(page).toHaveURL(/\/workspace\/household$/);

  await page.getByRole('button', { name: 'Add expense' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Expense' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Paid by')).toHaveCount(0);

  await dialog.getByRole('textbox', { name: 'Amount' }).fill('125.50');
  await dialog.getByLabel(/Category/).selectOption('Groceries');
  await dialog.getByLabel(/Label/).selectOption('Amazon');
  await dialog.getByLabel('Description').fill('Home Playwright expense');
  await dialog.getByRole('button', { name: /Save Expense/ }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Home Playwright expense')).toBeVisible();
});
