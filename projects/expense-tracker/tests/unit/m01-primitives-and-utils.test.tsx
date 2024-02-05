import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { colors, spacing, typography, radii } from '../../src/styles/tokens';
import { ThemeProvider, useTheme } from '../../src/components/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Drawer,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Radio,
  Select,
  SkeletonLoader,
  Table,
  Tabs,
  Textarea,
  Toast,
} from '../../src/components/primitives/ui-primitives';
import { AppShell } from '../../src/components/layout/AppShell';
import { LocalSvgIcon } from '../../src/components/icons/CategoryIcons';
import {
  allocateCentsProportionally,
  centsToDollars,
  computeSavingsRatePct,
  computeUtilizationPct,
  dollarsToCents,
  evaluateBudgetAlertState,
  formatCents,
  splitCentsEvenly,
  verifySplitSumMatchesTotal,
} from '../../src/utils/currency';
import {
  advanceDueDate,
  buildMonthlyCalendarGrid,
  formatHumanDate,
  getMonthBoundaries,
  getPreviousYearMonth,
  getTrailingYearMonths,
  isValidIsoDate,
} from '../../src/utils/date';
import { redactSensitiveFields, StructuredLogger } from '../../src/utils/logger';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  toErrorEnvelope,
  UnauthorizedError,
  ValidationError,
} from '../../src/utils/errors';

describe('M01: Design Tokens & Theme Engine', () => {
  it('exposes complete light and dark palettes and spacing scales', () => {
    expect(colors.light.bgPrimary).toBeDefined();
    expect(colors.dark.bgPrimary).toBeDefined();
    expect(spacing[4]).toBe('16px');
    expect(typography.fontFamily.sans).toContain('InterLocal');
    expect(radii.md).toBe('8px');
  });

  it('toggles theme mode via ThemeProvider', () => {
    const Consumer: React.FC = () => {
      const { theme, toggleTheme } = useTheme();
      return (
        <button type="button" onClick={toggleTheme}>
          Theme: {theme}
        </button>
      );
    };

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    const btn = screen.getByRole('button', { name: /Theme:/i });
    const initialText = btn.textContent;
    fireEvent.click(btn);
    expect(btn.textContent).not.toBe(initialText);
  });
});

describe('M01: Currency & Integer-Cent Arithmetic Utilities', () => {
  it('converts between dollars and integer cents deterministically', () => {
    expect(dollarsToCents('124.55')).toBe(12455);
    expect(dollarsToCents('$1,450.00')).toBe(145000);
    expect(centsToDollars(12455)).toBe(124.55);
    expect(() => dollarsToCents('abc')).toThrow(RangeError);
  });

  it('formats cents with currency symbol, commas, and compact notation', () => {
    expect(formatCents(245890, 'USD')).toBe('$2,458.90');
    expect(formatCents(-4500, 'USD')).toBe('-$45.00');
    expect(formatCents(12500, 'USD', { showPlusSign: true })).toBe('+$125.00');
    expect(formatCents(350000, 'USD', { compact: true })).toBe('$3.5k');
  });

  it('allocates and splits cents without penny rounding drift', () => {
    const parts = splitCentsEvenly(10000, 3);
    expect(parts).toEqual([3334, 3333, 3333]);
    expect(verifySplitSumMatchesTotal(10000, parts).valid).toBe(true);

    const weighted = allocateCentsProportionally(1000, [50, 30, 20]);
    expect(weighted).toEqual([500, 300, 200]);
  });

  it('evaluates budget utilization and alert thresholds accurately', () => {
    expect(computeUtilizationPct(8200, 10000)).toBe(82);
    expect(evaluateBudgetAlertState(5000, 10000)).toBe('OK');
    expect(evaluateBudgetAlertState(8200, 10000)).toBe('WARNING_80');
    expect(evaluateBudgetAlertState(10500, 10000)).toBe('EXCEEDED_100');
    expect(computeSavingsRatePct(500000, 350000)).toBe(30);
  });
});

describe('M01: Date & Billing Schedule Utilities', () => {
  it('validates ISO dates and computes 2024 leap-year month boundaries', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2024-02-30')).toBe(false);
    expect(getMonthBoundaries('2024-02')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      daysInMonth: 29,
    });
    expect(getPreviousYearMonth('2024-01')).toBe('2023-12');
    expect(getTrailingYearMonths('2024-04', 3)).toEqual(['2024-02', '2024-03', '2024-04']);
  });

  it('advances recurring due dates across weekly, monthly, and yearly cycles', () => {
    expect(advanceDueDate('2024-02-05', 'WEEKLY')).toBe('2024-02-12');
    expect(advanceDueDate('2024-01-31', 'MONTHLY', 31)).toBe('2024-02-29');
    expect(advanceDueDate('2024-02-15', 'YEARLY')).toBe('2025-02-15');
    expect(formatHumanDate('2024-02-05')).toBe('Feb 05, 2024');
  });

  it('generates a complete 7-column monthly calendar grid', () => {
    const grid = buildMonthlyCalendarGrid('2024-02');
    expect(grid.length % 7).toBe(0);
    expect(grid.filter((c) => c.inCurrentMonth).length).toBe(29);
  });
});

describe('M01: Structured Logger & Unified Error Envelope', () => {
  it('redacts sensitive fields in structured log entries', () => {
    const logger = new StructuredLogger('auth-test');
    const entry = logger.info('Login attempt', {
      email: 'amina@example.com',
      password: 'plain-secret-password',
      nested: { csrfToken: 'tok-123' },
    });
    expect(entry.context?.email).toBe('amina@example.com');
    expect(entry.context?.password).toBe('[REDACTED]');
    expect((entry.context?.nested as Record<string, unknown>).csrfToken).toBe('[REDACTED]');
    expect(redactSensitiveFields(['ok'])).toEqual(['ok']);
  });

  it('maps domain and validation errors into HTTP status codes and envelopes', () => {
    const vErr = toErrorEnvelope(new ValidationError('Invalid amount'), 'req-1');
    expect(vErr.statusCode).toBe(400);
    expect(vErr.body.code).toBe('VALIDATION_ERROR');

    expect(toErrorEnvelope(new NotFoundError('Account', 'acc-1')).statusCode).toBe(404);
    expect(toErrorEnvelope(new ConflictError('Duplicate')).statusCode).toBe(409);
    expect(toErrorEnvelope(new UnauthorizedError()).statusCode).toBe(401);
    expect(toErrorEnvelope(new ForbiddenError()).statusCode).toBe(403);
  });
});

describe('M01: 18 Shared UI Component Primitives & AppShell', () => {
  it('renders form primitives with explicit labels and error messages', () => {
    const onChange = vi.fn();
    render(
      <div>
        <Input id="tx-merchant" label="Merchant Name" required error="Merchant is required" onChange={onChange} />
        <Select
          id="tx-type"
          label="Transaction Type"
          options={[
            { value: 'EXPENSE', label: 'Expense' },
            { value: 'INCOME', label: 'Income' },
          ]}
        />
        <Textarea id="tx-notes" label="Notes" helperText="Optional memo" />
        <Checkbox id="tx-cleared" label="Cleared Transaction" description="Settled by bank" />
        <Radio id="tx-mode" label="Standard Split" />
      </div>
    );

    expect(screen.getByLabelText(/Merchant Name/i).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Merchant is required');
    expect(Boolean(screen.getByLabelText(/Transaction Type/i))).toBe(true);
    expect(Boolean(screen.getByLabelText(/Cleared Transaction/i))).toBe(true);
  });

  it('renders interactive Table, Tabs, Pagination, Badge, Avatar, Toast, Modal, Drawer, and EmptyState', () => {
    const onTab = vi.fn();
    const onPage = vi.fn();
    render(
      <div>
        <Button variant="primary" size="sm">
          Quick Action
        </Button>
        <Card title="Recent Ledger" subtitle="February 2024">
          <Tabs
            tabs={[
              { id: 'all', label: 'All', count: 2 },
              { id: 'flagged', label: 'Flagged', count: 0 },
            ]}
            activeTab="all"
            onChange={onTab}
          />
          <Table
            columns={[
              { key: 'merchant', header: 'Merchant', render: (r) => r.merchant },
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => r.amount },
            ]}
            rows={[{ id: '1', merchant: 'Green Valley Grocers', amount: '$84.50' }]}
            rowKey={(r) => r.id}
          />
          <Pagination page={1} totalPages={3} totalItems={25} onPageChange={onPage} />
        </Card>
        <Badge label="Within Budget" tone="success" />
        <Avatar name="Amina Tariq" roleLabel="OWNER" />
        <Toast message="Transaction saved" tone="success" />
        <SkeletonLoader rows={2} />
        <EmptyState title="No Splits" description="Add a split row to itemize." />
        <Modal isOpen={true} title="Confirm Delete" onClose={() => undefined}>
          <p>Delete this transaction?</p>
        </Modal>
        <Drawer isOpen={true} title="Split Breakdown" onClose={() => undefined}>
          <p>Drawer Body</p>
        </Drawer>
        <Breadcrumb items={[{ label: 'Home', onClick: () => undefined }, { label: 'Ledger' }]} />
        <LocalSvgIcon name="wallet" title="Wallet Icon" />
      </div>
    );

    expect(Boolean(screen.getByText('Green Valley Grocers'))).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: /Flagged/i }));
    expect(onTab).toHaveBeenCalledWith('flagged');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPage).toHaveBeenCalledWith(2);
    expect(Boolean(screen.getByRole('dialog', { name: 'Confirm Delete' }))).toBe(true);
  });

  it('renders AppShell with navigation items and period selector', () => {
    const onNav = vi.fn();
    render(
      <ThemeProvider>
        <AppShell
          appName="Expense Tracker"
          navItems={[
            { id: 'overview', label: 'Overview', href: '/', group: 'Overview' },
            { id: 'transactions', label: 'Transactions', href: '/transactions', group: 'Ledger', badgeCount: 18 },
          ]}
          activePath="/"
          activeMonth="2024-02"
          onMonthChange={() => undefined}
          onNavigate={onNav}
          onOpenCommandSearch={() => undefined}
          onOpenQuickAdd={() => undefined}
          netWorthSummary={{ netWorthFormatted: '$48,250.00', monthlySavingsRatePct: 28.4 }}
        >
          <div>Dashboard Screen Body</div>
        </AppShell>
      </ThemeProvider>
    );

    expect(Boolean(screen.getByText('Dashboard Screen Body'))).toBe(true);
    expect(Boolean(screen.getByText('$48,250.00'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Transactions/i }));
    expect(onNav).toHaveBeenCalledWith('/transactions');
  });
});
