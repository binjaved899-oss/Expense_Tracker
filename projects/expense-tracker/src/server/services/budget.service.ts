import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import { BudgetEnvelopeRecord } from '../db/schema';
import { computeUtilizationPct, evaluateBudgetAlertState } from '../../utils/currency';
import { getPreviousYearMonth } from '../../utils/date';
import { NotFoundError } from '../../utils/errors';

export const UpsertBudgetEnvelopeSchema = z.object({
  categoryId: z.string().min(1, 'Category is required.'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM.'),
  limitCents: z.number().int().positive('Budget limit must be positive cents.'),
  rolloverEnabled: z.boolean().default(false),
  carriedOverCents: z.number().int().default(0),
  alertThresholdPct: z.number().int().min(50).max(100).default(80),
  notes: z.string().trim().max(200).default(''),
});

export interface ComputedBudgetEnvelope {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColorToken: string;
  categoryIconName: string;
  month: string;
  limitCents: number;
  rolloverEnabled: boolean;
  carriedOverCents: number;
  effectiveLimitCents: number;
  spentCents: number;
  remainingCents: number;
  utilizationPct: number;
  alertThresholdPct: number;
  alertState: 'OK' | 'WARNING_80' | 'EXCEEDED_100';
  notes: string;
}

export interface MonthlyBudgetReport {
  month: string;
  totalBaseLimitCents: number;
  totalEffectiveLimitCents: number;
  totalSpentCents: number;
  totalRemainingCents: number;
  overallUtilizationPct: number;
  warningCount: number;
  exceededCount: number;
  envelopes: ComputedBudgetEnvelope[];
}

export class BudgetService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public computeSpentByCategoryForMonth(month: string): Map<string, number> {
    const state = this.database.getStateRef();
    const spentMap = new Map<string, number>();

    for (const tx of state.transactions) {
      if (tx.type !== 'EXPENSE' || !tx.occurredOn.startsWith(month)) continue;
      if (tx.isSplit && tx.splits.length > 0) {
        for (const split of tx.splits) {
          spentMap.set(split.categoryId, (spentMap.get(split.categoryId) ?? 0) + split.amountCents);
        }
      } else {
        spentMap.set(tx.categoryId, (spentMap.get(tx.categoryId) ?? 0) + tx.amountCents);
      }
    }

    return spentMap;
  }

  public getMonthlyBudgetReport(month: string): MonthlyBudgetReport {
    const state = this.database.getStateRef();
    const spentMap = this.computeSpentByCategoryForMonth(month);
    const monthBudgets = state.budgets.filter((b) => b.month === month);

    const envelopes: ComputedBudgetEnvelope[] = monthBudgets.map((bdg) => {
      const cat = state.categories.find((c) => c.id === bdg.categoryId);
      const effectiveLimitCents =
        bdg.limitCents + (bdg.rolloverEnabled ? bdg.carriedOverCents : 0);
      const spentCents = spentMap.get(bdg.categoryId) ?? 0;
      const remainingCents = effectiveLimitCents - spentCents;
      const utilizationPct = computeUtilizationPct(spentCents, effectiveLimitCents);
      const alertState = evaluateBudgetAlertState(
        spentCents,
        effectiveLimitCents,
        bdg.alertThresholdPct
      );

      return {
        id: bdg.id,
        categoryId: bdg.categoryId,
        categoryName: cat?.name ?? bdg.categoryId,
        categoryColorToken: cat?.colorToken ?? 'teal',
        categoryIconName: cat?.iconName ?? 'shopping-cart',
        month: bdg.month,
        limitCents: bdg.limitCents,
        rolloverEnabled: bdg.rolloverEnabled,
        carriedOverCents: bdg.carriedOverCents,
        effectiveLimitCents,
        spentCents,
        remainingCents,
        utilizationPct,
        alertThresholdPct: bdg.alertThresholdPct,
        alertState,
        notes: bdg.notes,
      };
    });

    envelopes.sort((a, b) => b.utilizationPct - a.utilizationPct);

    const totalBaseLimitCents = envelopes.reduce((acc, e) => acc + e.limitCents, 0);
    const totalEffectiveLimitCents = envelopes.reduce((acc, e) => acc + e.effectiveLimitCents, 0);
    const totalSpentCents = envelopes.reduce((acc, e) => acc + e.spentCents, 0);
    const totalRemainingCents = totalEffectiveLimitCents - totalSpentCents;
    const overallUtilizationPct = computeUtilizationPct(
      totalSpentCents,
      totalEffectiveLimitCents
    );

    return {
      month,
      totalBaseLimitCents,
      totalEffectiveLimitCents,
      totalSpentCents,
      totalRemainingCents,
      overallUtilizationPct,
      warningCount: envelopes.filter((e) => e.alertState === 'WARNING_80').length,
      exceededCount: envelopes.filter((e) => e.alertState === 'EXCEEDED_100').length,
      envelopes,
    };
  }

  public upsertBudgetEnvelope(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): BudgetEnvelopeRecord {
    const parsed = UpsertBudgetEnvelopeSchema.parse(rawInput);

    return this.database.transaction((draft) => {
      const cat = draft.categories.find((c) => c.id === parsed.categoryId);
      if (!cat) {
        throw new NotFoundError('Category', parsed.categoryId);
      }

      const existing = draft.budgets.find(
        (b) => b.categoryId === parsed.categoryId && b.month === parsed.month
      );

      if (existing) {
        existing.limitCents = parsed.limitCents;
        existing.rolloverEnabled = parsed.rolloverEnabled;
        existing.carriedOverCents = parsed.carriedOverCents;
        existing.alertThresholdPct = parsed.alertThresholdPct;
        existing.notes = parsed.notes;

        this.database.appendAuditLog({
          actorUserId,
          actorName: 'Amina Tariq',
          action: 'BUDGET_ENVELOPE_UPDATED',
          entityType: 'BUDGET',
          entityId: existing.id,
          summary: `Updated ${parsed.month} budget for "${cat.name}" to ${parsed.limitCents} cents.`,
          metadata: parsed,
        });

        return { ...existing };
      }

      const created: BudgetEnvelopeRecord = {
        id: this.database.nextId('bdg'),
        categoryId: parsed.categoryId,
        month: parsed.month,
        limitCents: parsed.limitCents,
        rolloverEnabled: parsed.rolloverEnabled,
        carriedOverCents: parsed.carriedOverCents,
        alertThresholdPct: parsed.alertThresholdPct,
        notes: parsed.notes,
      };
      draft.budgets.push(created);

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'BUDGET_ENVELOPE_CREATED',
        entityType: 'BUDGET',
        entityId: created.id,
        summary: `Created ${parsed.month} budget envelope for "${cat.name}".`,
        metadata: parsed,
      });

      return created;
    });
  }

  public copyFromPreviousMonthWithRollover(
    targetMonth: string,
    actorUserId = 'usr-owner-01'
  ): { copiedCount: number } {
    const prevMonth = getPreviousYearMonth(targetMonth);
    const prevReport = this.getMonthlyBudgetReport(prevMonth);

    return this.database.transaction((draft) => {
      let copiedCount = 0;
      const sourceEnvelopes =
        prevReport.envelopes.length > 0
          ? prevReport.envelopes
          : this.getMonthlyBudgetReport('2024-02').envelopes;

      for (const env of sourceEnvelopes) {
        const alreadyExists = draft.budgets.some(
          (b) => b.categoryId === env.categoryId && b.month === targetMonth
        );
        if (alreadyExists) continue;

        const carriedOverCents = env.rolloverEnabled ? Math.max(0, env.remainingCents) : 0;
        draft.budgets.push({
          id: this.database.nextId('bdg'),
          categoryId: env.categoryId,
          month: targetMonth,
          limitCents: env.limitCents,
          rolloverEnabled: env.rolloverEnabled,
          carriedOverCents,
          alertThresholdPct: env.alertThresholdPct,
          notes: env.notes,
        });
        copiedCount += 1;
      }

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'BUDGET_ROLLOVER_COPIED',
        entityType: 'BUDGET_BATCH',
        entityId: targetMonth,
        summary: `Copied ${copiedCount} budget envelopes into ${targetMonth} with rollover calculation.`,
        metadata: { targetMonth, copiedCount },
      });

      return { copiedCount };
    });
  }
}

export const budgetService = new BudgetService(db);
