import { expect, test, type Page } from '@playwright/test';

async function signInAndChooseWorkspace(page: Page, workspace: 'Household' | 'Personal') {
  await page.goto('/');
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/verify\?/);
  await page.getByRole('button', { name: 'Verify email' }).click();

  await expect(page).toHaveURL(/\/workspaces$/);
  await page.getByRole('button', { name: `Choose ${workspace} workspace` }).click();
}

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

test('Household workspace selection opens the home dashboard', async ({ page }) => {
  await signInAndChooseWorkspace(page, 'Household');

  await expect(page).toHaveURL(/\/workspace\/household$/);
  await expect(page.getByRole('heading', { name: /good .*?, aarav/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /budget$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Transactions' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByText('Illustrative mock data')).toBeVisible();
});

test('Transactions screen renders and filters the mock ledger', async ({ page }) => {
  await signInAndChooseWorkspace(page, 'Household');
  await expect(page).toHaveURL(/\/workspace\/household$/);
  await page.getByRole('link', { name: 'Transactions' }).click();

  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
  await expect(page.getByText('ILLUSTRATIVE MOCK LEDGER')).toBeVisible();

  await page.getByRole('button', { name: /Refunds/ }).click();
  await expect(page.getByText('Amazon Return — Shoes')).toBeVisible();
  await expect(page.getByText('HP Petrol Pump')).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Search transactions' }).fill('Amazon');
  await expect(page.getByText('Amazon Return — Shoes')).toBeVisible();
  await expect(page.getByText('Swiggy Food Delivery')).toHaveCount(0);
});

test('Personal workspace selection opens the Personal placeholder', async ({ page }) => {
  await signInAndChooseWorkspace(page, 'Personal');

  await expect(page).toHaveURL(/\/workspace\/personal$/);
  await expect(page.getByRole('heading', { name: 'Personal' })).toBeVisible();
});
