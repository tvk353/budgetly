import { expect, test } from './helpers/auth-fixture';

test('adds a linked refund up to the expense remaining amount', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add refund' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add Refund' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Select expense/).selectOption('amazon-shoes');
  await expect(dialog.getByLabel(/Category/)).toBeDisabled();
  await dialog.getByRole('button', { name: /Refund Full Amount/ }).click();
  await dialog.getByRole('button', { name: /Save Refund/ }).click();

  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('article', {
      name: /Amazon\.in — Puma Running Shoes refund, Shopping, ₹2,049\.00/,
    }),
  ).toBeVisible();
  await expect(page.getByText('₹39,501.00')).toBeVisible();
});

test('adds an unlinked refund with a required category', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add refund' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add Refund' });
  await dialog.getByRole('button', { name: 'Unlinked Refund' }).click();
  await dialog.getByRole('textbox', { name: 'Amount' }).fill('100.25');
  await dialog.getByLabel(/Category/).selectOption('Groceries');
  await dialog.getByLabel(/Description/).fill('Unlinked return');
  await dialog.getByLabel(/Label/).selectOption('Amazon');
  await dialog.getByRole('button', { name: /Save Refund/ }).click();

  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: /Unlinked return, Groceries, ₹100\.25/ }),
  ).toBeVisible();
  await expect(page.getByText('₹41,449.75')).toBeVisible();
});
