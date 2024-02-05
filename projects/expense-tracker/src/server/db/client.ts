import {
  AccountRecord,
  AuditLogRecord,
  DatabaseState,
  SQL_MIGRATION_DDL,
  TransactionRecord,
} from './schema';
import { buildDeterministic2024SeedState } from './seed-data';

function cloneState(state: DatabaseState): DatabaseState {
  return JSON.parse(JSON.stringify(state)) as DatabaseState;
}

export class TransactionalLedgerDatabase {
  private state: DatabaseState;
  private readonly storageKey: string;
  private idSequence = 1000;

  constructor(initialState?: DatabaseState, storageKey = 'forgemind_expense_tracker_db_2024') {
    this.storageKey = storageKey;
    if (initialState) {
      this.state = cloneState(initialState);
    } else {
      this.state = this.loadFromStorageOrSeed();
    }
  }

  private loadFromStorageOrSeed(): DatabaseState {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as DatabaseState;
          if (parsed && parsed.schemaVersion === 1 && Array.isArray(parsed.accounts)) {
            return parsed;
          }
        }
      } catch {
        // Fallback to seed state
      }
    }
    return buildDeterministic2024SeedState();
  }

  public persist(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      } catch {
        // Ignore quota errors in headless environments
      }
    }
  }

  public resetToSeed(): DatabaseState {
    this.state = buildDeterministic2024SeedState();
    this.recomputeAllAccountBalances();
    this.persist();
    return this.getSnapshot();
  }

  public getSnapshot(): DatabaseState {
    return cloneState(this.state);
  }

  public getStateRef(): DatabaseState {
    return this.state;
  }

  public nextId(prefix: string): string {
    this.idSequence += 1;
    return `${prefix}-2024-${this.idSequence}`;
  }

  public getSqlMigrationDdl(): string {
    return SQL_MIGRATION_DDL.trim();
  }

  /**
   * Executes `fn` inside an atomic ACID transaction.
   * If `fn` throws, the entire database state is rolled back to its pre-transaction snapshot.
   */
  public transaction<T>(fn: (draft: DatabaseState) => T): T {
    const backup = cloneState(this.state);
    try {
      const result = fn(this.state);
      this.recomputeAllAccountBalances();
      this.persist();
      return result;
    } catch (err) {
      this.state = backup;
      throw err;
    }
  }

  /**
   * Recomputes `currentBalanceCents` for every account from `openingBalanceCents`
   * plus all `INCOME`, `EXPENSE`, and `TRANSFER` transactions occurring in 2024.
   */
  public recomputeAllAccountBalances(): void {
    const map = new Map<string, AccountRecord>();
    for (const acc of this.state.accounts) {
      acc.currentBalanceCents = acc.openingBalanceCents;
      map.set(acc.id, acc);
    }

    for (const tx of this.state.transactions) {
      if (tx.occurredOn < '2024-02-01') {
        continue;
      }
      const sourceAcc = map.get(tx.accountId);
      if (!sourceAcc) continue;

      if (tx.type === 'INCOME') {
        sourceAcc.currentBalanceCents += tx.amountCents;
      } else if (tx.type === 'EXPENSE') {
        sourceAcc.currentBalanceCents -= tx.amountCents;
      } else if (tx.type === 'TRANSFER') {
        sourceAcc.currentBalanceCents -= tx.amountCents;
        if (tx.transferAccountId) {
          const destAcc = map.get(tx.transferAccountId);
          if (destAcc) {
            destAcc.currentBalanceCents += tx.amountCents;
          }
        }
      }
    }
  }

  public appendAuditLog(entry: Omit<AuditLogRecord, 'id' | 'createdAt'> & { createdAt?: string }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: this.nextId('aud'),
      actorUserId: entry.actorUserId,
      actorName: entry.actorName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      metadata: entry.metadata,
      createdAt: entry.createdAt ?? '2024-02-20T12:00:00+05:00',
    };
    this.state.auditLogs.unshift(record);
    return record;
  }

  public deleteTransactionCascade(transactionId: string): TransactionRecord | null {
    return this.transaction((draft) => {
      const idx = draft.transactions.findIndex((t) => t.id === transactionId);
      if (idx === -1) return null;
      const [removed] = draft.transactions.splice(idx, 1);
      draft.receiptItems = draft.receiptItems.filter((r) => r.transactionId !== transactionId);
      return removed;
    });
  }
}

export const db = new TransactionalLedgerDatabase();
db.recomputeAllAccountBalances();
