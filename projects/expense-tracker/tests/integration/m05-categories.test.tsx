import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import { CategoryService, doesRuleMatchMerchant } from '../../src/server/services/category.service';
import { CategoryRuleManager } from '../../src/components/categories/CategoryRuleManager';

describe('M05: Categories, Tags, Merchant Auto-Rules & CategoryRuleManager', () => {
  it('creates custom categories, protects system categories from deletion, and creates tags', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new CategoryService(testDb);

    const created = service.createCategory({
      name: 'Books & Courses',
      kind: 'EXPENSE',
      colorToken: 'violet',
      iconName: 'briefcase',
      monthlyTargetCents: 12000,
    });
    expect(created.slug).toBe('books-courses');

    expect(() => service.deleteCategory('cat-exp-housing')).toThrow(/System category/);
    service.deleteCategory(created.id);
    expect(service.listCategories().some((c) => c.id === created.id)).toBe(false);

    const tag = service.createTag({ name: 'Q1 Audit', colorToken: 'emerald' });
    expect(tag.name).toBe('Q1 Audit');
  });

  it('matches merchant patterns by priority and applies rules across the ledger', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new CategoryService(testDb);

    const rule = service.createMerchantRule({
      pattern: 'Cedar & Saffron',
      matchType: 'STARTS_WITH',
      categoryId: 'cat-exp-dining',
      autoTags: ['tag-essential'],
      priority: 1,
    });

    expect(doesRuleMatchMerchant(rule, 'Cedar & Saffron Bistro')).toBe(true);
    expect(service.matchMerchant('Cedar & Saffron Bistro')?.id).toBe(rule.id);

    const applied = service.applyMerchantRulesAcrossLedger();
    expect(applied.evaluatedCount).toBeGreaterThan(10);
    expect(applied.updatedCount).toBeGreaterThanOrEqual(1);
  });

  it('renders CategoryRuleManager and submits new category and merchant rule forms', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new CategoryService(testDb);
    const onCreateCat = vi.fn();
    const onCreateRule = vi.fn();
    const onApply = vi.fn(() => ({ evaluatedCount: 20, updatedCount: 3 }));

    render(
      <CategoryRuleManager
        categories={service.listCategories()}
        tags={service.listTags()}
        merchantRules={service.listMerchantRules()}
        onCreateCategory={onCreateCat}
        onCreateMerchantRule={onCreateRule}
        onApplyRulesToLedger={onApply}
      />
    );

    fireEvent.change(screen.getByLabelText(/Category Name/i), {
      target: { value: 'Pet Care & Vet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    expect(onCreateCat).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText(/Merchant Keyword Pattern/i), {
      target: { value: 'Harbor Farmers' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Merchant Rule' }));
    expect(onCreateRule).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Run Rules on Ledger' }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
