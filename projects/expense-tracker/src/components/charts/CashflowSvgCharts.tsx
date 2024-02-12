import React from 'react';
import {
  CategorySpendShare,
  MonthlyCashflowPoint,
} from '../../server/services/analytics.service';
import { formatCents } from '../../utils/currency';

export const SixMonthCashflowBarChart: React.FC<{
  series: MonthlyCashflowPoint[];
}> = ({ series }) => {
  const maxVal = Math.max(
    100000,
    ...series.flatMap((s) => [s.incomeCents, s.expenseCents])
  );

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 560 220"
        role="img"
        aria-label="Six month income versus expense bar chart"
        className="w-full h-auto overflow-visible"
      >
        <line
          x1="40"
          y1="180"
          x2="540"
          y2="180"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />
        {series.map((point, idx) => {
          const groupX = 62 + idx * 92;
          const incHeight = Math.max(4, Math.round((point.incomeCents / maxVal) * 140));
          const expHeight = Math.max(4, Math.round((point.expenseCents / maxVal) * 140));
          const incY = 180 - incHeight;
          const expY = 180 - expHeight;

          return (
            <g key={point.month}>
              <rect
                x={groupX}
                y={incY}
                width="24"
                height={incHeight}
                rx="3"
                fill="var(--success)"
              >
                <title>{`${point.month} Income: ${formatCents(point.incomeCents)}`}</title>
              </rect>
              <rect
                x={groupX + 28}
                y={expY}
                width="24"
                height={expHeight}
                rx="3"
                fill="var(--danger)"
              >
                <title>{`${point.month} Expense: ${formatCents(point.expenseCents)}`}</title>
              </rect>
              <text
                x={groupX + 26}
                y="202"
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="11"
                fontFamily="JetBrainsMonoLocal, monospace"
              >
                {point.month}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-6 text-xs text-[var(--text-secondary)] mt-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--success)] inline-block" />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--danger)] inline-block" />
          Expense
        </span>
      </div>
    </div>
  );
};

export const CategoryShareHorizontalChart: React.FC<{
  shares: CategorySpendShare[];
}> = ({ shares }) => {
  if (shares.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No category spend recorded for this month.</p>;
  }
  return (
    <div className="space-y-3">
      {shares.map((item) => (
        <div key={item.categoryId} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-primary)]">
              {item.categoryName} ({item.transactionCount})
            </span>
            <span className="font-mono font-semibold text-[var(--text-secondary)]">
              {formatCents(item.spentCents)} ({item.sharePct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)]"
              style={{ width: `${Math.min(100, Math.max(3, item.sharePct))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
