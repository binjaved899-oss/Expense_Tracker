import Fastify, { type FastifyInstance } from 'fastify';
import { TransactionalLedgerDatabase, db } from './db/client';
import { AuthService } from './auth/auth.service';
import { AccountService } from './services/account.service';
import { CategoryService } from './services/category.service';
import { TransactionService } from './services/transaction.service';
import { BudgetService } from './services/budget.service';
import { RecurringService } from './services/recurring.service';
import { ReceiptService } from './services/receipt.service';
import { AnalyticsService } from './services/analytics.service';
import { SystemService } from './services/system.service';
import { toErrorEnvelope } from '../utils/errors';

export interface BuildServerOptions {
  database?: TransactionalLedgerDatabase;
  defaultUserId?: string;
}

export function buildApiServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const database = options.database ?? db;
  const actorUserId = options.defaultUserId ?? 'usr-owner-01';

  const authService = new AuthService(database);
  const accountService = new AccountService(database);
  const categoryService = new CategoryService(database);
  const transactionService = new TransactionService(database);
  const budgetService = new BudgetService(database);
  const recurringService = new RecurringService(database);
  const receiptService = new ReceiptService(database);
  const analyticsService = new AnalyticsService(database);
  const systemService = new SystemService(database);

  app.setErrorHandler((err, _request, reply) => {
    const { statusCode, body } = toErrorEnvelope(err);
    void reply.status(statusCode).send(body);
  });

  app.get('/api/v1/health', () => {
    return systemService.getSystemHealthSummary();
  });

  app.get('/api/v1/openapi.json', () => {
    return systemService.buildOpenApiSpec();
  });

  app.post('/api/v1/auth/login', (request) => {
    return authService.login(request.body);
  });

  app.get('/api/v1/accounts', () => {
    return accountService.listAccounts(false);
  });

  app.post('/api/v1/accounts', (request) => {
    return accountService.createAccount(request.body, actorUserId);
  });

  app.get('/api/v1/categories', () => {
    return {
      categories: categoryService.listCategories(),
      tags: categoryService.listTags(),
      rules: categoryService.listMerchantRules(),
    };
  });

  app.get('/api/v1/transactions', (request) => {
    const q = request.query as Record<string, string | undefined>;
    return transactionService.queryTransactions({
      search: q.search,
      type: (q.type as 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER' | undefined) ?? 'ALL',
      accountId: q.accountId,
      categoryId: q.categoryId,
      month: q.month,
    });
  });

  app.post('/api/v1/transactions', (request) => {
    return transactionService.createTransaction(request.body, actorUserId);
  });

  app.get('/api/v1/budgets', (request) => {
    const q = request.query as { month?: string };
    return budgetService.getMonthlyBudgetReport(q.month ?? '2024-02');
  });

  app.post('/api/v1/budgets', (request) => {
    return budgetService.upsertBudgetEnvelope(request.body, actorUserId);
  });

  app.get('/api/v1/recurring', (request) => {
    const q = request.query as { month?: string };
    return recurringService.getRecurringOverview(q.month ?? '2024-02');
  });

  app.get('/api/v1/receipts', () => {
    return receiptService.getReceiptsSummary('ALL');
  });

  app.get('/api/v1/analytics/overview', (request) => {
    const q = request.query as { month?: string };
    return analyticsService.getAnalyticsReport(q.month ?? '2024-02');
  });

  app.get('/api/v1/system/search', (request) => {
    const q = request.query as { q?: string };
    return {
      items: systemService.searchGlobalCommandPalette(q.q ?? ''),
    };
  });

  app.get('/api/v1/system/export.csv', (_request, reply) => {
    const csv = systemService.exportTransactionsCsv();
    void reply.header('Content-Type', 'text/csv; charset=utf-8');
    return csv;
  });

  app.get('/api/v1/system/export.json', () => {
    return systemService.exportHouseholdJsonBundle();
  });

  return app;
}
