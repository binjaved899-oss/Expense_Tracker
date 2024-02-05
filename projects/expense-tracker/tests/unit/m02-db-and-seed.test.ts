import { describe, expect, it } from 'vitest';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';

describe('M02: Relational Schema, ACID Transactions & 2024 Seed Engine', () => {
  it('initializes deterministic 2024 seed state with users, accounts, categories, budgets, and transactions', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    testDb.recomputeAllAccountBalances();
    const snap = testDb.getSnapshot();

    expect(snap.schemaVersion).toBe(1);
    expect(snap.users.length).toBe(3);
    expect(snap.accounts.length).toBe(4);
    expect(snap.categories.length).toBe(12);
    expect(snap.transactions.length).toBeGreaterThanOrEqual(20);
    expect(snap.budgets.length).toBe(7);
    expect(snap.recurringRules.length).toBe(5);
    expect(snap.receiptItems.length).toBe(4);
    expect(testDb.getSqlMigrationDdl()).toContain('CREATE TABLE IF NOT EXISTS transactions');
  });

  it('recomputes account balances deterministically from opening balances and 2024 ledger transactions', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    testDb.recomputeAllAccountBalances();
    const snap = testDb.getSnapshot();

    const checking = snap.accounts.find((a) => a.id === 'acc-checking-01');
    const savings = snap.accounts.find((a) => a.id === 'acc-savings-02');
    const credit = snap.accounts.find((a) => a.id === 'acc-credit-03');
    const cash = snap.accounts.find((a) => a.id === 'acc-cash-04');

    expect(checking?.currentBalanceCents).toBe(1908550);
    expect(savings?.currentBalanceCents).toBe(3291200);
    expect(credit?.currentBalanceCents).toBe(-148380);
    expect(cash?.currentBalanceCents).toBe(85600);
  });

  it('rolls back all state mutations if an error is thrown inside a transaction()', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    testDb.recomputeAllAccountBalances();
    const initialCount = testDb.getSnapshot().accounts.length;

    expect(() =>
      testDb.transaction((draft) => {
        draft.accounts.push({
          id: 'acc-temp-fail',
          userId: 'usr-owner-01',
          name: 'Broken Account',
          type: 'CHECKING',
          currency: 'USD',
          openingBalanceCents: 50000,
          currentBalanceCents: 50000,
          creditLimitCents: null,
          institution: 'Test Bank',
          accountNumberMasked: '0000',
          isArchived: false,
          lastReconciledAt: null,
          createdAt: '2024-02-10T10:00:00+05:00',
        });
        throw new Error('Simulated transaction failure');
      })
    ).toThrow('Simulated transaction failure');

    expect(testDb.getSnapshot().accounts.length).toBe(initialCount);
  });

  it('cascades deletion of associated receipt items when a transaction is deleted', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const beforeReceipts = testDb.getSnapshot().receiptItems.filter(
      (r) => r.transactionId === 'tx-2024-02-08'
    );
    expect(beforeReceipts.length).toBe(2);

    const removed = testDb.deleteTransactionCascade('tx-2024-02-08');
    expect(removed?.id).toBe('tx-2024-02-08');

    const afterReceipts = testDb.getSnapshot().receiptItems.filter(
      (r) => r.transactionId === 'tx-2024-02-08'
    );
    expect(afterReceipts.length).toBe(0);
  });
});
