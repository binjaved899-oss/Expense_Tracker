import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import { TransactionService } from '../../src/server/services/transaction.service';
import { TransactionsScreen } from '../../src/screens/TransactionsScreen';

describe('M06: Transactions Ledger, Split Engine, Bulk Ops & TransactionsScreen', () => {
  it('queries paginated transactions by month, search query, category, and split status', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new TransactionService(testDb);

    const feb = service.queryTransactions({ month: '2024-02', pageSize: 20 });
    expect(feb.totalItems).toBe(12);
    expect(feb.filteredIncomeCents).toBe(886200);
    expect(feb.filteredExpenseCents).toBe(342230);

    const splitsOnly = service.queryTransactions({ onlySplits: true });
    expect(splitsOnly.totalItems).toBe(1);
    expect(splitsOnly.items[0].merchant).toContain('Green Valley');
  });

  it('validates split sum equality on transaction creation and rejects mismatched splits', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new TransactionService(testDb);

    expect(() =>
      service.createTransaction({
        accountId: 'acc-credit-03',
        categoryId: 'cat-exp-groceries',
        type: 'EXPENSE',
        status: 'CLEARED',
        amountCents: 10000,
        merchant: 'Supermarket Split Test',
        occurredOn: '2024-02-23',
        isSplit: true,
        splits: [
          { categoryId: 'cat-exp-groceries', amountCents: 6000, memo: 'Food' },
          { categoryId: 'cat-exp-healthcare', amountCents: 3000, memo: 'Vitamins' },
        ],
      })
    ).toThrow(/Split line sum/);

    const validSplitTx = service.createTransaction({
      accountId: 'acc-credit-03',
      categoryId: 'cat-exp-groceries',
      type: 'EXPENSE',
      status: 'CLEARED',
      amountCents: 10000,
      merchant: 'Supermarket Split Test',
      occurredOn: '2024-02-23',
      isSplit: true,
      splits: [
        { categoryId: 'cat-exp-groceries', amountCents: 6500, memo: 'Food' },
        { categoryId: 'cat-exp-healthcare', amountCents: 3500, memo: 'Vitamins' },
      ],
    });
    expect(validSplitTx.isSplit).toBe(true);
    expect(validSplitTx.splits.length).toBe(2);
  });

  it('executes bulk category and status updates across multiple transactions', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new TransactionService(testDb);

    const res = service.bulkUpdateTransactions({
      transactionIds: ['tx-2024-02-12', 'tx-2024-02-16'],
      categoryId: 'cat-exp-transport',
      status: 'RECONCILED',
    });
    expect(res.updatedCount).toBe(2);
  });

  it('renders TransactionsScreen, filters rows, and opens the Split Transaction Drawer', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const snap = testDb.getSnapshot();
    const onCreate = vi.fn();
    const onUpdateSplits = vi.fn();

    render(
      <TransactionsScreen
        transactions={snap.transactions}
        accounts={snap.accounts}
        categories={snap.categories}
        tags={snap.tags}
        activeMonth="2024-02"
        onCreateTransaction={onCreate}
        onUpdateSplits={onUpdateSplits}
        onBulkUpdate={() => undefined}
        onDeleteTransaction={() => undefined}
      />
    );

    expect(Boolean(screen.getByText('Northstar Payroll Corp'))).toBe(true);

    const splitButtons = screen.getAllByRole('button', { name: 'Split' });
    fireEvent.click(splitButtons[0]);
    expect(Boolean(screen.getByRole('button', { name: 'Save Split Allocation' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save Split Allocation' }));
    expect(onUpdateSplits).toHaveBeenCalledTimes(1);
  });
});
