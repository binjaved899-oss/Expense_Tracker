import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import {
  AuditLogRecord,
  DatabaseState,
  TransactionRecord,
  UserRecord,
  UserRole,
} from '../db/schema';
import { ValidationError } from '../../utils/errors';

export const CsvImportRowSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant: z.string().trim().min(1).max(160),
  description: z.string().trim().max(400).default(''),
  type: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  amountCents: z.number().int().positive().max(999_999_999),
  accountId: z.string().min(2),
  categoryId: z.string().min(2),
  status: z.enum(['CLEARED', 'PENDING', 'RECONCILED']).default('CLEARED'),
});

export interface CommandSearchResultItem {
  id: string;
  entityType: 'TRANSACTION' | 'ACCOUNT' | 'CATEGORY' | 'RECURRING';
  title: string;
  subtitle: string;
  amountCents: number | null;
  href: string;
}

export class SystemService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public searchGlobalCommandPalette(rawQuery: string, limit = 16): CommandSearchResultItem[] {
    const state = this.database.getStateRef();
    const needle = rawQuery.trim().toLowerCase();
    const matchesNeedle = (text: string) =>
      needle.length === 0 || text.toLowerCase().includes(needle);

    const results: CommandSearchResultItem[] = [];

    for (const tx of state.transactions) {
      if (matchesNeedle(`${tx.merchant} ${tx.description} ${tx.occurredOn}`)) {
        results.push({
          id: tx.id,
          entityType: 'TRANSACTION',
          title: tx.merchant,
          subtitle: `${tx.occurredOn} • ${tx.description || tx.type}`,
          amountCents: tx.type === 'EXPENSE' ? -tx.amountCents : tx.amountCents,
          href: '/transactions',
        });
      }
    }

    for (const acc of state.accounts) {
      if (matchesNeedle(`${acc.name} ${acc.institution} ${acc.accountNumberMasked}`)) {
        results.push({
          id: acc.id,
          entityType: 'ACCOUNT',
          title: acc.name,
          subtitle: `${acc.institution} • ${acc.accountNumberMasked}`,
          amountCents: acc.currentBalanceCents,
          href: '/accounts',
        });
      }
    }

    for (const cat of state.categories) {
      if (matchesNeedle(`${cat.name} ${cat.slug} ${cat.kind}`)) {
        results.push({
          id: cat.id,
          entityType: 'CATEGORY',
          title: cat.name,
          subtitle: `Category • ${cat.kind}`,
          amountCents: null,
          href: '/settings',
        });
      }
    }

    for (const rec of state.recurringRules) {
      if (matchesNeedle(`${rec.title} ${rec.merchant} ${rec.frequency}`)) {
        results.push({
          id: rec.id,
          entityType: 'RECURRING',
          title: rec.title,
          subtitle: `${rec.frequency} • Next due ${rec.nextDueDate}`,
          amountCents: rec.type === 'EXPENSE' ? -rec.amountCents : rec.amountCents,
          href: '/recurring',
        });
      }
    }

    return results.slice(0, limit);
  }

  public listAuditLogs(limit = 50): AuditLogRecord[] {
    return this.database.getStateRef().auditLogs.slice(0, limit);
  }

  public listHouseholdUsers(): Array<
    Pick<UserRecord, 'id' | 'email' | 'displayName' | 'role' | 'defaultCurrency' | 'createdAt'>
  > {
    return this.database.getStateRef().users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      defaultCurrency: u.defaultCurrency,
      createdAt: u.createdAt,
    }));
  }

  public updateUserRole(targetUserId: string, role: UserRole, actorUserId = 'usr-owner-01'): void {
    this.database.transaction((draft) => {
      const target = draft.users.find((u) => u.id === targetUserId);
      if (!target) {
        throw new ValidationError(`User "${targetUserId}" not found.`);
      }
      target.role = role;
      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'user.role_updated',
        entityType: 'user',
        entityId: target.id,
        summary: `Updated ${target.displayName} RBAC role to ${role}`,
        metadata: { newRole: role },
      });
    });
  }

  public exportTransactionsCsv(): string {
    const rows = this.database.getStateRef().transactions;
    const header = [
      'id',
      'occurredOn',
      'merchant',
      'description',
      'type',
      'amountCents',
      'accountId',
      'categoryId',
      'status',
    ].join(',');

    const escapeCsvField = (val: string | number | null): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = rows.map((row: TransactionRecord) =>
      [
        escapeCsvField(row.id),
        escapeCsvField(row.occurredOn),
        escapeCsvField(row.merchant),
        escapeCsvField(row.description),
        escapeCsvField(row.type),
        escapeCsvField(row.amountCents),
        escapeCsvField(row.accountId),
        escapeCsvField(row.categoryId),
        escapeCsvField(row.status),
      ].join(',')
    );

    return [header, ...lines].join('\n');
  }

  public importTransactionsCsv(
    csvText: string,
    actorUserId = 'usr-owner-01'
  ): {
    importedCount: number;
    skippedDuplicatesCount: number;
    errors: string[];
  } {
    const rawLines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length < 2) {
      throw new ValidationError('CSV payload must contain a header line and at least one data row.');
    }

    const headerCols = rawLines[0]!.split(',').map((col) => col.trim());
    const idxOccurredOn = headerCols.indexOf('occurredOn');
    const idxMerchant = headerCols.indexOf('merchant');
    const idxDescription = headerCols.indexOf('description');
    const idxType = headerCols.indexOf('type');
    const idxAmountCents = headerCols.indexOf('amountCents');
    const idxAccountId = headerCols.indexOf('accountId');
    const idxCategoryId = headerCols.indexOf('categoryId');

    if (
      idxOccurredOn === -1 ||
      idxMerchant === -1 ||
      idxAmountCents === -1 ||
      idxAccountId === -1 ||
      idxCategoryId === -1
    ) {
      throw new ValidationError(
        'CSV header must include occurredOn, merchant, amountCents, accountId, and categoryId columns.'
      );
    }

    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    const errors: string[] = [];

    this.database.transaction((draft) => {
      for (let i = 1; i < rawLines.length; i += 1) {
        const cols = rawLines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const rawType = ((idxType >= 0 ? cols[idxType] : 'EXPENSE') || 'EXPENSE').toUpperCase();
        const parsed = CsvImportRowSchema.safeParse({
          occurredOn: cols[idxOccurredOn] ?? '',
          merchant: cols[idxMerchant] ?? '',
          description: idxDescription >= 0 ? (cols[idxDescription] ?? '') : '',
          type: rawType === 'INCOME' ? 'INCOME' : 'EXPENSE',
          amountCents: Number(cols[idxAmountCents] ?? 0),
          accountId: cols[idxAccountId] ?? '',
          categoryId: cols[idxCategoryId] ?? '',
          status: 'CLEARED',
        });

        if (!parsed.success) {
          errors.push(`Row ${i + 1}: ${parsed.error.issues[0]?.message ?? 'Invalid row'}`);
          continue;
        }

        const data = parsed.data;
        const isDuplicate = draft.transactions.some(
          (t) =>
            t.occurredOn === data.occurredOn &&
            t.merchant.toLowerCase() === data.merchant.toLowerCase() &&
            t.amountCents === data.amountCents &&
            t.accountId === data.accountId
        );

        if (isDuplicate) {
          skippedDuplicatesCount += 1;
          continue;
        }

        const newTx: TransactionRecord = {
          id: this.database.nextId('tx-csv'),
          accountId: data.accountId,
          transferAccountId: null,
          categoryId: data.categoryId,
          type: data.type,
          status: data.status,
          amountCents: data.amountCents,
          merchant: data.merchant,
          description: data.description || 'CSV Batch Import',
          occurredOn: data.occurredOn,
          isSplit: false,
          splits: [],
          tagIds: [],
          recurringRuleId: null,
          reconciledBatchId: null,
          createdByUserId: actorUserId,
          createdAt: '2024-02-24T12:00:00+05:00',
        };

        draft.transactions.unshift(newTx);
        importedCount += 1;
      }

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'system.csv_import',
        entityType: 'transaction',
        entityId: 'batch',
        summary: `Imported ${importedCount} CSV ledger rows (${skippedDuplicatesCount} duplicates skipped)`,
        metadata: { importedCount, skippedDuplicatesCount },
      });
    });

    return { importedCount, skippedDuplicatesCount, errors };
  }

  public exportHouseholdJsonBundle(): DatabaseState {
    return this.database.getSnapshot();
  }

  public getSystemHealthSummary(): {
    status: 'ok';
    version: string;
    offlineMode: true;
    counts: {
      users: number;
      accounts: number;
      categories: number;
      transactions: number;
      auditLogs: number;
    };
  } {
    const state = this.database.getStateRef();
    return {
      status: 'ok',
      version: '2024.2.0',
      offlineMode: true,
      counts: {
        users: state.users.length,
        accounts: state.accounts.length,
        categories: state.categories.length,
        transactions: state.transactions.length,
        auditLogs: state.auditLogs.length,
      },
    };
  }

  public buildOpenApiSpec(): Record<string, unknown> {
    return {
      openapi: '3.0.3',
      info: {
        title: 'LedgerVault Expense Tracker API',
        version: '2024.2.0',
        description:
          'Local-first double-entry personal & household expense tracker REST API with integer-cent precision.',
      },
      paths: {
        '/api/v1/health': {
          get: {
            summary: 'Check ledger health and entity counts',
            responses: { '200': { description: 'Health status payload' } },
          },
        },
        '/api/v1/accounts': {
          get: { summary: 'List household accounts and net worth summary' },
          post: { summary: 'Create a new financial account' },
        },
        '/api/v1/transactions': {
          get: { summary: 'List filtered ledger transactions with split lines' },
          post: { summary: 'Record an expense, income, or transfer transaction' },
        },
        '/api/v1/budgets': {
          get: { summary: 'Evaluate monthly zero-based category budgets for YYYY-MM' },
          post: { summary: 'Upsert a monthly budget envelope target' },
        },
        '/api/v1/recurring': {
          get: { summary: 'List recurring subscriptions and upcoming calendar bills' },
        },
        '/api/v1/receipts': {
          get: { summary: 'List local receipts and reimbursement status' },
        },
        '/api/v1/analytics/overview': {
          get: { summary: 'Compute Executive Overview KPIs, cashflow series, and category shares' },
        },
        '/api/v1/system/search': {
          get: { summary: 'Unified Ctrl+K command search across ledger entities' },
        },
      },
    };
  }
}
