import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import { BudgetService } from '../../src/server/services/budget.service';
import { BudgetsScreen } from '../../src/screens/BudgetsScreen';

describe('M07: Monthly Budgets, Rollover Envelopes, Alert Engine & BudgetsScreen', () => {
  it('computes monthly envelope spend including split allocations and flags 80%/100% alerts', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new BudgetService(testDb);
    const report = service.getMonthlyBudgetReport('2024-02');

    expect(report.envelopes.length).toBe(7);
    expect(report.exceededCount).toBeGreaterThanOrEqual(1);
    expect(report.warningCount).toBeGreaterThanOrEqual(1);

    const groceries = report.envelopes.find((e) => e.categoryId === 'cat-exp-groceries');
    expect(groceries?.spentCents).toBe(47880);
    expect(groceries?.effectiveLimitCents).toBe(76500);
  });

  it('upserts budget envelopes and copies envelopes to a new month with rollover calculation', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new BudgetService(testDb);

    const updated = service.upsertBudgetEnvelope({
      categoryId: 'cat-exp-dining',
      month: '2024-02',
      limitCents: 30000,
      rolloverEnabled: true,
      carriedOverCents: 2500,
      alertThresholdPct: 85,
      notes: 'Updated dining target',
    });
    expect(updated.limitCents).toBe(30000);

    const copied = service.copyFromPreviousMonthWithRollover('2024-03');
    expect(copied.copiedCount).toBe(7);

    const marchReport = service.getMonthlyBudgetReport('2024-03');
    const marchGroceries = marchReport.envelopes.find((e) => e.categoryId === 'cat-exp-groceries');
    expect(marchGroceries?.carriedOverCents).toBe(28620);
  });

  it('renders BudgetsScreen, filters exceeded envelopes, and submits envelope configuration', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new BudgetService(testDb);
    const report = service.getMonthlyBudgetReport('2024-02');
    const onUpsert = vi.fn();

    render(
      <BudgetsScreen
        report={report}
        categories={testDb.getSnapshot().categories}
        onUpsertEnvelope={onUpsert}
        onCopyPreviousMonth={() => ({ copiedCount: 7 })}
      />
    );

    expect(Boolean(screen.getByText('Work Office & Equipment'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '+ Configure Envelope' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Envelope' }));
    expect(onUpsert).toHaveBeenCalledTimes(1);
  });
});
