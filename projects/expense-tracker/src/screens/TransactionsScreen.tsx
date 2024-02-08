import React, { useState } from 'react';
import {
  AccountRecord,
  CategoryRecord,
  TagRecord,
  TransactionRecord,
} from '../server/db/schema';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
  Toast,
} from '../components/primitives/ui-primitives';
import {
  dollarsToCents,
  formatCents,
  splitCentsEvenly,
  verifySplitSumMatchesTotal,
} from '../utils/currency';
import { formatHumanDate } from '../utils/date';

export interface TransactionsScreenProps {
  transactions: TransactionRecord[];
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  tags: TagRecord[];
  activeMonth: string;
  onCreateTransaction: (input: {
    accountId: string;
    categoryId: string;
    type: 'EXPENSE' | 'INCOME';
    status: 'CLEARED' | 'PENDING';
    amountCents: number;
    merchant: string;
    description: string;
    occurredOn: string;
    tagIds: string[];
    isSplit: boolean;
    splits: Array<{
      categoryId: string;
      amountCents: number;
      memo: string;
      reimbursementStatus: 'NONE' | 'PENDING';
      sharedWithPerson: string | null;
    }>;
  }) => void;
  onUpdateSplits: (
    transactionId: string,
    splits: Array<{
      categoryId: string;
      amountCents: number;
      memo: string;
      reimbursementStatus: 'NONE' | 'PENDING';
      sharedWithPerson: string | null;
    }>
  ) => void;
  onBulkUpdate: (input: {
    transactionIds: string[];
    categoryId?: string;
    status?: 'CLEARED' | 'PENDING' | 'RECONCILED';
  }) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  transactions,
  accounts,
  categories,
  tags,
  activeMonth,
  onCreateTransaction,
  onUpdateSplits,
  onBulkUpdate,
  onDeleteTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [onlySplits, setOnlySplits] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState(categories[0]?.id ?? '');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMerchant, setNewMerchant] = useState('');
  const [newAmountDollars, setNewAmountDollars] = useState('48.50');
  const [newType, setNewType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newAccountId, setNewAccountId] = useState(accounts[0]?.id ?? '');
  const [newCategoryId, setNewCategoryId] = useState(
    categories.find((c) => c.kind === 'EXPENSE')?.id ?? categories[0]?.id ?? ''
  );
  const [newDate, setNewDate] = useState(`${activeMonth}-18`);
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState('');

  const [splitTargetTx, setSplitTargetTx] = useState<TransactionRecord | null>(null);
  const [splitRow1Category, setSplitRow1Category] = useState(categories[0]?.id ?? '');
  const [splitRow1Dollars, setSplitRow1Dollars] = useState('0.00');
  const [splitRow1Memo, setSplitRow1Memo] = useState('Primary allocation');
  const [splitRow2Category, setSplitRow2Category] = useState(categories[1]?.id ?? categories[0]?.id ?? '');
  const [splitRow2Dollars, setSplitRow2Dollars] = useState('0.00');
  const [splitRow2Memo, setSplitRow2Memo] = useState('Secondary allocation');
  const [splitError, setSplitError] = useState('');

  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);

  const filtered = transactions.filter((tx) => {
    if (accountFilter !== 'ALL' && tx.accountId !== accountFilter) return false;
    if (categoryFilter !== 'ALL' && tx.categoryId !== categoryFilter) return false;
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (onlySplits && !tx.isSplit) return false;
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      if (!`${tx.merchant} ${tx.description}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openSplitDrawer = (tx: TransactionRecord) => {
    setSplitTargetTx(tx);
    setSplitError('');
    if (tx.isSplit && tx.splits.length >= 2) {
      setSplitRow1Category(tx.splits[0].categoryId);
      setSplitRow1Dollars((tx.splits[0].amountCents / 100).toFixed(2));
      setSplitRow1Memo(tx.splits[0].memo);
      setSplitRow2Category(tx.splits[1].categoryId);
      setSplitRow2Dollars((tx.splits[1].amountCents / 100).toFixed(2));
      setSplitRow2Memo(tx.splits[1].memo);
    } else {
      const [part1, part2] = splitCentsEvenly(tx.amountCents, 2);
      setSplitRow1Category(tx.categoryId);
      setSplitRow1Dollars((part1 / 100).toFixed(2));
      setSplitRow1Memo('Household portion');
      setSplitRow2Category(categories.find((c) => c.id !== tx.categoryId)?.id ?? tx.categoryId);
      setSplitRow2Dollars((part2 / 100).toFixed(2));
      setSplitRow2Memo('Secondary portion');
    }
  };

  const handleSaveSplits = () => {
    if (!splitTargetTx) return;
    setSplitError('');
    try {
      const c1 = dollarsToCents(splitRow1Dollars);
      const c2 = dollarsToCents(splitRow2Dollars);
      const check = verifySplitSumMatchesTotal(splitTargetTx.amountCents, [c1, c2]);
      if (!check.valid) {
        setSplitError(
          `Split sum (${formatCents(check.sumCents)}) must equal transaction total (${formatCents(
            splitTargetTx.amountCents
          )}).`
        );
        return;
      }
      onUpdateSplits(splitTargetTx.id, [
        {
          categoryId: splitRow1Category,
          amountCents: c1,
          memo: splitRow1Memo,
          reimbursementStatus: 'NONE',
          sharedWithPerson: null,
        },
        {
          categoryId: splitRow2Category,
          amountCents: c2,
          memo: splitRow2Memo,
          reimbursementStatus: 'NONE',
          sharedWithPerson: null,
        },
      ]);
      setToast({
        text: `Saved 2-way split breakdown for "${splitTargetTx.merchant}".`,
        tone: 'success',
      });
      setSplitTargetTx(null);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Invalid split amounts.');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (newMerchant.trim().length < 2) {
      setCreateError('Merchant name must be at least 2 characters.');
      return;
    }
    try {
      const amountCents = dollarsToCents(newAmountDollars);
      if (amountCents <= 0) {
        setCreateError('Amount must be greater than $0.00.');
        return;
      }
      onCreateTransaction({
        accountId: newAccountId || (accounts[0]?.id ?? ''),
        categoryId: newCategoryId || (categories[0]?.id ?? ''),
        type: newType,
        status: 'CLEARED',
        amountCents,
        merchant: newMerchant.trim(),
        description: newDescription.trim() || `${newType} at ${newMerchant.trim()}`,
        occurredOn: newDate,
        tagIds: tags[0] ? [tags[0].id] : [],
        isSplit: false,
        splits: [],
      });
      setNewMerchant('');
      setNewDescription('');
      setIsCreateOpen(false);
      setToast({ text: `Recorded transaction at "${newMerchant.trim()}".`, tone: 'success' });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to save transaction.');
    }
  };

  const handleBulkApply = () => {
    if (selectedIds.length === 0) return;
    onBulkUpdate({
      transactionIds: selectedIds,
      categoryId: bulkCategoryId,
      status: 'CLEARED',
    });
    setToast({
      text: `Updated ${selectedIds.length} selected transactions.`,
      tone: 'success',
    });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Transactions Ledger &amp; Split Engine
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Filter, categorize, split multi-category receipts, and bulk-manage household entries.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          + Record Transaction
        </Button>
      </div>

      {toast && (
        <Toast message={toast.text} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}

      <Card title="Ledger Filters & Search">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            id="ledger-search-input"
            label="Search Merchant or Memo"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search e.g. Green Valley, Payroll..."
          />
          <Select
            id="ledger-account-filter"
            label="Account"
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Accounts' },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <Select
            id="ledger-category-filter"
            label="Category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            id="ledger-type-filter"
            label="Transaction Type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER');
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'EXPENSE', label: 'Expense Only' },
              { value: 'INCOME', label: 'Income Only' },
              { value: 'TRANSFER', label: 'Transfers Only' },
            ]}
          />
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            id="ledger-only-splits"
            label="Show Split Transactions Only"
            checked={onlySplits}
            onChange={(e) => {
              setOnlySplits(e.target.checked);
              setPage(1);
            }}
          />
          <span className="text-xs text-[var(--text-muted)]">
            Showing {filtered.length} matching ledger entries
          </span>
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <Card
          title={`Bulk Action (${selectedIds.length} selected)`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleBulkApply}>
                Apply Bulk Category
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Clear Selection
              </Button>
            </div>
          }
        >
          <div className="max-w-xs">
            <Select
              id="bulk-category-select"
              label="Reassign Selected To Category"
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        </Card>
      )}

      <Card title="Transactions Ledger">
        <Table
          columns={[
            {
              key: 'select',
              header: 'Select',
              render: (row) => (
                <Checkbox
                  id={`sel-tx-${row.id}`}
                  label={row.occurredOn}
                  checked={selectedIds.includes(row.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds((prev) => [...prev, row.id]);
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => id !== row.id));
                    }
                  }}
                />
              ),
            },
            {
              key: 'merchant',
              header: 'Merchant & Memo',
              render: (row) => (
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                    <span>{row.merchant}</span>
                    {row.isSplit && <Badge label={`${row.splits.length} Splits`} tone="accent" />}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatHumanDate(row.occurredOn)} • {row.description}
                  </p>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Category & Account',
              render: (row) => {
                const cat = categories.find((c) => c.id === row.categoryId);
                const acc = accounts.find((a) => a.id === row.accountId);
                return (
                  <div>
                    <Badge label={cat?.name ?? 'Uncategorized'} tone="neutral" />
                    <p className="text-xs text-[var(--text-muted)] mt-1">{acc?.name ?? row.accountId}</p>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge
                  label={row.status}
                  tone={row.status === 'RECONCILED' ? 'success' : row.status === 'CLEARED' ? 'accent' : 'warning'}
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
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div className="inline-flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openSplitDrawer(row)}
                  >
                    Split
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTransaction(row.id)}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
          rows={pageRows}
          rowKey={(r) => r.id}
          emptyMessage="No transactions match your active search or filters."
          emptyActionLabel="Record Transaction"
          onEmptyAction={() => setIsCreateOpen(true)}
        />
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        isOpen={isCreateOpen}
        title="Record Ledger Transaction"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit}>
              Save Transaction
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            id="tx-create-merchant"
            label="Payee / Merchant Name"
            required
            value={newMerchant}
            onChange={(e) => setNewMerchant(e.target.value)}
            placeholder="e.g. Green Valley Market"
            error={createError || undefined}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="tx-create-type"
              label="Transaction Type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'EXPENSE' | 'INCOME')}
              options={[
                { value: 'EXPENSE', label: 'Expense (-)' },
                { value: 'INCOME', label: 'Income (+)' },
              ]}
            />
            <Input
              id="tx-create-amount"
              label="Amount (USD)"
              required
              value={newAmountDollars}
              onChange={(e) => setNewAmountDollars(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="tx-create-account"
              label="Account"
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <Select
              id="tx-create-category"
              label="Category"
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="tx-create-date"
              label="Date Occurred"
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <Input
              id="tx-create-memo"
              label="Description / Memo"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </form>
      </Modal>

      <Drawer
        isOpen={Boolean(splitTargetTx)}
        title={splitTargetTx ? `Split Transaction: ${splitTargetTx.merchant}` : 'Split Transaction'}
        onClose={() => setSplitTargetTx(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSplitTargetTx(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveSplits}>
              Save Split Allocation
            </Button>
          </>
        }
      >
        {splitTargetTx && (
          <div className="space-y-4">
            <div className="p-3 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Total Amount to Allocate:
              </span>
              <span className="font-mono font-bold text-base">
                {formatCents(splitTargetTx.amountCents)}
              </span>
            </div>

            {splitError && <Toast message={splitError} tone="error" />}

            <Card title="Split Line #1">
              <div className="space-y-3">
                <Select
                  id="split-1-category"
                  label="Category #1"
                  value={splitRow1Category}
                  onChange={(e) => setSplitRow1Category(e.target.value)}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Input
                  id="split-1-amount"
                  label="Split #1 Amount (USD)"
                  value={splitRow1Dollars}
                  onChange={(e) => setSplitRow1Dollars(e.target.value)}
                />
                <Input
                  id="split-1-memo"
                  label="Split #1 Memo"
                  value={splitRow1Memo}
                  onChange={(e) => setSplitRow1Memo(e.target.value)}
                />
              </div>
            </Card>

            <Card title="Split Line #2">
              <div className="space-y-3">
                <Select
                  id="split-2-category"
                  label="Category #2"
                  value={splitRow2Category}
                  onChange={(e) => setSplitRow2Category(e.target.value)}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Input
                  id="split-2-amount"
                  label="Split #2 Amount (USD)"
                  value={splitRow2Dollars}
                  onChange={(e) => setSplitRow2Dollars(e.target.value)}
                />
                <Input
                  id="split-2-memo"
                  label="Split #2 Memo"
                  value={splitRow2Memo}
                  onChange={(e) => setSplitRow2Memo(e.target.value)}
                />
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};
