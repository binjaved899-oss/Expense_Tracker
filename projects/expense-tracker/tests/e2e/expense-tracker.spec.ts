import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '.forgemind/screenshots');

async function navigateViaSidebar(page: Page, sectionLabel: string): Promise<void> {
  const mobileMenuBtn = page.getByRole('button', { name: 'Open navigation menu' });
  if (await mobileMenuBtn.isVisible()) {
    await mobileMenuBtn.click();
  }
  const navSidebar = page.getByRole('navigation', { name: 'Workspace Sections' });
  await navSidebar.getByRole('button', { name: new RegExp(sectionLabel, 'i') }).click();
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('Expense Tracker E2E & 3-Breakpoint Visual Verification', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('renders all 8 workspace screens with zero horizontal overflow, zero console errors, and captures visual proof', async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Executive Financial Overview/i })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `01-overview-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Transactions');
    await expect(
      page.getByRole('heading', { level: 1, name: /Transactions Ledger & Split Engine/i })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `02-transactions-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Accounts');
    await expect(
      page.getByRole('heading', { level: 1, name: /Accounts, Wallets & Transfers/i })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `03-accounts-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Budgets');
    await expect(
      page.getByRole('heading', { level: 1, name: /Monthly Budgets & Rollover Envelopes/i })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `04-budgets-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Recurring Bills');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Recurring Bills, Subscriptions & Cashflow Calendar/i,
      })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `05-recurring-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Receipts & Claims');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Itemized Receipts, Reimbursements & Shared Splits/i,
      })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `06-receipts-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Analytics');
    await expect(
      page.getByRole('heading', { level: 1, name: /Financial Analytics & Cashflow Reports/i })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `07-analytics-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await navigateViaSidebar(page, 'Settings & Rules');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Workspace Administration, Categories & Data Portability/i,
      })
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `08-settings-${testInfo.project.name}.png`),
      fullPage: true,
    });

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('executes interactive workflows: theme toggle, command palette search, and recording a transaction', async ({
    page,
  }, testInfo) => {
    await page.goto('/');

    const themeBtn = page.getByRole('button', { name: /Switch to dark theme/i });
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `09-dark-mode-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByRole('button', { name: /Open command search/i }).click();
    const searchInput = page.getByTestId('command-palette-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Green Valley');
    await expect(page.getByRole('dialog')).toContainText('Green Valley Market');
    await page.getByRole('button', { name: /Close \(Esc\)/i }).click();

    await navigateViaSidebar(page, 'Transactions');
    await page.getByRole('button', { name: '+ Record Transaction' }).click();
    await page.getByLabel(/Payee \/ Merchant Name/i).fill('Artisan Bakery & Roasters');
    await page.getByLabel(/Amount \(USD\)/i).fill('24.75');
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    await expect(page.getByText('Artisan Bakery & Roasters', { exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
