import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import { CategoryRecord, MerchantRuleRecord, TagRecord } from '../db/schema';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters.').max(60),
  parentId: z.string().nullable().optional(),
  kind: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']).default('EXPENSE'),
  colorToken: z.enum(['teal', 'emerald', 'amber', 'rose', 'sky', 'violet', 'slate']).default('teal'),
  iconName: z.string().trim().min(2).max(40).default('shopping-cart'),
  monthlyTargetCents: z.number().int().nonnegative().default(0),
});

export const CreateTagSchema = z.object({
  name: z.string().trim().min(2, 'Tag name must be at least 2 characters.').max(40),
  colorToken: z.enum(['teal', 'emerald', 'amber', 'rose', 'sky', 'violet', 'slate']).default('teal'),
});

export const CreateMerchantRuleSchema = z.object({
  pattern: z.string().trim().min(2, 'Merchant pattern is required.').max(80),
  matchType: z.enum(['CONTAINS', 'EXACT', 'STARTS_WITH']).default('CONTAINS'),
  categoryId: z.string().min(1, 'Target category is required.'),
  defaultAccountId: z.string().nullable().optional(),
  autoTags: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(999).default(50),
});

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function doesRuleMatchMerchant(rule: MerchantRuleRecord, merchantName: string): boolean {
  if (!rule.isActive) return false;
  const hay = merchantName.trim().toLowerCase();
  const needle = rule.pattern.trim().toLowerCase();
  if (!needle) return false;

  if (rule.matchType === 'EXACT') {
    return hay === needle;
  }
  if (rule.matchType === 'STARTS_WITH') {
    return hay.startsWith(needle);
  }
  return hay.includes(needle);
}

export class CategoryService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public listCategories(kind?: CategoryRecord['kind']): CategoryRecord[] {
    const all = this.database.getStateRef().categories;
    return kind ? all.filter((c) => c.kind === kind) : [...all];
  }

  public listTags(): TagRecord[] {
    return [...this.database.getStateRef().tags];
  }

  public listMerchantRules(): MerchantRuleRecord[] {
    return [...this.database.getStateRef().merchantRules].sort((a, b) => a.priority - b.priority);
  }

  public createCategory(rawInput: unknown, actorUserId = 'usr-owner-01'): CategoryRecord {
    const parsed = CreateCategorySchema.parse(rawInput);
    const slug = toSlug(parsed.name);

    return this.database.transaction((draft) => {
      if (draft.categories.some((c) => c.slug === slug)) {
        throw new ConflictError(`A category with slug "${slug}" already exists.`);
      }
      const category: CategoryRecord = {
        id: this.database.nextId('cat'),
        parentId: parsed.parentId ?? null,
        name: parsed.name,
        slug,
        kind: parsed.kind,
        colorToken: parsed.colorToken,
        iconName: parsed.iconName,
        monthlyTargetCents: parsed.monthlyTargetCents,
        isSystem: false,
      };
      draft.categories.push(category);

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'CATEGORY_CREATED',
        entityType: 'CATEGORY',
        entityId: category.id,
        summary: `Created ${category.kind} category "${category.name}".`,
        metadata: { slug: category.slug, monthlyTargetCents: category.monthlyTargetCents },
      });

      return category;
    });
  }

  public deleteCategory(categoryId: string, fallbackCategoryId = 'cat-exp-groceries'): void {
    this.database.transaction((draft) => {
      const idx = draft.categories.findIndex((c) => c.id === categoryId);
      if (idx === -1) {
        throw new NotFoundError('Category', categoryId);
      }
      const target = draft.categories[idx];
      if (target.isSystem) {
        throw new ForbiddenError(`System category "${target.name}" cannot be deleted.`);
      }
      draft.categories.splice(idx, 1);

      for (const tx of draft.transactions) {
        if (tx.categoryId === categoryId) {
          tx.categoryId = fallbackCategoryId;
        }
      }
    });
  }

  public createTag(rawInput: unknown): TagRecord {
    const parsed = CreateTagSchema.parse(rawInput);
    return this.database.transaction((draft) => {
      if (draft.tags.some((t) => t.name.toLowerCase() === parsed.name.toLowerCase())) {
        throw new ConflictError(`Tag "${parsed.name}" already exists.`);
      }
      const tag: TagRecord = {
        id: this.database.nextId('tag'),
        name: parsed.name,
        colorToken: parsed.colorToken,
      };
      draft.tags.push(tag);
      return tag;
    });
  }

  public createMerchantRule(rawInput: unknown, actorUserId = 'usr-owner-01'): MerchantRuleRecord {
    const parsed = CreateMerchantRuleSchema.parse(rawInput);
    return this.database.transaction((draft) => {
      const cat = draft.categories.find((c) => c.id === parsed.categoryId);
      if (!cat) {
        throw new NotFoundError('Category', parsed.categoryId);
      }
      const rule: MerchantRuleRecord = {
        id: this.database.nextId('rule'),
        pattern: parsed.pattern,
        matchType: parsed.matchType,
        categoryId: parsed.categoryId,
        defaultAccountId: parsed.defaultAccountId ?? null,
        autoTags: parsed.autoTags,
        priority: parsed.priority,
        isActive: true,
      };
      draft.merchantRules.push(rule);

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'MERCHANT_RULE_CREATED',
        entityType: 'MERCHANT_RULE',
        entityId: rule.id,
        summary: `Created auto-rule "${rule.pattern}" -> "${cat.name}".`,
        metadata: { matchType: rule.matchType, priority: rule.priority },
      });

      return rule;
    });
  }

  public matchMerchant(merchantName: string): MerchantRuleRecord | null {
    const rules = this.listMerchantRules();
    for (const rule of rules) {
      if (doesRuleMatchMerchant(rule, merchantName)) {
        return rule;
      }
    }
    return null;
  }

  public applyMerchantRulesAcrossLedger(actorUserId = 'usr-owner-01'): {
    evaluatedCount: number;
    updatedCount: number;
  } {
    return this.database.transaction((draft) => {
      const rules = [...draft.merchantRules]
        .filter((r) => r.isActive)
        .sort((a, b) => a.priority - b.priority);
      let updatedCount = 0;

      for (const tx of draft.transactions) {
        if (tx.type === 'TRANSFER' || tx.isSplit) continue;
        for (const rule of rules) {
          if (doesRuleMatchMerchant(rule, tx.merchant)) {
            const changedCat = tx.categoryId !== rule.categoryId;
            tx.categoryId = rule.categoryId;
            const mergedTags = Array.from(new Set([...tx.tagIds, ...rule.autoTags]));
            const changedTags = mergedTags.length !== tx.tagIds.length;
            tx.tagIds = mergedTags;
            if (changedCat || changedTags) {
              updatedCount += 1;
            }
            break;
          }
        }
      }

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'MERCHANT_RULES_APPLIED',
        entityType: 'TRANSACTION_BATCH',
        entityId: 'ledger-auto-categorize',
        summary: `Applied ${rules.length} merchant rules; updated ${updatedCount} ledger transactions.`,
        metadata: { rulesCount: rules.length, updatedCount },
      });

      return {
        evaluatedCount: draft.transactions.length,
        updatedCount,
      };
    });
  }
}

export const categoryService = new CategoryService(db);
