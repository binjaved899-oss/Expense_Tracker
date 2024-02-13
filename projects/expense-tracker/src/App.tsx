import React, { useEffect, useMemo, useState } from 'react';
import { TransactionalLedgerDatabase, db as defaultDb } from './server/db/client';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { AppShell, type NavItem } from './components/layout/AppShell';
import { CommandSearchModal } from './components/layout/CommandSearchModal';
import { OverviewScreen } from './screens/OverviewScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { BudgetsScreen } from './screens/BudgetsScreen';
import { RecurringScreen } from './screens/RecurringScreen';
import { ReceiptsScreen } from './screens/ReceiptsScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AccountService } from './server/services/account.service';
import { CategoryService } from './server/services/category.service';
import { TransactionService } from './server/services/transaction.service';
import { BudgetService } from './server/services/budget.service';
import { RecurringService } from './server/services/recurring.service';
import { ReceiptService } from './server/services/receipt.service';
import { AnalyticsService } from './server/services/analytics.service';
import { formatCents } from './utils/currency';

export interface AppProps {
  database?: TransactionalLedgerDatabase;
  initialPath?: string;
  actorUserId?: string;
}

export const App: React.FC<AppProps> = ({
  database = defaultDb,
  initialPath = '/',
  actorUserId = 'usr-owner-01',
}) => {
  const [activePath, setActivePath] = useState<string>(initialPath);
  const [activeMonth, setActiveMonth] = useState<string>('2024-02');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const accountService = useMemo(() => new AccountService(database), [database]);
  const categoryService = useMemo(() => new CategoryService(database), [database]);
  const transactionService = useMemo(() => new TransactionService(database), [database]);
  const budgetService = useMemo(() => new BudgetService(database), [database]);
  const recurringService = useMemo(() => new RecurringService(database), [database]);
  const receiptService = useMemo(() => new ReceiptService(database), [database]);
  const analyticsService = useMemo(() => new AnalyticsService(database), [database]);

  const bumpRefresh = () => setRefreshTick((t) => t + 1);

  const accountsData = useMemo(() => {
    void refreshTick;
    return accountService.listAccounts(false);
  }, [accountService, refreshTick]);

  const categories = useMemo(() => {
    void refreshTick;
    return categoryService.listCategories();
  }, [categoryService, refreshTick]);

  const tags = useMemo(() => {
    void refreshTick;
    return categoryService.listTags();
  }, [categoryService, refreshTick]);

  const allTransactions = useMemo(() => {
    void refreshTick;
    return database.getStateRef().transactions;
  }, [database, refreshTick]);

  const budgetReport = useMemo(() => {
    void refreshTick;
    return budgetService.getMonthlyBudgetReport(activeMonth);
  }, [budgetService, activeMonth, refreshTick]);

  const recurringOverview = useMemo(() => {
    void refreshTick;
    return recurringService.getRecurringOverview(activeMonth);
  }, [recurringService, activeMonth, refreshTick]);

  const receiptsSummary = useMemo(() => {
    void refreshTick;
    return receiptService.getReceiptsSummary('ALL');
  }, [receiptService, refreshTick]);

  const analyticsReport = useMemo(() => {
    void refreshTick;
    return analyticsService.getAnalyticsReport(activeMonth, 5);
  }, [analyticsService, activeMonth, refreshTick]);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview', href: '/', group: 'Overview' },
      {
        id: 'transactions',
        label: 'Transactions',
        href: '/transactions',
        group: 'Ledger',
        badgeCount: allTransactions.length,
      },
      {
        id: 'accounts',
        label: 'Accounts',
        href: '/accounts',
        group: 'Ledger',
        badgeCount: accountsData.accounts.length,
      },
      {
        id: 'budgets',
        label: 'Budgets',
        href: '/budgets',
        group: 'Planning',
        badgeCount: budgetReport.envelopes.length,
      },
      {
        id: 'recurring',
        label: 'Recurring Bills',
        href: '/recurring',
        group: 'Planning',
        badgeCount: recurringOverview.upcomingDueCount,
      },
      {
        id: 'receipts',
        label: 'Receipts & Claims',
        href: '/receipts',
        group: 'Ledger',
        badgeCount: receiptsSummary.items.length,
      },
      { id: 'analytics', label: 'Analytics', href: '/analytics', group: 'Insights' },
      { id: 'settings', label: 'Settings & Rules', href: '/settings', group: 'System' },
    ],
    [
      allTransactions.length,
      accountsData.accounts.length,
      budgetReport.envelopes.length,
      recurringOverview.upcomingDueCount,
      receiptsSummary.items.length,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider>
      <AppShell
        appName="Expense Tracker"
        navItems={navItems}
        activePath={activePath}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
        onNavigate={setActivePath}
        onOpenCommandSearch={() => setCommandPaletteOpen(true)}
        onOpenQuickAdd={() => setActivePath('/transactions')}
        netWorthSummary={{
          netWorthFormatted: formatCents(accountsData.summary.netWorthCents),
          monthlySavingsRatePct: analyticsReport.monthSavingsRatePct,
        }}
        currentUserName="Amina Tariq"
        currentUserRole="OWNER"
      >
        {activePath === '/' && (
          <OverviewScreen
            netWorth={accountsData.summary}
            analytics={analyticsReport}
            budgetReport={budgetReport}
            recentTransactions={allTransactions.slice(0, 6)}
            upcomingBills={recurringOverview.rules.slice(0, 4)}
            onNavigate={setActivePath}
            onOpenQuickAdd={() => setActivePath('/transactions')}
          />
        )}

        {activePath === '/transactions' && (
          <TransactionsScreen
            transactions={allTransactions}
            accounts={accountsData.accounts}
            categories={categories}
            tags={tags}
            activeMonth={activeMonth}
            onCreateTransaction={(input) => {
              transactionService.createTransaction(input, actorUserId);
              bumpRefresh();
            }}
            onUpdateSplits={(txId, splits) => {
              transactionService.updateTransactionSplits(txId, splits, actorUserId);
              bumpRefresh();
            }}
            onBulkUpdate={(input) => {
              transactionService.bulkUpdateTransactions(input, actorUserId);
              bumpRefresh();
            }}
            onDeleteTransaction={(txId) => {
              transactionService.deleteTransaction(txId);
              bumpRefresh();
            }}
          />
        )}

        {activePath === '/accounts' && (
          <AccountsScreen
            accounts={accountsData.accounts}
            summary={accountsData.summary}
            transactions={allTransactions}
            onCreateAccount={(input) => {
              accountService.createAccount(input, actorUserId);
              bumpRefresh();
            }}
            onTransferFunds={(input) => {
              accountService.transferBetweenAccounts(input, actorUserId);
              bumpRefresh();
            }}
            onReconcileStatement={(input) => {
              accountService.reconcileStatement(input, actorUserId);
              bumpRefresh();
            }}
          />
        )}

        {activePath === '/budgets' && (
          <BudgetsScreen
            report={budgetReport}
            categories={categories}
            onUpsertEnvelope={(input) => {
              budgetService.upsertBudgetEnvelope(input, actorUserId);
              bumpRefresh();
            }}
            onCopyPreviousMonth={(targetMonth) => {
              const res = budgetService.copyFromPreviousMonthWithRollover(targetMonth, actorUserId);
              bumpRefresh();
              return res;
            }}
          />
        )}

        {activePath === '/recurring' && (
          <RecurringScreen
            overview={recurringOverview}
            accounts={accountsData.accounts}
            categories={categories}
            activeMonth={activeMonth}
            onCreateRule={(input) => {
              recurringService.createRecurringRule(input, actorUserId);
              bumpRefresh();
            }}
            onPostOccurrenceNow={(ruleId) => {
              recurringService.postOccurrenceNow(ruleId, actorUserId);
              bumpRefresh();
            }}
          />
        )}

        {activePath === '/receipts' && (
          <ReceiptsScreen
            summary={receiptsSummary}
            transactions={allTransactions}
            categories={categories}
            onAddReceiptItem={(input) => {
              receiptService.addReceiptLineItem(input, actorUserId);
              bumpRefresh();
            }}
            onUpdateReimbursementStatus={(itemId, status) => {
              receiptService.updateReimbursementStatus(itemId, status, actorUserId);
              bumpRefresh();
            }}
          />
        )}

        {activePath === '/analytics' && <AnalyticsScreen report={analyticsReport} />}

        {activePath === '/settings' && (
          <SettingsScreen
            database={database}
            actorUserId={actorUserId}
            onDataMutated={bumpRefresh}
          />
        )}

        <CommandSearchModal
          database={database}
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={setActivePath}
        />
      </AppShell>
    </ThemeProvider>
  );
};
