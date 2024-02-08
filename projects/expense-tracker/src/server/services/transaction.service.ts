import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import {
  ReimbursementStatus,
  TransactionRecord,
  TransactionSplitRecord,
  TransactionStatus,
  TransactionType,
} from '../db/schema';
import { AppError, NotFoundError } from '../../utils/errors';
import { verifySplitSumMatchesTotal } from '../../utils/currency';
import { doesRuleMatchMerchant } from './category.service';

export const SplitItemInputSchema = z.object({
  categoryId: z.string().min(1, 'Split category is required.'),
  amountCents: z.number().int().positive('Split amount must be positive cents.'),
  memo: z.string().trim().max(140).default(''),
  reimbursementStatus: z.enum(['NONE', 'PENDING', 'SUBMITTED', 'REIMBURSED']).default('NONE'),
  sharedWithPerson: z.string().trim().nullable().optional(),
});

export const CreateTransactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required.'),
  categoryId: z.string().min(1, 'Category is required.'),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']).default('EXPENSE'),
  status: z.enum(['CLEARED', 'PENDING', 'RECONCILED']).default('CLEARED'),
  amountCents: z.number().int().positive('Transaction amount must be positive cents.'),
  merchant: z.string().trim().min(2, 'Merchant name is required.').max(100),
  description: z.string().trim().max(240).default(''),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  tagIds: z.array(z.string()).default([]),
  isSplit: z.boolean().default(false),
  splits: z.array(SplitItemInputSchema).default([]),
});

export const BulkTransactionUpdateSchema = z.object({
  transactionIds: z.array(z.string().min(1)).min(1, 'Select at least one transaction.'),
  categoryId: z.string().min(1).optional(),
  status: z.enum(['CLEARED', 'PENDING', 'RECONCILED']).optional(),
  addTagId: z.string().min(1).optional(),
});

export interface TransactionFilterQuery {
  month?: string;
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType | 'ALL';
  status?: TransactionStatus | 'ALL';
  onlySplits?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTransactionsResult {
  items: TransactionRecord[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filteredIncomeCents: number;
  filteredExpenseCents: number;
  filteredNetCents: number;
}

export class TransactionService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public queryTransactions(query: TransactionFilterQuery = {}): PaginatedTransactionsResult {
    const state = this.database.getStateRef();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 12));
    const searchNeedle = (query.search ?? '').trim().toLowerCase();

    const filtered = state.transactions
      .filter((tx) => {
        if (query.month && !tx.occurredOn.startsWith(query.month)) return false;
        if (query.accountId && query.accountId !== 'ALL' && tx.accountId !== query.accountId) {
          return false;
        }
        if (query.categoryId && query.categoryId !== 'ALL') {
          const matchesPrimary = tx.categoryId === query.categoryId;
          const matchesSplit =
            tx.isSplit && tx.splits.some((s) => s.categoryId === query.categoryId);
          if (!matchesPrimary && !matchesSplit) return false;
        }
        if (query.type && query.type !== 'ALL' && tx.type !== query.type) return false;
        if (query.status && query.status !== 'ALL' && tx.status !== query.status) return false;
        if (query.onlySplits && !tx.isSplit) return false;
        if (searchNeedle) {
          const hay = `${tx.merchant} ${tx.description}`.toLowerCase();
          if (!hay.includes(searchNeedle)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.occurredOn !== b.occurredOn ? (a.occurredOn < b.occurredOn ? 1 : -1) : 0));

    let filteredIncomeCents = 0;
    let filteredExpenseCents = 0;
    for (const tx of filtered) {
      if (tx.type === 'INCOME') filteredIncomeCents += tx.amountCents;
      if (tx.type === 'EXPENSE') filteredExpenseCents += tx.amountCents;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clampedPage = Math.min(page, totalPages);
    const startIdx = (clampedPage - 1) * pageSize;
    const items = filtered.slice(startIdx, startIdx + pageSize);

    return {
      items,
      totalItems,
      page: clampedPage,
      pageSize,
      totalPages,
      filteredIncomeCents,
      filteredExpenseCents,
      filteredNetCents: filteredIncomeCents - filteredExpenseCents,
    };
  }

  public createTransaction(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): TransactionRecord {
    const parsed = CreateTransactionSchema.parse(rawInput);

    if (parsed.isSplit || parsed.splits.length > 0) {
      if (parsed.splits.length < 2) {
        throw new AppError(
          'SPLIT_MISMATCH',
          'A split transaction must contain at least 2 split lines.',
          400
        );
      }
      const check = verifySplitSumMatchesTotal(
        parsed.amountCents,
        parsed.splits.map((s) => s.amountCents)
      );
      if (!check.valid) {
        throw new AppError(
          'SPLIT_MISMATCH',
          `Split line sum (${check.sumCents} cents) does not equal total transaction amount (${parsed.amountCents} cents). Difference: ${check.differenceCents} cents.`,
          400,
          { totalCents: parsed.amountCents, sumCents: check.sumCents }
        );
      }
    }

    return this.database.transaction((draft) => {
      const account = draft.accounts.find((a) => a.id === parsed.accountId);
      if (!account) {
        throw new NotFoundError('Account', parsed.accountId);
      }

      let resolvedCategoryId = parsed.categoryId;
      let resolvedTags = [...parsed.tagIds];

      if (!parsed.isSplit) {
        const sortedRules = [...draft.merchantRules]
          .filter((r) => r.isActive)
          .sort((a, b) => a.priority - b.priority);
        for (const rule of sortedRules) {
          if (doesRuleMatchMerchant(rule, parsed.merchant)) {
            resolvedCategoryId = rule.categoryId;
            resolvedTags = Array.from(new Set([...resolvedTags, ...rule.autoTags]));
            break;
          }
        }
      }

      const txId = this.database.nextId('tx');
      const splits: TransactionSplitRecord[] = parsed.isSplit
        ? parsed.splits.map((s) => ({
            id: this.database.nextId('spl'),
            transactionId: txId,
            categoryId: s.categoryId,
            amountCents: s.amountCents,
            memo: s.memo,
            reimbursementStatus: s.reimbursementStatus as ReimbursementStatus,
            sharedWithPerson: s.sharedWithPerson ?? null,
          }))
        : [];

      const record: TransactionRecord = {
        id: txId,
        accountId: parsed.accountId,
        transferAccountId: null,
        categoryId: resolvedCategoryId,
        type: parsed.type,
        status: parsed.status,
        amountCents: parsed.amountCents,
        merchant: parsed.merchant,
        description: parsed.description || `${parsed.type} at ${parsed.merchant}`,
        occurredOn: parsed.occurredOn,
        isSplit: parsed.isSplit && splits.length >= 2,
        splits,
        tagIds: resolvedTags,
        recurringRuleId: null,
        reconciledBatchId: null,
        createdByUserId: actorUserId,
        createdAt: `${parsed.occurredOn}T12:00:00+05:00`,
      };

      draft.transactions.unshift(record);
      this.database.recomputeAllAccountBalances();

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'TRANSACTION_RECORDED',
        entityType: 'TRANSACTION',
        entityId: record.id,
        summary: `Recorded ${record.type} of ${record.amountCents} cents at "${record.merchant}".`,
        metadata: {
          accountId: record.accountId,
          categoryId: record.categoryId,
          isSplit: record.isSplit,
        },
      });

      return record;
    });
  }

  public updateTransactionSplits(
    transactionId: string,
    rawSplits: unknown[],
    actorUserId = 'usr-owner-01'
  ): TransactionRecord {
    const parsedSplits = z.array(SplitItemInputSchema).min(2).parse(rawSplits);

    return this.database.transaction((draft) => {
      const tx = draft.transactions.find((t) => t.id === transactionId);
      if (!tx) {
        throw new NotFoundError('Transaction', transactionId);
      }

      const check = verifySplitSumMatchesTotal(
        tx.amountCents,
        parsedSplits.map((s) => s.amountCents)
      );
      if (!check.valid) {
        throw new AppError(
          'SPLIT_MISMATCH',
          `Split line sum (${check.sumCents}) does not match transaction total (${tx.amountCents}).`,
          400
        );
      }

      tx.isSplit = true;
      tx.categoryId = parsedSplits[0].categoryId;
      tx.splits = parsedSplits.map((s) => ({
        id: this.database.nextId('spl'),
        transactionId: tx.id,
        categoryId: s.categoryId,
        amountCents: s.amountCents,
        memo: s.memo,
        reimbursementStatus: s.reimbursementStatus as ReimbursementStatus,
        sharedWithPerson: s.sharedWithPerson ?? null,
      }));

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'TRANSACTION_SPLITS_UPDATED',
        entityType: 'TRANSACTION',
        entityId: tx.id,
        summary: `Updated "${tx.merchant}" with ${tx.splits.length} split allocations.`,
        metadata: { splitCount: tx.splits.length },
      });

      return { ...tx, splits: [...tx.splits] };
    });
  }

  public bulkUpdateTransactions(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): { updatedCount: number } {
    const parsed = BulkTransactionUpdateSchema.parse(rawInput);

    return this.database.transaction((draft) => {
      let updatedCount = 0;
      for (const tx of draft.transactions) {
        if (!parsed.transactionIds.includes(tx.id)) continue;
        if (parsed.categoryId) tx.categoryId = parsed.categoryId;
        if (parsed.status) tx.status = parsed.status;
        if (parsed.addTagId && !tx.tagIds.includes(parsed.addTagId)) {
          tx.tagIds.push(parsed.addTagId);
        }
        updatedCount += 1;
      }

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'TRANSACTION_BULK_UPDATE',
        entityType: 'TRANSACTION_BATCH',
        entityId: `bulk-${updatedCount}`,
        summary: `Bulk-updated ${updatedCount} ledger transactions.`,
        metadata: parsed,
      });

      return { updatedCount };
    });
  }

  public deleteTransaction(transactionId: string): boolean {
    const removed = this.database.deleteTransactionCascade(transactionId);
    return Boolean(removed);
  }
}

export const transactionService = new TransactionService(db);
