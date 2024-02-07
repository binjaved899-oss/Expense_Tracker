import React, { useState } from 'react';
import { AccountRecord, TransactionRecord } from '../server/db/schema';
import { NetWorthSummary } from '../server/services/account.service';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  EmptyState,
  Input,
  Modal,
  Select,
  Tabs,
  Toast,
} from '../components/primitives/ui-primitives';
import { LocalSvgIcon } from '../components/icons/CategoryIcons';
import { dollarsToCents, formatCents } from '../utils/currency';
import { formatHumanDate } from '../utils/date';

export interface AccountsScreenProps {
  accounts: AccountRecord[];
  summary: NetWorthSummary;
  transactions: TransactionRecord[];
  onCreateAccount: (input: {
    name: string;
    type: AccountRecord['type'];
    currency: AccountRecord['currency'];
    openingBalanceCents: number;
    creditLimitCents: number | null;
    institution: string;
    accountNumberMasked: string;
  }) => void;
  onTransferFunds: (input: {
    fromAccountId: string;
    toAccountId: string;
    amountCents: number;
    occurredOn: string;
    description: string;
  }) => void;
  onReconcileStatement: (input: {
    accountId: string;
    statementDate: string;
    statementEndingBalanceCents: number;
    transactionIdsToReconcile: string[];
  }) => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  accounts,
  summary,
  transactions,
  onCreateAccount,
  onTransferFunds,
  onReconcileStatement,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LIQUID' | 'CREDIT'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [reconcileAccount, setReconcileAccount] = useState<AccountRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);

  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountRecord['type']>('CHECKING');
  const [newAccInstitution, setNewAccInstitution] = useState('');
  const [newAccMasked, setNewAccMasked] = useState('•••• 1024');
  const [newAccOpeningDollars, setNewAccOpeningDollars] = useState('1000.00');
  const [newAccLimitDollars, setNewAccLimitDollars] = useState('5000.00');
  const [formError, setFormError] = useState('');

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [transferDollars, setTransferDollars] = useState('250.00');
  const [transferDate, setTransferDate] = useState('2024-02-21');
  const [transferMemo, setTransferMemo] = useState('Monthly reserve transfer');
  const [transferError, setTransferError] = useState('');

  const [statementDate, setStatementDate] = useState('2024-02-28');
  const [statementEndingDollars, setStatementEndingDollars] = useState('19085.50');
  const [selectedReconcileTxIds, setSelectedReconcileTxIds] = useState<string[]>([]);

  const filteredAccounts = accounts.filter((acc) => {
    if (activeFilter === 'LIQUID') {
      return acc.type === 'CHECKING' || acc.type === 'SAVINGS' || acc.type === 'CASH';
    }
    if (activeFilter === 'CREDIT') {
      return acc.type === 'CREDIT_CARD';
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (newAccName.trim().length < 2) {
        setFormError('Account name must be at least 2 characters.');
        return;
      }
      if (newAccInstitution.trim().length < 2) {
        setFormError('Institution name is required.');
        return;
      }
      const openingCents = dollarsToCents(newAccOpeningDollars);
      const limitCents = newAccType === 'CREDIT_CARD' ? dollarsToCents(newAccLimitDollars) : null;

      onCreateAccount({
        name: newAccName.trim(),
        type: newAccType,
        currency: 'USD',
        openingBalanceCents: openingCents,
        creditLimitCents: limitCents,
        institution: newAccInstitution.trim(),
        accountNumberMasked: newAccMasked.trim() || '•••• 0000',
      });
      setNewAccName('');
      setNewAccInstitution('');
      setIsCreateOpen(false);
      setToastMessage({ text: `Account "${newAccName.trim()}" created.`, tone: 'success' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create account.');
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    try {
      if (fromAccountId === toAccountId) {
        setTransferError('Source and destination accounts must be different.');
        return;
      }
      const amountCents = dollarsToCents(transferDollars);
      if (amountCents <= 0) {
        setTransferError('Transfer amount must be greater than $0.00.');
        return;
      }
      onTransferFunds({
        fromAccountId,
        toAccountId,
        amountCents,
        occurredOn: transferDate,
        description: transferMemo.trim() || 'Inter-account transfer',
      });
      setIsTransferOpen(false);
      setToastMessage({
        text: `Transferred ${formatCents(amountCents)} between accounts.`,
        tone: 'success',
      });
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Transfer failed.');
    }
  };

  const openReconcileDrawer = (account: AccountRecord) => {
    setReconcileAccount(account);
    setStatementEndingDollars((account.currentBalanceCents / 100).toFixed(2));
    const clearedIds = transactions
      .filter((t) => t.accountId === account.id && t.status === 'CLEARED')
      .map((t) => t.id);
    setSelectedReconcileTxIds(clearedIds);
  };

  const handleReconcileSubmit = () => {
    if (!reconcileAccount) return;
    try {
      const endingCents = dollarsToCents(statementEndingDollars);
      onReconcileStatement({
        accountId: reconcileAccount.id,
        statementDate,
        statementEndingBalanceCents: endingCents,
        transactionIdsToReconcile: selectedReconcileTxIds,
      });
      setToastMessage({
        text: `Reconciled ${selectedReconcileTxIds.length} entries for "${reconcileAccount.name}".`,
        tone: 'success',
      });
      setReconcileAccount(null);
    } catch (err) {
      setToastMessage({
        text: err instanceof Error ? err.message : 'Reconciliation failed.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Accounts, Wallets &amp; Transfers
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage checking, treasury savings, credit cards, atomic transfers, and statement reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setIsTransferOpen(true)}>
            Transfer Funds
          </Button>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            + Add Account
          </Button>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.text}
          tone={toastMessage.tone}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Net Worth" subtitle="Assets minus liabilities">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
            {formatCents(summary.netWorthCents)}
          </p>
          <p className="text-xs text-[var(--success)] mt-1">
            {summary.activeAccountsCount} active accounts
          </p>
        </Card>

        <Card title="Total Assets" subtitle="Checking, savings & cash">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--success)]">
            {formatCents(summary.totalAssetsCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Liquid cash: {formatCents(summary.liquidCashCents)}
          </p>
        </Card>

        <Card title="Total Liabilities" subtitle="Revolving credit balances">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--danger)]">
            {formatCents(summary.totalLiabilitiesCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Credit limit: {formatCents(summary.totalCreditLimitCents)}
          </p>
        </Card>

        <Card title="Credit Utilization" subtitle="Target under 30%">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
            {summary.creditUtilizationPct}%
          </p>
          <div className="mt-2">
            <Badge
              label={summary.creditUtilizationPct < 30 ? 'Healthy (<30%)' : 'High Utilization'}
              tone={summary.creditUtilizationPct < 30 ? 'success' : 'warning'}
            />
          </div>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: 'ALL', label: 'All Accounts', count: accounts.length },
          {
            id: 'LIQUID',
            label: 'Liquid Cash & Bank',
            count: accounts.filter((a) => a.type !== 'CREDIT_CARD').length,
          },
          {
            id: 'CREDIT',
            label: 'Credit Cards',
            count: accounts.filter((a) => a.type === 'CREDIT_CARD').length,
          },
        ]}
        activeTab={activeFilter}
        onChange={(id) => setActiveFilter(id as 'ALL' | 'LIQUID' | 'CREDIT')}
      />

      {filteredAccounts.length === 0 ? (
        <EmptyState
          title="No Matching Accounts"
          description="Add a checking, savings, credit card, or cash account to begin tracking balances."
          actionLabel="Add Account"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const isCredit = acc.type === 'CREDIT_CARD';
            return (
              <Card
                key={acc.id}
                title={acc.name}
                subtitle={`${acc.institution} • ${acc.accountNumberMasked}`}
                actions={<Badge label={acc.type} tone={isCredit ? 'warning' : 'accent'} />}
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[var(--text-muted)]">Current Balance</span>
                    <span
                      className={`text-xl font-bold font-mono tabular-nums ${
                        acc.currentBalanceCents < 0
                          ? 'text-[var(--danger)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {formatCents(acc.currentBalanceCents, acc.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Opening (Feb 2024):</span>
                    <span className="font-mono">{formatCents(acc.openingBalanceCents, acc.currency)}</span>
                  </div>

                  {isCredit && acc.creditLimitCents && (
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>Credit Limit:</span>
                      <span className="font-mono">{formatCents(acc.creditLimitCents, acc.currency)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1">
                      <LocalSvgIcon name="shield-check" size={14} />
                      {acc.lastReconciledAt
                        ? `Reconciled ${formatHumanDate(acc.lastReconciledAt.slice(0, 10))}`
                        : 'Unreconciled'}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openReconcileDrawer(acc)}
                    >
                      Reconcile
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        title="Add Financial Account"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit}>
              Create Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            id="acc-name-input"
            label="Account Name"
            required
            value={newAccName}
            onChange={(e) => setNewAccName(e.target.value)}
            placeholder="e.g. Emerald Business Checking"
            error={formError || undefined}
          />
          <Select
            id="acc-type-select"
            label="Account Classification"
            value={newAccType}
            onChange={(e) => setNewAccType(e.target.value as AccountRecord['type'])}
            options={[
              { value: 'CHECKING', label: 'Checking Account' },
              { value: 'SAVINGS', label: 'High-Yield Savings' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
              { value: 'CASH', label: 'Cash Wallet' },
              { value: 'INVESTMENT', label: 'Investment Brokerage' },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="acc-institution-input"
              label="Financial Institution"
              required
              value={newAccInstitution}
              onChange={(e) => setNewAccInstitution(e.target.value)}
              placeholder="e.g. First Horizon"
            />
            <Input
              id="acc-masked-input"
              label="Account Suffix"
              required
              value={newAccMasked}
              onChange={(e) => setNewAccMasked(e.target.value)}
            />
          </div>
          <Input
            id="acc-opening-balance"
            label="Opening Balance (USD)"
            required
            value={newAccOpeningDollars}
            onChange={(e) => setNewAccOpeningDollars(e.target.value)}
            helperText="Use negative amount for starting credit card balance."
          />
          {newAccType === 'CREDIT_CARD' && (
            <Input
              id="acc-credit-limit"
              label="Credit Limit (USD)"
              value={newAccLimitDollars}
              onChange={(e) => setNewAccLimitDollars(e.target.value)}
            />
          )}
        </form>
      </Modal>

      <Modal
        isOpen={isTransferOpen}
        title="Execute Atomic Inter-Account Transfer"
        onClose={() => setIsTransferOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsTransferOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleTransferSubmit}>
              Confirm Transfer
            </Button>
          </>
        }
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            id="xfer-from-account"
            label="Source Account (Debit)"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            options={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (${formatCents(a.currentBalanceCents)})`,
            }))}
          />
          <Select
            id="xfer-to-account"
            label="Destination Account (Credit)"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            options={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (${formatCents(a.currentBalanceCents)})`,
            }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="xfer-amount-dollars"
              label="Transfer Amount (USD)"
              required
              value={transferDollars}
              onChange={(e) => setTransferDollars(e.target.value)}
              error={transferError || undefined}
            />
            <Input
              id="xfer-date-input"
              label="Transfer Date"
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>
          <Input
            id="xfer-memo-input"
            label="Transfer Description"
            required
            value={transferMemo}
            onChange={(e) => setTransferMemo(e.target.value)}
          />
        </form>
      </Modal>

      <Drawer
        isOpen={Boolean(reconcileAccount)}
        title={reconcileAccount ? `Reconcile: ${reconcileAccount.name}` : 'Reconcile Statement'}
        onClose={() => setReconcileAccount(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReconcileAccount(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReconcileSubmit}>
              Finalize Statement
            </Button>
          </>
        }
      >
        {reconcileAccount && (
          <div className="space-y-4">
            <Input
              id="rec-statement-date"
              label="Statement Closing Date"
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
            />
            <Input
              id="rec-ending-balance"
              label="Statement Ending Balance (USD)"
              value={statementEndingDollars}
              onChange={(e) => setStatementEndingDollars(e.target.value)}
            />
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Cleared Transactions to Mark Reconciled
              </p>
              {transactions
                .filter((t) => t.accountId === reconcileAccount.id)
                .map((tx) => {
                  const checked = selectedReconcileTxIds.includes(tx.id);
                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-between gap-2"
                    >
                      <Checkbox
                        id={`rec-tx-${tx.id}`}
                        label={tx.merchant}
                        description={`${tx.occurredOn} • ${tx.status}`}
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReconcileTxIds((prev) => [...prev, tx.id]);
                          } else {
                            setSelectedReconcileTxIds((prev) => prev.filter((id) => id !== tx.id));
                          }
                        }}
                      />
                      <span className="font-mono text-xs font-semibold">
                        {formatCents(tx.amountCents)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
