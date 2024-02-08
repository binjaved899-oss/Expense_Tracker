import React, { useState } from 'react';
import { CategoryRecord } from '../server/db/schema';
import { MonthlyBudgetReport } from '../server/services/budget.service';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  Select,
  Tabs,
  Toast,
} from '../components/primitives/ui-primitives';
import { dollarsToCents, formatCents } from '../utils/currency';

export interface BudgetsScreenProps {
  report: MonthlyBudgetReport;
  categories: CategoryRecord[];
  onUpsertEnvelope: (input: {
    categoryId: string;
    month: string;
    limitCents: number;
    rolloverEnabled: boolean;
    carriedOverCents: number;
    alertThresholdPct: number;
    notes: string;
  }) => void;
  onCopyPreviousMonth: (targetMonth: string) => { copiedCount: number };
}

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({
  report,
  categories,
  onUpsertEnvelope,
  onCopyPreviousMonth,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'ALERTS' | 'EXCEEDED'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const expenseCategories = categories.filter((c) => c.kind === 'EXPENSE');
  const [selectedCategoryId, setSelectedCategoryId] = useState(expenseCategories[0]?.id ?? '');
  const [limitDollars, setLimitDollars] = useState('450.00');
  const [rolloverEnabled, setRolloverEnabled] = useState(true);
  const [carriedDollars, setCarriedDollars] = useState('25.00');
  const [alertPct, setAlertPct] = useState('80');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const visibleEnvelopes = report.envelopes.filter((env) => {
    if (filterTab === 'ALERTS') return env.alertState !== 'OK';
    if (filterTab === 'EXCEEDED') return env.alertState === 'EXCEEDED_100';
    return true;
  });

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const limitCents = dollarsToCents(limitDollars);
      if (limitCents <= 0) {
        setFormError('Monthly limit must be greater than $0.00.');
        return;
      }
      const carriedCents = rolloverEnabled ? dollarsToCents(carriedDollars) : 0;
      onUpsertEnvelope({
        categoryId: selectedCategoryId || (expenseCategories[0]?.id ?? ''),
        month: report.month,
        limitCents,
        rolloverEnabled,
        carriedOverCents: carriedCents,
        alertThresholdPct: Math.min(100, Math.max(50, parseInt(alertPct, 10) || 80)),
        notes: notes.trim(),
      });
      setIsModalOpen(false);
      setToast(`Saved ${report.month} budget envelope.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save budget envelope.');
    }
  };

  const handleRolloverCopy = () => {
    const res = onCopyPreviousMonth(report.month);
    setToast(`Copied ${res.copiedCount} envelopes into ${report.month} with rollover balances.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Monthly Budgets &amp; Rollover Envelopes ({report.month})
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Track category burn rates, rollover unspent balances, and monitor 80% / 100% alert thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={handleRolloverCopy}>
            Copy &amp; Rollover Prior Month
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + Configure Envelope
          </Button>
        </div>
      </div>

      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Effective Monthly Budget" subtitle="Base limits + rollover">
          <p className="text-2xl font-bold font-mono tabular-nums">
            {formatCents(report.totalEffectiveLimitCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Base: {formatCents(report.totalBaseLimitCents)}
          </p>
        </Card>

        <Card title="Actual Month Spend" subtitle={`Across ${report.envelopes.length} envelopes`}>
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--danger)]">
            {formatCents(report.totalSpentCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Utilization: {report.overallUtilizationPct}%
          </p>
        </Card>

        <Card title="Remaining Envelope Capacity" subtitle="Unspent budget balance">
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${
              report.totalRemainingCents >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {formatCents(report.totalRemainingCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Available before month-end</p>
        </Card>

        <Card title="Threshold Alerts" subtitle="80% warning & 100% exceeded">
          <div className="flex items-center gap-2 mt-1">
            <Badge label={`${report.warningCount} Warning (>=80%)`} tone="warning" />
            <Badge label={`${report.exceededCount} Exceeded (>=100%)`} tone="danger" />
          </div>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: 'ALL', label: 'All Envelopes', count: report.envelopes.length },
          {
            id: 'ALERTS',
            label: 'At Risk (>=80%)',
            count: report.warningCount + report.exceededCount,
          },
          { id: 'EXCEEDED', label: 'Exceeded (>=100%)', count: report.exceededCount },
        ]}
        activeTab={filterTab}
        onChange={(id) => setFilterTab(id as 'ALL' | 'ALERTS' | 'EXCEEDED')}
      />

      {visibleEnvelopes.length === 0 ? (
        <EmptyState
          title="No Envelopes in Selected Filter"
          description="Configure a category budget envelope or copy envelopes from the prior month."
          actionLabel="Configure Envelope"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleEnvelopes.map((env) => {
            const barWidth = Math.min(100, Math.max(2, env.utilizationPct));
            const barColorCls =
              env.alertState === 'EXCEEDED_100'
                ? 'bg-[var(--danger)]'
                : env.alertState === 'WARNING_80'
                ? 'bg-[var(--warning)]'
                : 'bg-[var(--accent-primary)]';

            return (
              <Card
                key={env.id}
                title={env.categoryName}
                subtitle={env.notes || `Alert threshold: ${env.alertThresholdPct}%`}
                actions={
                  <Badge
                    label={
                      env.alertState === 'EXCEEDED_100'
                        ? `Exceeded (${env.utilizationPct}%)`
                        : env.alertState === 'WARNING_80'
                        ? `Warning (${env.utilizationPct}%)`
                        : `On Track (${env.utilizationPct}%)`
                    }
                    tone={
                      env.alertState === 'EXCEEDED_100'
                        ? 'danger'
                        : env.alertState === 'WARNING_80'
                        ? 'warning'
                        : 'success'
                    }
                  />
                }
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Spent vs. Effective Cap</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatCents(env.spentCents)} / {formatCents(env.effectiveLimitCents)}
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(env.utilizationPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${env.categoryName} budget utilization`}
                    className="w-full h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"
                  >
                    <div className={`h-full rounded-full ${barColorCls}`} style={{ width: `${barWidth}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                    <span>
                      {env.rolloverEnabled
                        ? `Rollover: +${formatCents(env.carriedOverCents)}`
                        : 'Rollover Disabled'}
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        env.remainingCents < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'
                      }`}
                    >
                      {env.remainingCents >= 0
                        ? `${formatCents(env.remainingCents)} left`
                        : `${formatCents(Math.abs(env.remainingCents))} over`}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        title={`Configure Budget Envelope (${report.month})`}
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveBudget}>
              Save Envelope
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <Select
            id="bdg-category-select"
            label="Expense Category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="bdg-limit-dollars"
              label="Monthly Base Limit (USD)"
              required
              value={limitDollars}
              onChange={(e) => setLimitDollars(e.target.value)}
              error={formError || undefined}
            />
            <Input
              id="bdg-alert-pct"
              label="Warning Threshold (%)"
              type="number"
              value={alertPct}
              onChange={(e) => setAlertPct(e.target.value)}
            />
          </div>
          <Checkbox
            id="bdg-rollover-toggle"
            label="Enable Unspent Rollover Carry-Forward"
            checked={rolloverEnabled}
            onChange={(e) => setRolloverEnabled(e.target.checked)}
          />
          {rolloverEnabled && (
            <Input
              id="bdg-carried-dollars"
              label="Carried Over From Prior Month (USD)"
              value={carriedDollars}
              onChange={(e) => setCarriedDollars(e.target.value)}
            />
          )}
          <Input
            id="bdg-notes-input"
            label="Envelope Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional target notes"
          />
        </form>
      </Modal>
    </div>
  );
};
