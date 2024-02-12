import React from 'react';
import {
  RecurringRuleRecord,
  TransactionRecord,
} from '../server/db/schema';
import { NetWorthSummary } from '../server/services/account.service';
import { AnalyticsDashboardReport } from '../server/services/analytics.service';
import { MonthlyBudgetReport } from '../server/services/budget.service';
import {
  Badge,
  Button,
  Card,
  Table,
} from '../components/primitives/ui-primitives';
import {
  CategoryShareHorizontalChart,
  SixMonthCashflowBarChart,
} from '../components/charts/CashflowSvgCharts';
import { formatCents } from '../utils/currency';
import { formatHumanDate } from '../utils/date';

export interface OverviewScreenProps {
  netWorth: NetWorthSummary;
  analytics: AnalyticsDashboardReport;
  budgetReport: MonthlyBudgetReport;
  recentTransactions: TransactionRecord[];
  upcomingBills: RecurringRuleRecord[];
  onNavigate: (href: string) => void;
  onOpenQuickAdd: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  netWorth,
  analytics,
  budgetReport,
  recentTransactions,
  upcomingBills,
  onNavigate,
  onOpenQuickAdd,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Executive Financial Overview ({analytics.activeMonth})
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Real-time household net worth, monthly cashflow velocity, envelope burn rate, and upcoming obligations.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => onNavigate('/transactions')}>
            Open Full Ledger
          </Button>
          <Button variant="primary" onClick={onOpenQuickAdd}>
            + Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Household Net Worth" subtitle="All accounts reconciled">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
            {formatCents(netWorth.netWorthCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Liquid cash: {formatCents(netWorth.liquidCashCents)}
          </p>
        </Card>

        <Card title={`Monthly Income (${analytics.activeMonth})`} subtitle="Cleared & reconciled inflows">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--success)]">
            {formatCents(analytics.monthIncomeCents, 'USD', { showPlusSign: true })}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Payroll, advisory & treasury yield</p>
        </Card>

        <Card title={`Monthly Spend (${analytics.activeMonth})`} subtitle="All household categories">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--danger)]">
            {formatCents(analytics.monthExpenseCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Budget utilization: {budgetReport.overallUtilizationPct}%
          </p>
        </Card>

        <Card title="Monthly Savings Rate" subtitle="Net cashflow retained">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent-primary)]">
            {analytics.monthSavingsRatePct}%
          </p>
          <div className="mt-1.5">
            <Badge
              label={`Net ${formatCents(analytics.monthNetCents, 'USD', { showPlusSign: true })}`}
              tone={analytics.monthNetCents >= 0 ? 'success' : 'danger'}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Multi-Month Cashflow Trend (Income vs. Expense)"
          subtitle="5-month historical comparison"
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/analytics')}>
              Full Analytics
            </Button>
          }
        >
          <SixMonthCashflowBarChart series={analytics.sixMonthSeries} />
        </Card>

        <Card
          title={`Category Spend Distribution (${analytics.activeMonth})`}
          subtitle={`${budgetReport.warningCount} warning • ${budgetReport.exceededCount} exceeded envelopes`}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/budgets')}>
              Manage Budgets
            </Button>
          }
        >
          <CategoryShareHorizontalChart shares={analytics.categoryShares} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Recent Ledger Activity"
            subtitle="Latest verified transactions across accounts"
            actions={
              <Button variant="secondary" size="sm" onClick={() => onNavigate('/transactions')}>
                View All
              </Button>
            }
          >
            <Table
              columns={[
                {
                  key: 'merchant',
                  header: 'Merchant',
                  render: (row) => (
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{row.merchant}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatHumanDate(row.occurredOn)}</p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <Badge
                      label={row.status}
                      tone={row.status === 'RECONCILED' ? 'success' : 'accent'}
                    />
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (row) => (
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        row.type === 'INCOME'
                          ? 'text-[var(--success)]'
                          : row.type === 'EXPENSE'
                          ? 'text-[var(--danger)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {row.type === 'INCOME' ? '+' : row.type === 'EXPENSE' ? '-' : ''}
                      {formatCents(row.amountCents)}
                    </span>
                  ),
                },
              ]}
              rows={recentTransactions}
              rowKey={(r) => r.id}
            />
          </Card>
        </div>

        <Card
          title="Upcoming Recurring Obligations"
          subtitle="Scheduled bills & subscriptions"
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/recurring')}>
              Calendar
            </Button>
          }
        >
          <div className="space-y-3">
            {upcomingBills.map((bill) => (
              <div
                key={bill.id}
                className="p-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {bill.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Due {formatHumanDate(bill.nextDueDate)}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-[var(--danger)]">
                  {formatCents(bill.amountCents)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
