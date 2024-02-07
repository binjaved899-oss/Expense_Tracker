import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import { AccountRecord, TransactionRecord } from '../db/schema';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

export const CreateAccountSchema = z.object({
  name: z.string().trim().min(2, 'Account name must be at least 2 characters.').max(80),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT']),
  currency: z.enum(['USD', 'EUR', 'GBP', 'PKR', 'CAD', 'AUD']).default('USD'),
  openingBalanceCents: z.number().int('Opening balance must be an integer in cents.'),
  creditLimitCents: z.number().int().positive().nullable().optional(),
  institution: z.string().trim().min(2, 'Institution name is required.').max(80),
  accountNumberMasked: z.string().trim().min(2, 'Account suffix is required.').max(24),
});

export const UpdateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  institution: z.string().trim().min(2).max(80).optional(),
  creditLimitCents: z.number().int().positive().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const TransferFundsSchema = z.object({
  fromAccountId: z.string().min(1, 'Source account is required.'),
  toAccountId: z.string().min(1, 'Destination account is required.'),
  amountCents: z.number().int().positive('Transfer amount must be greater than zero.'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  description: z.string().trim().min(2, 'Transfer memo is required.').max(160),
});

export const ReconcileAccountSchema = z.object({
  accountId: z.string().min(1),
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statementEndingBalanceCents: z.number().int(),
  transactionIdsToReconcile: z.array(z.string().min(1)),
});

export interface NetWorthSummary {
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  liquidCashCents: number;
  totalCreditLimitCents: number;
  creditUtilizationPct: number;
  activeAccountsCount: number;
}

export class AccountService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public listAccounts(includeArchived = false): {
    accounts: AccountRecord[];
    summary: NetWorthSummary;
  } {
    this.database.recomputeAllAccountBalances();
    const all = this.database.getStateRef().accounts;
    const accounts = includeArchived ? [...all] : all.filter((a) => !a.isArchived);
    return {
      accounts,
      summary: this.computeNetWorthSummary(accounts),
    };
  }

  public computeNetWorthSummary(accounts: AccountRecord[]): NetWorthSummary {
    let totalAssetsCents = 0;
    let totalLiabilitiesCents = 0;
    let liquidCashCents = 0;
    let totalCreditLimitCents = 0;
    let totalCreditUsedCents = 0;

    for (const acc of accounts) {
      if (acc.isArchived) continue;
      if (acc.type === 'CREDIT_CARD') {
        const debt = acc.currentBalanceCents < 0 ? Math.abs(acc.currentBalanceCents) : 0;
        totalLiabilitiesCents += debt;
        totalCreditUsedCents += debt;
        totalCreditLimitCents += acc.creditLimitCents ?? 0;
      } else {
        if (acc.currentBalanceCents >= 0) {
          totalAssetsCents += acc.currentBalanceCents;
        } else {
          totalLiabilitiesCents += Math.abs(acc.currentBalanceCents);
        }
        if (acc.type === 'CHECKING' || acc.type === 'SAVINGS' || acc.type === 'CASH') {
          liquidCashCents += Math.max(0, acc.currentBalanceCents);
        }
      }
    }

    const netWorthCents = totalAssetsCents - totalLiabilitiesCents;
    const creditUtilizationPct =
      totalCreditLimitCents > 0
        ? Number(((totalCreditUsedCents / totalCreditLimitCents) * 100).toFixed(1))
        : 0;

    return {
      totalAssetsCents,
      totalLiabilitiesCents,
      netWorthCents,
      liquidCashCents,
      totalCreditLimitCents,
      creditUtilizationPct,
      activeAccountsCount: accounts.filter((a) => !a.isArchived).length,
    };
  }

  public createAccount(rawInput: unknown, actorUserId = 'usr-owner-01'): AccountRecord {
    const parsed = CreateAccountSchema.parse(rawInput);
    return this.database.transaction((draft) => {
      const duplicate = draft.accounts.find(
        (a) => a.name.toLowerCase() === parsed.name.toLowerCase() && !a.isArchived
      );
      if (duplicate) {
        throw new ConflictError(`An active account named "${parsed.name}" already exists.`);
      }

      const account: AccountRecord = {
        id: this.database.nextId('acc'),
        userId: actorUserId,
        name: parsed.name,
        type: parsed.type,
        currency: parsed.currency,
        openingBalanceCents: parsed.openingBalanceCents,
        currentBalanceCents: parsed.openingBalanceCents,
        creditLimitCents:
          parsed.type === 'CREDIT_CARD' ? (parsed.creditLimitCents ?? 500000) : null,
        institution: parsed.institution,
        accountNumberMasked: parsed.accountNumberMasked,
        isArchived: false,
        lastReconciledAt: null,
        createdAt: '2024-02-15T10:00:00+05:00',
      };

      draft.accounts.push(account);
      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'ACCOUNT_CREATED',
        entityType: 'ACCOUNT',
        entityId: account.id,
        summary: `Created ${account.type} account "${account.name}" at ${account.institution}.`,
        metadata: { openingBalanceCents: account.openingBalanceCents },
      });

      return account;
    });
  }

  public updateAccount(
    accountId: string,
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): AccountRecord {
    const parsed = UpdateAccountSchema.parse(rawInput);
    return this.database.transaction((draft) => {
      const target = draft.accounts.find((a) => a.id === accountId);
      if (!target) {
        throw new NotFoundError('Account', accountId);
      }
      if (parsed.name !== undefined) target.name = parsed.name;
      if (parsed.institution !== undefined) target.institution = parsed.institution;
      if (parsed.creditLimitCents !== undefined) target.creditLimitCents = parsed.creditLimitCents;
      if (parsed.isArchived !== undefined) target.isArchived = parsed.isArchived;

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'ACCOUNT_UPDATED',
        entityType: 'ACCOUNT',
        entityId: target.id,
        summary: `Updated account "${target.name}" settings.`,
        metadata: parsed,
      });

      return { ...target };
    });
  }

  public transferBetweenAccounts(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): {
    transaction: TransactionRecord;
    fromAccount: AccountRecord;
    toAccount: AccountRecord;
  } {
    const parsed = TransferFundsSchema.parse(rawInput);
    if (parsed.fromAccountId === parsed.toAccountId) {
      throw new ValidationError('Source and destination accounts must be different.');
    }

    return this.database.transaction((draft) => {
      const fromAcc = draft.accounts.find((a) => a.id === parsed.fromAccountId);
      const toAcc = draft.accounts.find((a) => a.id === parsed.toAccountId);
      if (!fromAcc) throw new NotFoundError('Source Account', parsed.fromAccountId);
      if (!toAcc) throw new NotFoundError('Destination Account', parsed.toAccountId);

      const transferCategory =
        draft.categories.find((c) => c.kind === 'TRANSFER') ?? draft.categories[0];

      const transferTx: TransactionRecord = {
        id: this.database.nextId('tx-xfer'),
        accountId: fromAcc.id,
        transferAccountId: toAcc.id,
        categoryId: transferCategory.id,
        type: 'TRANSFER',
        status: 'CLEARED',
        amountCents: parsed.amountCents,
        merchant: `Transfer: ${fromAcc.name} -> ${toAcc.name}`,
        description: parsed.description,
        occurredOn: parsed.occurredOn,
        isSplit: false,
        splits: [],
        tagIds: [],
        recurringRuleId: null,
        reconciledBatchId: null,
        createdByUserId: actorUserId,
        createdAt: '2024-02-15T11:30:00+05:00',
      };

      draft.transactions.unshift(transferTx);
      this.database.recomputeAllAccountBalances();

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'INTER_ACCOUNT_TRANSFER',
        entityType: 'TRANSACTION',
        entityId: transferTx.id,
        summary: `Transferred ${parsed.amountCents} cents from "${fromAcc.name}" to "${toAcc.name}".`,
        metadata: {
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amountCents: parsed.amountCents,
        },
      });

      return {
        transaction: transferTx,
        fromAccount: { ...fromAcc },
        toAccount: { ...toAcc },
      };
    });
  }

  public reconcileStatement(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): {
    batchId: string;
    reconciledCount: number;
    account: AccountRecord;
    discrepancyCents: number;
  } {
    const parsed = ReconcileAccountSchema.parse(rawInput);
    return this.database.transaction((draft) => {
      const account = draft.accounts.find((a) => a.id === parsed.accountId);
      if (!account) {
        throw new NotFoundError('Account', parsed.accountId);
      }

      const batchId = `batch-${parsed.statementDate}-${this.database.nextId('rec')}`;
      let reconciledCount = 0;

      for (const tx of draft.transactions) {
        if (
          parsed.transactionIdsToReconcile.includes(tx.id) &&
          (tx.accountId === account.id || tx.transferAccountId === account.id)
        ) {
          tx.status = 'RECONCILED';
          tx.reconciledBatchId = batchId;
          reconciledCount += 1;
        }
      }

      account.lastReconciledAt = `${parsed.statementDate}T17:00:00+05:00`;
      this.database.recomputeAllAccountBalances();
      const discrepancyCents = parsed.statementEndingBalanceCents - account.currentBalanceCents;

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'ACCOUNT_STATEMENT_RECONCILED',
        entityType: 'ACCOUNT',
        entityId: account.id,
        summary: `Reconciled ${reconciledCount} transactions on "${account.name}" (batch ${batchId}).`,
        metadata: {
          batchId,
          reconciledCount,
          statementEndingBalanceCents: parsed.statementEndingBalanceCents,
          discrepancyCents,
        },
      });

      return {
        batchId,
        reconciledCount,
        account: { ...account },
        discrepancyCents,
      };
    });
  }
}

export const accountService = new AccountService(db);
