import React, { useState } from 'react';
import { CategoryRecord, MerchantRuleRecord, TagRecord } from '../../server/db/schema';
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Table,
  Toast,
} from '../primitives/ui-primitives';
import { LocalSvgIcon, IconName } from '../icons/CategoryIcons';
import { dollarsToCents, formatCents } from '../../utils/currency';

export interface CategoryRuleManagerProps {
  categories: CategoryRecord[];
  tags: TagRecord[];
  merchantRules: MerchantRuleRecord[];
  onCreateCategory: (input: {
    name: string;
    kind: CategoryRecord['kind'];
    colorToken: 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
    iconName: string;
    monthlyTargetCents: number;
  }) => void;
  onCreateMerchantRule: (input: {
    pattern: string;
    matchType: MerchantRuleRecord['matchType'];
    categoryId: string;
    priority: number;
  }) => void;
  onApplyRulesToLedger: () => { evaluatedCount: number; updatedCount: number };
}

export const CategoryRuleManager: React.FC<CategoryRuleManagerProps> = ({
  categories,
  tags,
  merchantRules,
  onCreateCategory,
  onCreateMerchantRule,
  onApplyRulesToLedger,
}) => {
  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<CategoryRecord['kind']>('EXPENSE');
  const [catColor, setCatColor] = useState<'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'>('teal');
  const [catTargetDollars, setCatTargetDollars] = useState('250.00');
  const [catError, setCatError] = useState('');

  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<MerchantRuleRecord['matchType']>('CONTAINS');
  const [ruleCategoryId, setRuleCategoryId] = useState(categories[0]?.id ?? '');
  const [rulePriority, setRulePriority] = useState('25');
  const [ruleError, setRuleError] = useState('');

  const [toast, setToast] = useState<string | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (catName.trim().length < 2) {
      setCatError('Category name must be at least 2 characters.');
      return;
    }
    try {
      const targetCents = dollarsToCents(catTargetDollars);
      onCreateCategory({
        name: catName.trim(),
        kind: catKind,
        colorToken: catColor,
        iconName: 'shopping-cart',
        monthlyTargetCents: targetCents,
      });
      setToast(`Created category "${catName.trim()}".`);
      setCatName('');
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Unable to create category.');
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError('');
    if (rulePattern.trim().length < 2) {
      setRuleError('Merchant pattern must be at least 2 characters.');
      return;
    }
    try {
      onCreateMerchantRule({
        pattern: rulePattern.trim(),
        matchType: ruleMatchType,
        categoryId: ruleCategoryId || (categories[0]?.id ?? ''),
        priority: Math.max(1, parseInt(rulePriority, 10) || 25),
      });
      setToast(`Added auto-categorization rule for "${rulePattern.trim()}".`);
      setRulePattern('');
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : 'Unable to create rule.');
    }
  };

  const handleRunRules = () => {
    const res = onApplyRulesToLedger();
    setToast(
      `Evaluated ${res.evaluatedCount} transactions and auto-updated ${res.updatedCount} matching entries.`
    );
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Create Spending or Income Category"
          subtitle="Categories power monthly envelopes and SVG breakdown charts"
        >
          <form onSubmit={handleAddCategory} className="space-y-4">
            <Input
              id="new-cat-name"
              label="Category Name"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Childcare & Education"
              error={catError || undefined}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                id="new-cat-kind"
                label="Category Kind"
                value={catKind}
                onChange={(e) => setCatKind(e.target.value as CategoryRecord['kind'])}
                options={[
                  { value: 'EXPENSE', label: 'Expense' },
                  { value: 'INCOME', label: 'Income' },
                ]}
              />
              <Select
                id="new-cat-color"
                label="Token Color"
                value={catColor}
                onChange={(e) =>
                  setCatColor(
                    e.target.value as 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'
                  )
                }
                options={[
                  { value: 'teal', label: 'Teal' },
                  { value: 'emerald', label: 'Emerald' },
                  { value: 'amber', label: 'Amber' },
                  { value: 'rose', label: 'Rose' },
                  { value: 'sky', label: 'Sky' },
                  { value: 'violet', label: 'Violet' },
                ]}
              />
              <Input
                id="new-cat-target"
                label="Monthly Target ($)"
                value={catTargetDollars}
                onChange={(e) => setCatTargetDollars(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Add Category
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Automated Merchant Categorization Rule"
          subtitle="Deterministic keyword rules applied on import and transaction entry"
          actions={
            <Button variant="secondary" size="sm" onClick={handleRunRules}>
              Run Rules on Ledger
            </Button>
          }
        >
          <form onSubmit={handleAddRule} className="space-y-4">
            <Input
              id="new-rule-pattern"
              label="Merchant Keyword Pattern"
              required
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              placeholder="e.g. Whole Foods"
              error={ruleError || undefined}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                id="new-rule-match"
                label="Match Operator"
                value={ruleMatchType}
                onChange={(e) => setRuleMatchType(e.target.value as MerchantRuleRecord['matchType'])}
                options={[
                  { value: 'CONTAINS', label: 'Contains' },
                  { value: 'STARTS_WITH', label: 'Starts With' },
                  { value: 'EXACT', label: 'Exact Match' },
                ]}
              />
              <Select
                id="new-rule-category"
                label="Assign Category"
                value={ruleCategoryId}
                onChange={(e) => setRuleCategoryId(e.target.value)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Input
                id="new-rule-priority"
                label="Priority (1=Highest)"
                type="number"
                value={rulePriority}
                onChange={(e) => setRulePriority(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Save Merchant Rule
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card
        title="Active Categories & Tags Catalog"
        subtitle={`${categories.length} categories • ${tags.length} tags`}
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <Badge key={tag.id} label={`#${tag.name}`} tone="accent" />
          ))}
        </div>
        <Table
          columns={[
            {
              key: 'name',
              header: 'Category',
              render: (row) => (
                <div className="inline-flex items-center gap-2 font-medium">
                  <LocalSvgIcon name={(row.iconName as IconName) || 'shopping-cart'} size={16} />
                  <span>{row.name}</span>
                </div>
              ),
            },
            {
              key: 'kind',
              header: 'Kind',
              render: (row) => (
                <Badge
                  label={row.kind}
                  tone={row.kind === 'INCOME' ? 'success' : row.kind === 'EXPENSE' ? 'warning' : 'neutral'}
                />
              ),
            },
            {
              key: 'target',
              header: 'Monthly Target',
              align: 'right',
              render: (row) => (
                <span className="font-mono">{formatCents(row.monthlyTargetCents)}</span>
              ),
            },
          ]}
          rows={categories}
          rowKey={(r) => r.id}
        />
      </Card>

      <Card title="Priority Merchant Rules" subtitle="Evaluated in ascending priority order">
        <Table
          columns={[
            {
              key: 'priority',
              header: 'Priority',
              render: (row) => <span className="font-mono font-semibold">#{row.priority}</span>,
            },
            {
              key: 'pattern',
              header: 'Merchant Pattern',
              render: (row) => <span className="font-medium">{row.pattern}</span>,
            },
            {
              key: 'matchType',
              header: 'Operator',
              render: (row) => <Badge label={row.matchType} tone="neutral" />,
            },
            {
              key: 'category',
              header: 'Target Category',
              render: (row) => {
                const cat = categories.find((c) => c.id === row.categoryId);
                return <span>{cat?.name ?? row.categoryId}</span>;
              },
            },
          ]}
          rows={merchantRules}
          rowKey={(r) => r.id}
        />
      </Card>
    </div>
  );
};
