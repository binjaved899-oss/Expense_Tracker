import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import { AnalyticsService } from '../../src/server/services/analytics.service';
import { OverviewScreen } from '../../src/screens/OverviewScreen';
import { AnalyticsScreen } from '../../src/screens/AnalyticsScreen';

describe('M10: Executive Overview Dashboard, Financial Analytics & Offline SVG Charts', () => {
  it('computes 5-month cashflow series, category spend shares, and top merchants', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AnalyticsService(testDb);
    const report = service.getAnalyticsReport('2024-02', 5);

    expect(report.sixMonthSeries.length).toBe(5);
    expect(report.monthIncomeCents).toBe(886200);
    expect(report.monthExpenseCents).toBe(342230);
    expect(report.monthNetCents).toBe(543970);
    expect(report.monthSavingsRatePct).toBeCloseTo(61.4, 1);
    expect(report.categoryShares.length).toBeGreaterThanOrEqual(5);
    expect(report.topMerchants[0].merchant).toBe('Oakridge Residential Mortgage');
  });

  it('renders OverviewScreen with KPI cards, SVG charts, recent ledger, and upcoming bills', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AnalyticsService(testDb);
    const exec = service.getExecutiveSummary('2024-02');
    const onNav = vi.fn();

    render(
      <OverviewScreen
        netWorth={exec.netWorth}
        analytics={exec.analytics}
        budgetReport={exec.budgetReport}
        recentTransactions={exec.recentTransactions}
        upcomingBills={exec.upcomingBills}
        onNavigate={onNav}
        onOpenQuickAdd={() => undefined}
      />
    );

    expect(Boolean(screen.getByText(/Executive Financial Overview/i))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open Full Ledger' }));
    expect(onNav).toHaveBeenCalledWith('/transactions');
  });

  it('renders AnalyticsScreen with SVG bar chart and top merchants ranking table', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AnalyticsService(testDb);
    const report = service.getAnalyticsReport('2024-02', 5);

    render(<AnalyticsScreen report={report} />);
    expect(Boolean(screen.getByText(/Multi-Month Income vs. Expense Trajectory/i))).toBe(true);
    expect(Boolean(screen.getByText('Keystone Ergonomics Supply'))).toBe(true);
  });
});
