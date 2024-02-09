import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import { RecurringRuleRecord, TransactionRecord } from '../db/schema';
import { advanceDueDate, buildMonthlyCalendarGrid, CalendarDayCell } from '../../utils/date';
import { NotFoundError } from '../../utils/errors';

export const CreateRecurringRuleSchema = z.object({
  title: z.string().trim().min(2, 'Recurring rule title is required.').max(100),
  merchant: z.string().trim().min(2, 'Merchant name is required.').max(100),
  accountId: z.string().min(1, 'Account is required.'),
  categoryId: z.string().min(1, 'Category is required.'),
  type: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  amountCents: z.number().int().positive('Amount must be positive cents.'),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next due date must be YYYY-MM-DD.'),
  autoPost: z.boolean().default(false),
});

export interface CalendarDayWithObligations extends CalendarDayCell {
  rulesDue: RecurringRuleRecord[];
  totalExpenseDueCents: number;
  totalIncomeDueCents: number;
}

export interface RecurringOverview {
  rules: RecurringRuleRecord[];
  activeExpenseMonthlyEquivalentCents: number;
  activeIncomeMonthlyEquivalentCents: number;
  upcomingDueCount: number;
  calendarCells: CalendarDayWithObligations[];
}

export function toMonthlyEquivalentCents(
  amountCents: number,
  frequency: RecurringRuleRecord['frequency']
): number {
  switch (frequency) {
    case 'WEEKLY':
      return Math.round((amountCents * 52) / 12);
    case 'BIWEEKLY':
      return Math.round((amountCents * 26) / 12);
    case 'QUARTERLY':
      return Math.round(amountCents / 3);
    case 'YEARLY':
      return Math.round(amountCents / 12);
    case 'MONTHLY':
    default:
      return amountCents;
  }
}

export class RecurringService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public getRecurringOverview(month = '2024-02'): RecurringOverview {
    const state = this.database.getStateRef();
    const rules = [...state.recurringRules].sort((a, b) =>
      a.nextDueDate.localeCompare(b.nextDueDate)
    );

    let activeExpenseMonthlyEquivalentCents = 0;
    let activeIncomeMonthlyEquivalentCents = 0;

    for (const rule of rules) {
      if (!rule.isActive) continue;
      const eq = toMonthlyEquivalentCents(rule.amountCents, rule.frequency);
      if (rule.type === 'EXPENSE') {
        activeExpenseMonthlyEquivalentCents += eq;
      } else {
        activeIncomeMonthlyEquivalentCents += eq;
      }
    }

    const baseGrid = buildMonthlyCalendarGrid(month);
    const calendarCells: CalendarDayWithObligations[] = baseGrid.map((cell) => {
      const rulesDue = rules.filter(
        (r) =>
          r.isActive &&
          (r.nextDueDate === cell.dateIso ||
            (cell.inCurrentMonth && r.frequency === 'MONTHLY' && r.dayOfMonth === cell.dayOfMonth))
      );
      const totalExpenseDueCents = rulesDue
        .filter((r) => r.type === 'EXPENSE')
        .reduce((acc, r) => acc + r.amountCents, 0);
      const totalIncomeDueCents = rulesDue
        .filter((r) => r.type === 'INCOME')
        .reduce((acc, r) => acc + r.amountCents, 0);

      return {
        ...cell,
        rulesDue,
        totalExpenseDueCents,
        totalIncomeDueCents,
      };
    });

    return {
      rules,
      activeExpenseMonthlyEquivalentCents,
      activeIncomeMonthlyEquivalentCents,
      upcomingDueCount: rules.filter((r) => r.isActive).length,
      calendarCells,
    };
  }

  public createRecurringRule(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): RecurringRuleRecord {
    const parsed = CreateRecurringRuleSchema.parse(rawInput);

    return this.database.transaction((draft) => {
      const rule: RecurringRuleRecord = {
        id: this.database.nextId('rec'),
        title: parsed.title,
        merchant: parsed.merchant,
        accountId: parsed.accountId,
        categoryId: parsed.categoryId,
        type: parsed.type,
        amountCents: parsed.amountCents,
        frequency: parsed.frequency,
        dayOfMonth: parsed.dayOfMonth,
        nextDueDate: parsed.nextDueDate,
        lastPostedDate: null,
        autoPost: parsed.autoPost,
        isActive: true,
      };
      draft.recurringRules.push(rule);

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'RECURRING_RULE_CREATED',
        entityType: 'RECURRING_RULE',
        entityId: rule.id,
        summary: `Scheduled ${rule.frequency} ${rule.type} "${rule.title}" (${rule.amountCents} cents).`,
        metadata: { frequency: rule.frequency, nextDueDate: rule.nextDueDate },
      });

      return rule;
    });
  }

  public postOccurrenceNow(
    ruleId: string,
    actorUserId = 'usr-owner-01'
  ): {
    transaction: TransactionRecord;
    updatedRule: RecurringRuleRecord;
  } {
    return this.database.transaction((draft) => {
      const rule = draft.recurringRules.find((r) => r.id === ruleId);
      if (!rule) {
        throw new NotFoundError('Recurring Rule', ruleId);
      }

      const postedDate = rule.nextDueDate;
      const tx: TransactionRecord = {
        id: this.database.nextId('tx-rec'),
        accountId: rule.accountId,
        transferAccountId: null,
        categoryId: rule.categoryId,
        type: rule.type,
        status: 'CLEARED',
        amountCents: rule.amountCents,
        merchant: rule.merchant,
        description: `Scheduled ${rule.frequency.toLowerCase()} occurrence: ${rule.title}`,
        occurredOn: postedDate,
        isSplit: false,
        splits: [],
        tagIds: ['tag-recurring'],
        recurringRuleId: rule.id,
        reconciledBatchId: null,
        createdByUserId: actorUserId,
        createdAt: `${postedDate}T09:15:00+05:00`,
      };

      draft.transactions.unshift(tx);
      rule.lastPostedDate = postedDate;
      rule.nextDueDate = advanceDueDate(postedDate, rule.frequency, rule.dayOfMonth);
      this.database.recomputeAllAccountBalances();

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'RECURRING_OCCURRENCE_POSTED',
        entityType: 'RECURRING_RULE',
        entityId: rule.id,
        summary: `Materialized occurrence for "${rule.title}" on ${postedDate}; next due ${rule.nextDueDate}.`,
        metadata: { transactionId: tx.id, postedDate, nextDueDate: rule.nextDueDate },
      });

      return {
        transaction: tx,
        updatedRule: { ...rule },
      };
    });
  }
}

export const recurringService = new RecurringService(db);
