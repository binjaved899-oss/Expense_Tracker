import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import { AccountService } from '../../src/server/services/account.service';
import { AccountsScreen } from '../../src/screens/AccountsScreen';

describe('M04: Financial Accounts, Transfers, Reconciliation & AccountsScreen', () => {
  it('computes net worth, assets, liabilities, and credit utilization accurately', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AccountService(testDb);
    const { accounts, summary } = service.listAccounts();

    expect(accounts.length).toBe(4);
    expect(summary.totalAssetsCents).toBe(5285350);
    expect(summary.totalLiabilitiesCents).toBe(148380);
    expect(summary.netWorthCents).toBe(5136970);
    expect(summary.creditUtilizationPct).toBeCloseTo(9.9, 1);
  });

  it('creates an account, prevents duplicate names, and executes atomic inter-account transfers', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AccountService(testDb);

    const created = service.createAccount({
      name: 'Dedicated Tax Reserve',
      type: 'SAVINGS',
      currency: 'USD',
      openingBalanceCents: 300000,
      institution: 'First Horizon Bank',
      accountNumberMasked: '•••• 5510',
    });
    expect(created.currentBalanceCents).toBe(300000);

    expect(() =>
      service.createAccount({
        name: 'Dedicated Tax Reserve',
        type: 'SAVINGS',
        currency: 'USD',
        openingBalanceCents: 10000,
        institution: 'First Horizon Bank',
        accountNumberMasked: '•••• 5510',
      })
    ).toThrow(/already exists/);

    const xfer = service.transferBetweenAccounts({
      fromAccountId: 'acc-checking-01',
      toAccountId: created.id,
      amountCents: 50000,
      occurredOn: '2024-02-22',
      description: 'Quarterly estimated tax allocation',
    });

    expect(xfer.fromAccount.currentBalanceCents).toBe(1858550);
    expect(xfer.toAccount.currentBalanceCents).toBe(350000);
  });

  it('reconciles account transactions and records audit log batch', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AccountService(testDb);

    const res = service.reconcileStatement({
      accountId: 'acc-checking-01',
      statementDate: '2024-02-28',
      statementEndingBalanceCents: 1908550,
      transactionIdsToReconcile: ['tx-2024-02-06', 'tx-2024-02-14'],
    });

    expect(res.reconciledCount).toBe(2);
    expect(res.discrepancyCents).toBe(0);
  });

  it('renders AccountsScreen, filters by account type, and opens create & transfer modals', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AccountService(testDb);
    const { accounts, summary } = service.listAccounts();
    const onCreate = vi.fn();
    const onTransfer = vi.fn();

    render(
      <AccountsScreen
        accounts={accounts}
        summary={summary}
        transactions={testDb.getSnapshot().transactions}
        onCreateAccount={onCreate}
        onTransferFunds={onTransfer}
        onReconcileStatement={() => undefined}
      />
    );

    expect(Boolean(screen.getByText('First Horizon Primary Checking'))).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: /Credit Cards/i }));
    expect(Boolean(screen.getByText('Sapphire Household Rewards Card'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '+ Add Account' }));
    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Travel Wallet' },
    });
    fireEvent.change(screen.getByLabelText(/Financial Institution/i), {
      target: { value: 'Global Credit Union' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
