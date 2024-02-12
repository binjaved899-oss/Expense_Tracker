import React, { useState } from 'react';
import {
  CategoryRecord,
  ReimbursementStatus,
  TransactionRecord,
} from '../server/db/schema';
import { ReceiptsSummary } from '../server/services/receipt.service';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  Select,
  Table,
  Tabs,
  Toast,
} from '../components/primitives/ui-primitives';
import { dollarsToCents, formatCents } from '../utils/currency';
import { formatHumanDate } from '../utils/date';

export interface ReceiptsScreenProps {
  summary: ReceiptsSummary;
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  onAddReceiptItem: (input: {
    transactionId: string;
    itemName: string;
    quantity: number;
    unitPriceCents: number;
    taxCents: number;
    categoryId: string;
    reimbursementStatus: ReimbursementStatus;
    sharedWithPerson: string | null;
  }) => void;
  onUpdateReimbursementStatus: (itemId: string, status: ReimbursementStatus) => void;
}

export const ReceiptsScreen: React.FC<ReceiptsScreenProps> = ({
  summary,
  transactions,
  categories,
  onAddReceiptItem,
  onUpdateReimbursementStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'CLAIMS' | 'REIMBURSED' | 'SHARED'>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const expenseTxs = transactions.filter((t) => t.type === 'EXPENSE');
  const [transactionId, setTransactionId] = useState(expenseTxs[0]?.id ?? '');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitDollars, setUnitDollars] = useState('45.00');
  const [taxDollars, setTaxDollars] = useState('3.60');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [reimbursementStatus, setReimbursementStatus] = useState<ReimbursementStatus>('PENDING');
  const [sharedWithPerson, setSharedWithPerson] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const visibleItems = summary.items.filter((item) => {
    if (activeTab === 'CLAIMS') {
      return item.reimbursementStatus === 'PENDING' || item.reimbursementStatus === 'SUBMITTED';
    }
    if (activeTab === 'REIMBURSED') {
      return item.reimbursementStatus === 'REIMBURSED';
    }
    if (activeTab === 'SHARED') {
      return Boolean(item.sharedWithPerson);
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (itemName.trim().length < 2) {
      setFormError('Item description must be at least 2 characters.');
      return;
    }
    try {
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const unitCents = dollarsToCents(unitDollars);
      const taxCents = dollarsToCents(taxDollars);
      onAddReceiptItem({
        transactionId: transactionId || (expenseTxs[0]?.id ?? ''),
        itemName: itemName.trim(),
        quantity: qty,
        unitPriceCents: unitCents,
        taxCents,
        categoryId: categoryId || (categories[0]?.id ?? ''),
        reimbursementStatus,
        sharedWithPerson: sharedWithPerson.trim() || null,
      });
      setItemName('');
      setSharedWithPerson('');
      setIsDrawerOpen(false);
      setToast(`Added receipt line item "${itemName.trim()}".`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid receipt line item.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Itemized Receipts, Reimbursements &amp; Shared Splits
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Break receipts into taxed line-items, track employer/HSA claims, and settle shared household expenses.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsDrawerOpen(true)}>
          + Itemize Receipt Line
        </Button>
      </div>

      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Itemized Volume" subtitle="Verified receipt items">
          <p className="text-2xl font-bold font-mono tabular-nums">
            {formatCents(summary.totalItemizedCents)}
          </p>
        </Card>
        <Card title="Open Claims (Pending / Submitted)" subtitle="Awaiting payout">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--warning)]">
            {formatCents(summary.pendingReimbursementCents + summary.submittedReimbursementCents)}
          </p>
        </Card>
        <Card title="Reimbursed Settled" subtitle="Credited to checking/HSA">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--success)]">
            {formatCents(summary.reimbursedTotalCents)}
          </p>
        </Card>
        <Card title="Shared Partner Split (50%)" subtitle="Household partner share">
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent-primary)]">
            {formatCents(summary.sharedSplitTotalCents)}
          </p>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: 'ALL', label: 'All Line Items', count: summary.items.length },
          {
            id: 'CLAIMS',
            label: 'Open Reimbursement Claims',
            count: summary.items.filter(
              (i) => i.reimbursementStatus === 'PENDING' || i.reimbursementStatus === 'SUBMITTED'
            ).length,
          },
          {
            id: 'REIMBURSED',
            label: 'Reimbursed',
            count: summary.items.filter((i) => i.reimbursementStatus === 'REIMBURSED').length,
          },
          {
            id: 'SHARED',
            label: 'Shared Household Splits',
            count: summary.items.filter((i) => Boolean(i.sharedWithPerson)).length,
          },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'ALL' | 'CLAIMS' | 'REIMBURSED' | 'SHARED')}
      />

      <Card title="Itemized Receipt Breakdown">
        <Table
          columns={[
            {
              key: 'item',
              header: 'Line Item & Merchant',
              render: (row) => (
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{row.itemName}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {row.merchantName} • {formatHumanDate(row.occurredOn)}
                  </p>
                </div>
              ),
            },
            {
              key: 'qtyTax',
              header: 'Qty × Unit + Tax',
              render: (row) => (
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  {row.quantity} × {formatCents(row.unitPriceCents)} + {formatCents(row.taxCents)} tax
                </span>
              ),
            },
            {
              key: 'claim',
              header: 'Claim & Split Status',
              render: (row) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    label={row.reimbursementStatus}
                    tone={
                      row.reimbursementStatus === 'REIMBURSED'
                        ? 'success'
                        : row.reimbursementStatus === 'SUBMITTED'
                        ? 'accent'
                        : row.reimbursementStatus === 'PENDING'
                        ? 'warning'
                        : 'neutral'
                    }
                  />
                  {row.reimbursementClaimCode && (
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {row.reimbursementClaimCode}
                    </span>
                  )}
                  {row.sharedWithPerson && (
                    <Badge label={`Shared: ${row.sharedWithPerson}`} tone="accent" />
                  )}
                </div>
              ),
            },
            {
              key: 'total',
              header: 'Line Total',
              align: 'right',
              render: (row) => (
                <span className="font-mono font-semibold tabular-nums">
                  {formatCents(row.totalCents)}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Settlement Action',
              align: 'right',
              render: (row) =>
                row.reimbursementStatus === 'PENDING' || row.reimbursementStatus === 'SUBMITTED' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onUpdateReimbursementStatus(row.id, 'REIMBURSED');
                      setToast(`Marked "${row.itemName}" as REIMBURSED.`);
                    }}
                  >
                    Mark Reimbursed
                  </Button>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">Settled</span>
                ),
            },
          ]}
          rows={visibleItems}
          rowKey={(r) => r.id}
        />
      </Card>

      <Drawer
        isOpen={isDrawerOpen}
        title="Itemize Receipt Line Item"
        onClose={() => setIsDrawerOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSubmit}>
              Save Receipt Item
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Select
            id="rcp-tx-select"
            label="Parent Expense Transaction"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            options={expenseTxs.map((t) => ({
              value: t.id,
              label: `${t.merchant} (${t.occurredOn} • ${formatCents(t.amountCents)})`,
            }))}
          />
          <Input
            id="rcp-item-name"
            label="Item Description"
            required
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. USB-C Braided Power Cable"
            error={formError || undefined}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="rcp-qty-input"
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              id="rcp-unit-price"
              label="Unit Price ($)"
              value={unitDollars}
              onChange={(e) => setUnitDollars(e.target.value)}
            />
            <Input
              id="rcp-tax-price"
              label="Sales Tax ($)"
              value={taxDollars}
              onChange={(e) => setTaxDollars(e.target.value)}
            />
          </div>
          <Select
            id="rcp-cat-select"
            label="Line Item Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            id="rcp-status-select"
            label="Reimbursement Status"
            value={reimbursementStatus}
            onChange={(e) => setReimbursementStatus(e.target.value as ReimbursementStatus)}
            options={[
              { value: 'NONE', label: 'Personal (Not Reimbursable)' },
              { value: 'PENDING', label: 'Pending Claim' },
              { value: 'SUBMITTED', label: 'Submitted to Employer / HSA' },
              { value: 'REIMBURSED', label: 'Reimbursed' },
            ]}
          />
          <Input
            id="rcp-shared-person"
            label="Shared With Household Member (Optional)"
            value={sharedWithPerson}
            onChange={(e) => setSharedWithPerson(e.target.value)}
            placeholder="e.g. Farhan Tariq"
          />
        </form>
      </Drawer>
    </div>
  );
};
