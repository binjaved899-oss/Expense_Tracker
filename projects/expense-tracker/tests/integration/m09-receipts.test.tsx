import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import { ReceiptService } from '../../src/server/services/receipt.service';
import { ReceiptsScreen } from '../../src/screens/ReceiptsScreen';

describe('M09: Receipt Line-Item Breakdown, Reimbursements & ReceiptsScreen', () => {
  it('computes itemized receipt totals, open claim balances, and shared split shares', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new ReceiptService(testDb);
    const summary = service.getReceiptsSummary('ALL');

    expect(summary.items.length).toBe(4);
    expect(summary.totalItemizedCents).toBe(59480);
    expect(summary.pendingReimbursementCents).toBe(12120);
    expect(summary.submittedReimbursementCents).toBe(22680);
    expect(summary.reimbursedTotalCents).toBe(6200);
    expect(summary.sharedSplitTotalCents).toBe(9240);
  });

  it('adds a taxed receipt line item and transitions reimbursement status to REIMBURSED', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new ReceiptService(testDb);

    const added = service.addReceiptLineItem({
      transactionId: 'tx-2024-02-08',
      itemName: 'Ergonomic Wrist Rest',
      quantity: 2,
      unitPriceCents: 2500,
      taxCents: 400,
      categoryId: 'cat-exp-equipment',
      reimbursementStatus: 'PENDING',
    });

    expect(added.totalCents).toBe(5400);
    expect(added.reimbursementClaimCode).toContain('CLM-2024');

    const settled = service.updateReimbursementStatus(added.id, 'REIMBURSED');
    expect(settled.reimbursementStatus).toBe('REIMBURSED');
  });

  it('renders ReceiptsScreen, settles an open claim, and opens the Line-Item Drawer', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new ReceiptService(testDb);
    const summary = service.getReceiptsSummary('ALL');
    const onSettle = vi.fn();

    render(
      <ReceiptsScreen
        summary={summary}
        transactions={testDb.getSnapshot().transactions}
        categories={testDb.getSnapshot().categories}
        onAddReceiptItem={() => undefined}
        onUpdateReimbursementStatus={onSettle}
      />
    );

    expect(Boolean(screen.getByText('Thunderbolt 4 Dual-4K Workstation Dock'))).toBe(true);
    const settleBtns = screen.getAllByRole('button', { name: 'Mark Reimbursed' });
    fireEvent.click(settleBtns[0]);
    expect(onSettle).toHaveBeenCalledTimes(1);
  });
});
