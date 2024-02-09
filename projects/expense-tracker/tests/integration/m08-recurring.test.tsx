import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import {
  RecurringService,
  toMonthlyEquivalentCents,
} from '../../src/server/services/recurring.service';
import { RecurringScreen } from '../../src/screens/RecurringScreen';

describe('M08: Recurring Bills, Occurrence Materializer & RecurringScreen', () => {
  it('computes normalized monthly recurring totals and projects calendar cells', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new RecurringService(testDb);
    const overview = service.getRecurringOverview('2024-02');

    expect(overview.rules.length).toBe(5);
    expect(overview.activeExpenseMonthlyEquivalentCents).toBe(227850);
    expect(overview.activeIncomeMonthlyEquivalentCents).toBe(680000);
    expect(toMonthlyEquivalentCents(12000, 'YEARLY')).toBe(1000);
  });

  it('materializes a due occurrence into the ledger and advances nextDueDate', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new RecurringService(testDb);

    const posted = service.postOccurrenceNow('rec-gym-05');
    expect(posted.transaction.amountCents).toBe(8500);
    expect(posted.updatedRule.lastPostedDate).toBe('2024-02-25');
    expect(posted.updatedRule.nextDueDate).toBe('2024-03-25');
  });

  it('renders RecurringScreen, switches to Calendar view, and posts an occurrence', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new RecurringService(testDb);
    const overview = service.getRecurringOverview('2024-02');
    const onPost = vi.fn();

    render(
      <RecurringScreen
        overview={overview}
        accounts={testDb.getSnapshot().accounts}
        categories={testDb.getSnapshot().categories}
        activeMonth="2024-02"
        onCreateRule={() => undefined}
        onPostOccurrenceNow={onPost}
      />
    );

    expect(screen.getAllByText('Oakridge Residential Mortgage').length).toBeGreaterThanOrEqual(1);
    const postButtons = screen.getAllByRole('button', { name: 'Post Now' });
    fireEvent.click(postButtons[0]);
    expect(onPost).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('tab', { name: /Monthly Cashflow Calendar/i }));
    expect(Boolean(screen.getByText(/Monday-through-Sunday/i))).toBe(true);
  });
});
