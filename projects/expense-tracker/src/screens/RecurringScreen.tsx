import React, { useState } from 'react';
import { AccountRecord, CategoryRecord, RecurringRuleRecord } from '../server/db/schema';
import { RecurringOverview } from '../server/services/recurring.service';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Table,
  Tabs,
  Toast,
} from '../components/primitives/ui-primitives';
import { dollarsToCents, formatCents } from '../utils/currency';
import { formatHumanDate } from '../utils/date';

export interface RecurringScreenProps {
  overview: RecurringOverview;
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  activeMonth: string;
  onCreateRule: (input: {
    title: string;
    merchant: string;
    accountId: string;
    categoryId: string;
    type: 'EXPENSE' | 'INCOME';
    amountCents: number;
    frequency: RecurringRuleRecord['frequency'];
    dayOfMonth: number;
    nextDueDate: string;
    autoPost: boolean;
  }) => void;
  onPostOccurrenceNow: (ruleId: string) => void;
}

export const RecurringScreen: React.FC<RecurringScreenProps> = ({
  overview,
  accounts,
  categories,
  activeMonth,
  onCreateRule,
  onPostOccurrenceNow,
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amountDollars, setAmountDollars] = useState('49.00');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [frequency, setFrequency] = useState<RecurringRuleRecord['frequency']>('MONTHLY');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [nextDueDate, setNextDueDate] = useState(`${activeMonth}-25`);
  const [autoPost, setAutoPost] = useState(true);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (title.trim().length < 2 || merchant.trim().length < 2) {
      setFormError('Both rule title and merchant name are required.');
      return;
    }
    try {
      const amountCents = dollarsToCents(amountDollars);
      const dayOfMonth = parseInt(nextDueDate.split('-')[2] || '1', 10) || 1;
      onCreateRule({
        title: title.trim(),
        merchant: merchant.trim(),
        accountId: accountId || (accounts[0]?.id ?? ''),
        categoryId: categoryId || (categories[0]?.id ?? ''),
        type,
        amountCents,
        frequency,
        dayOfMonth,
        nextDueDate,
        autoPost,
      });
      setTitle('');
      setMerchant('');
      setIsModalOpen(false);
      setToast(`Scheduled recurring rule "${title.trim()}".`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create rule.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Recurring Bills, Subscriptions &amp; Cashflow Calendar
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage automated payroll, mortgage, utilities, SaaS subscriptions, and materialize due occurrences.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + Add Recurring Rule
        </Button>
      </div>

      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Monthly Recurring Expenses" subtitle="Normalized monthly burn">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--danger)]">
            {formatCents(overview.activeExpenseMonthlyEquivalentCents)}
          </p>
        </Card>
        <Card title="Monthly Recurring Income" subtitle="Scheduled inflows">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--success)]">
            {formatCents(overview.activeIncomeMonthlyEquivalentCents)}
          </p>
        </Card>
        <Card title="Active Schedules" subtitle="Tracked recurring rules">
          <p className="text-2xl font-bold font-mono tabular-nums">
            {overview.upcomingDueCount}
          </p>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: 'LIST', label: 'Scheduled Rules List', count: overview.rules.length },
          { id: 'CALENDAR', label: `Monthly Cashflow Calendar (${activeMonth})` },
        ]}
        activeTab={viewMode}
        onChange={(id) => setViewMode(id as 'LIST' | 'CALENDAR')}
      />

      {viewMode === 'LIST' ? (
        <Card title="Recurring Bills & Income Schedules">
          <Table
            columns={[
              {
                key: 'title',
                header: 'Schedule & Merchant',
                render: (row) => (
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{row.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.merchant}</p>
                  </div>
                ),
              },
              {
                key: 'frequency',
                header: 'Cadence',
                render: (row) => (
                  <div className="flex items-center gap-1.5">
                    <Badge label={row.frequency} tone="accent" />
                    {row.autoPost && <Badge label="Auto-Post" tone="success" />}
                  </div>
                ),
              },
              {
                key: 'nextDue',
                header: 'Next Due Date',
                render: (row) => (
                  <div>
                    <p className="font-medium">{formatHumanDate(row.nextDueDate)}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Last posted: {row.lastPostedDate ? formatHumanDate(row.lastPostedDate) : 'Never'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (row) => (
                  <span
                    className={`font-mono font-semibold ${
                      row.type === 'INCOME' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {row.type === 'INCOME' ? '+' : '-'}
                    {formatCents(row.amountCents)}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                render: (row) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onPostOccurrenceNow(row.id);
                      setToast(`Posted occurrence for "${row.title}" into ledger.`);
                    }}
                  >
                    Post Now
                  </Button>
                ),
              },
            ]}
            rows={overview.rules}
            rowKey={(r) => r.id}
          />
        </Card>
      ) : (
        <Card
          title={`Cashflow Obligation Calendar (${activeMonth})`}
          subtitle="Monday-through-Sunday 7-column schedule projection"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {overview.calendarCells
              .filter((c) => c.inCurrentMonth)
              .map((cell) => (
                <div
                  key={cell.dateIso}
                  className={`p-2.5 rounded-md border min-h-[88px] flex flex-col justify-between ${
                    cell.rulesDue.length > 0
                      ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">Day {cell.dayOfMonth}</span>
                    {cell.rulesDue.length > 0 && (
                      <Badge label={`${cell.rulesDue.length} due`} tone="accent" />
                    )}
                  </div>
                  <div className="space-y-1 mt-2">
                    {cell.rulesDue.map((r) => (
                      <div key={r.id} className="text-[11px] truncate font-medium">
                        {r.title}: {formatCents(r.amountCents)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        title="Create Recurring Bill or Income Rule"
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit}>
              Save Recurring Rule
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            id="rec-title-input"
            label="Schedule Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Municipal Water & Sewer"
            error={formError || undefined}
          />
          <Input
            id="rec-merchant-input"
            label="Merchant / Payee"
            required
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. City Water Authority"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              id="rec-type-select"
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME')}
              options={[
                { value: 'EXPENSE', label: 'Expense' },
                { value: 'INCOME', label: 'Income' },
              ]}
            />
            <Select
              id="rec-freq-select"
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurringRuleRecord['frequency'])}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'BIWEEKLY', label: 'Bi-Weekly' },
                { value: 'QUARTERLY', label: 'Quarterly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
            />
            <Input
              id="rec-amount-input"
              label="Amount (USD)"
              required
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="rec-account-select"
              label="Settlement Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <Select
              id="rec-category-select"
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <Input
            id="rec-next-date"
            label="Next Due Date"
            type="date"
            required
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
          <Checkbox
            id="rec-autopost-check"
            label="Auto-post into ledger on due date"
            checked={autoPost}
            onChange={(e) => setAutoPost(e.target.checked)}
          />
        </form>
      </Modal>
    </div>
  );
};
