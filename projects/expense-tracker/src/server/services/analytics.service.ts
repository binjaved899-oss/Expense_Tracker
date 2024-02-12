import { TransactionalLedgerDatabase, db } from '../db/client';
import { computeSavingsRatePct, computeUtilizationPct } from '../../utils/currency';
import { getTrailingYearMonths } from '../../utils/date';
import { AccountService } from './account.service';
import { BudgetService } from './budget.service';

export interface MonthlyCashflowPoint {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  savingsRatePct: number;
}

export interface CategorySpendShare {
  categoryId: string;
  categoryName: string;
  colorToken: string;
  spentCents: number;
  sharePct: number;
  transactionCount: number;
}

export interface TopMerchantEntry {
  merchant: string;
  totalSpentCents: number;
  transactionCount: number;
  lastOccurredOn: string;
}

export interface AnalyticsDashboardReport {
  activeMonth: string;
  monthIncomeCents: number;
  monthExpenseCents: number;
  monthNetCents: number;
  monthSavingsRatePct: number;
  sixMonthSeries: MonthlyCashflowPoint[];
  categoryShares: CategorySpendShare[];
  topMerchants: TopMerchantEntry[];
}

export class AnalyticsService {
  private readonly database: TransactionalLedgerDatabase;
  private readonly accountService: AccountService;
  private readonly budgetService: BudgetService;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
    this.accountService = new AccountService(database);
    this.budgetService = new BudgetService(database);
  }

  public getAnalyticsReport(activeMonth = '2024-02', trailingMonths = 5): AnalyticsDashboardReport {
    const state = this.database.getStateRef();
    const months = getTrailingYearMonths(activeMonth, trailingMonths);

    const sixMonthSeries: MonthlyCashflowPoint[] = months.map((m) => {
      let incomeCents = 0;
      let expenseCents = 0;
      for (const tx of state.transactions) {
        if (!tx.occurredOn.startsWith(m)) continue;
        if (tx.type === 'INCOME') incomeCents += tx.amountCents;
        if (tx.type === 'EXPENSE') expenseCents += tx.amountCents;
      }
      return {
        month: m,
        incomeCents,
        expenseCents,
        netCents: incomeCents - expenseCents,
        savingsRatePct: computeSavingsRatePct(incomeCents, expenseCents),
      };
    });

    const currentPoint = sixMonthSeries.find((p) => p.month === activeMonth) ?? {
      month: activeMonth,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      savingsRatePct: 0,
    };

    const spentByCategory = this.budgetService.computeSpentByCategoryForMonth(activeMonth);
    const totalCatExpense = Array.from(spentByCategory.values()).reduce((a, b) => a + b, 0);

    const categoryShares: CategorySpendShare[] = [];
    for (const [catId, spentCents] of spentByCategory.entries()) {
      if (spentCents <= 0) continue;
      const cat = state.categories.find((c) => c.id === catId);
      const txCount = state.transactions.filter(
        (t) =>
          t.type === 'EXPENSE' &&
          t.occurredOn.startsWith(activeMonth) &&
          (t.categoryId === catId || t.splits.some((s) => s.categoryId === catId))
      ).length;

      categoryShares.push({
        categoryId: catId,
        categoryName: cat?.name ?? catId,
        colorToken: cat?.colorToken ?? 'teal',
        spentCents,
        sharePct: computeUtilizationPct(spentCents, Math.max(1, totalCatExpense)),
        transactionCount: txCount,
      });
    }
    categoryShares.sort((a, b) => b.spentCents - a.spentCents);

    const merchantMap = new Map<string, TopMerchantEntry>();
    for (const tx of state.transactions) {
      if (tx.type !== 'EXPENSE' || !tx.occurredOn.startsWith(activeMonth)) continue;
      const existing = merchantMap.get(tx.merchant);
      if (existing) {
        existing.totalSpentCents += tx.amountCents;
        existing.transactionCount += 1;
        if (tx.occurredOn > existing.lastOccurredOn) {
          existing.lastOccurredOn = tx.occurredOn;
        }
      } else {
        merchantMap.set(tx.merchant, {
          merchant: tx.merchant,
          totalSpentCents: tx.amountCents,
          transactionCount: 1,
          lastOccurredOn: tx.occurredOn,
        });
      }
    }

    const topMerchants = Array.from(merchantMap.values())
      .sort((a, b) => b.totalSpentCents - a.totalSpentCents)
      .slice(0, 6);

    return {
      activeMonth,
      monthIncomeCents: currentPoint.incomeCents,
      monthExpenseCents: currentPoint.expenseCents,
      monthNetCents: currentPoint.netCents,
      monthSavingsRatePct: currentPoint.savingsRatePct,
      sixMonthSeries,
      categoryShares,
      topMerchants,
    };
  }

  public getExecutiveSummary(activeMonth = '2024-02') {
    const { summary: netWorth } = this.accountService.listAccounts();
    const analytics = this.getAnalyticsReport(activeMonth, 5);
    const budgetReport = this.budgetService.getMonthlyBudgetReport(activeMonth);
    const recentTransactions = [...this.database.getStateRef().transactions]
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
      .slice(0, 6);
    const upcomingBills = [...this.database.getStateRef().recurringRules]
      .filter((r) => r.isActive && r.type === 'EXPENSE')
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .slice(0, 4);

    return {
      netWorth,
      analytics,
      budgetReport,
      recentTransactions,
      upcomingBills,
    };
  }
}

export const analyticsService = new AnalyticsService(db);
