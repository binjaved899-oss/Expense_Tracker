import React from 'react';
import { AnalyticsDashboardReport } from '../server/services/analytics.service';
import { Badge, Card, Table } from '../components/primitives/ui-primitives';
import {
  CategoryShareHorizontalChart,
  SixMonthCashflowBarChart,
} from '../components/charts/CashflowSvgCharts';
import { formatCents } from '../utils/currency';
import { formatHumanDate } from '../utils/date';

export interface AnalyticsScreenProps {
  report: AnalyticsDashboardReport;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ report }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
          Financial Analytics &amp; Cashflow Reports ({report.activeMonth})
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Offline SVG visualizations of multi-month cashflow, category concentration, savings velocity, and top merchants.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Multi-Month Income vs. Expense Trajectory"
          subtitle="5-month historical cashflow bar chart"
        >
          <SixMonthCashflowBarChart series={report.sixMonthSeries} />
        </Card>

        <Card
          title={`Category Spend Share (${report.activeMonth})`}
          subtitle="Percentage of monthly household outflows"
        >
          <CategoryShareHorizontalChart shares={report.categoryShares} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Monthly Cashflow & Savings Rate Ledger"
          subtitle="Historical monthly performance table"
        >
          <Table
            columns={[
              {
                key: 'month',
                header: 'Month',
                render: (row) => <span className="font-mono font-semibold">{row.month}</span>,
              },
              {
                key: 'income',
                header: 'Income',
                align: 'right',
                render: (row) => (
                  <span className="font-mono text-[var(--success)]">
                    {formatCents(row.incomeCents)}
                  </span>
                ),
              },
              {
                key: 'expense',
                header: 'Expense',
                align: 'right',
                render: (row) => (
                  <span className="font-mono text-[var(--danger)]">
                    {formatCents(row.expenseCents)}
                  </span>
                ),
              },
              {
                key: 'savingsRate',
                header: 'Savings Rate',
                align: 'right',
                render: (row) => (
                  <Badge
                    label={`${row.savingsRatePct}%`}
                    tone={row.savingsRatePct >= 20 ? 'success' : 'warning'}
                  />
                ),
              },
            ]}
            rows={report.sixMonthSeries}
            rowKey={(r) => r.month}
          />
        </Card>

        <Card
          title={`Top Merchants by Spend (${report.activeMonth})`}
          subtitle="Ranked by total cleared expense volume"
        >
          <Table
            columns={[
              {
                key: 'merchant',
                header: 'Merchant',
                render: (row) => (
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{row.merchant}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Last activity: {formatHumanDate(row.lastOccurredOn)}
                    </p>
                  </div>
                ),
              },
              {
                key: 'count',
                header: 'Entries',
                align: 'center',
                render: (row) => <Badge label={`${row.transactionCount}x`} tone="neutral" />,
              },
              {
                key: 'total',
                header: 'Total Spend',
                align: 'right',
                render: (row) => (
                  <span className="font-mono font-semibold text-[var(--danger)]">
                    {formatCents(row.totalSpentCents)}
                  </span>
                ),
              },
            ]}
            rows={report.topMerchants}
            rowKey={(r) => r.merchant}
          />
        </Card>
      </div>
    </div>
  );
};
