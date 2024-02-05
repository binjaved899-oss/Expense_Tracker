import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type UserRole = 'OWNER' | 'MEMBER' | 'VIEWER';
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
export type CategoryKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type RuleMatchType = 'CONTAINS' | 'EXACT' | 'STARTS_WITH';
export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type TransactionStatus = 'CLEARED' | 'PENDING' | 'RECONCILED';
export type ReimbursementStatus = 'NONE' | 'PENDING' | 'SUBMITTED' | 'REIMBURSED';
export type RecurringFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  defaultCurrency: 'USD' | 'EUR' | 'GBP' | 'PKR' | 'CAD' | 'AUD';
  themePreference: 'light' | 'dark';
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  csrfToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface AccountRecord {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: 'USD' | 'EUR' | 'GBP' | 'PKR' | 'CAD' | 'AUD';
  openingBalanceCents: number;
  currentBalanceCents: number;
  creditLimitCents: number | null;
  institution: string;
  accountNumberMasked: string;
  isArchived: boolean;
  lastReconciledAt: string | null;
  createdAt: string;
}

export interface CategoryRecord {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: CategoryKind;
  colorToken: string;
  iconName: string;
  monthlyTargetCents: number;
  isSystem: boolean;
}

export interface TagRecord {
  id: string;
  name: string;
  colorToken: string;
}

export interface MerchantRuleRecord {
  id: string;
  pattern: string;
  matchType: RuleMatchType;
  categoryId: string;
  defaultAccountId: string | null;
  autoTags: string[];
  priority: number;
  isActive: boolean;
}

export interface TransactionSplitRecord {
  id: string;
  transactionId: string;
  categoryId: string;
  amountCents: number;
  memo: string;
  reimbursementStatus: ReimbursementStatus;
  sharedWithPerson: string | null;
}

export interface TransactionRecord {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: number;
  merchant: string;
  description: string;
  occurredOn: string;
  isSplit: boolean;
  splits: TransactionSplitRecord[];
  tagIds: string[];
  recurringRuleId: string | null;
  reconciledBatchId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface BudgetEnvelopeRecord {
  id: string;
  categoryId: string;
  month: string;
  limitCents: number;
  rolloverEnabled: boolean;
  carriedOverCents: number;
  alertThresholdPct: number;
  notes: string;
}

export interface RecurringRuleRecord {
  id: string;
  title: string;
  merchant: string;
  accountId: string;
  categoryId: string;
  type: 'EXPENSE' | 'INCOME';
  amountCents: number;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  nextDueDate: string;
  lastPostedDate: string | null;
  autoPost: boolean;
  isActive: boolean;
}

export interface ReceiptItemRecord {
  id: string;
  transactionId: string;
  merchantName: string;
  occurredOn: string;
  itemName: string;
  quantity: number;
  unitPriceCents: number;
  taxCents: number;
  totalCents: number;
  categoryId: string;
  reimbursementStatus: ReimbursementStatus;
  reimbursementClaimCode: string | null;
  sharedWithPerson: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DatabaseState {
  schemaVersion: number;
  users: UserRecord[];
  sessions: SessionRecord[];
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  tags: TagRecord[];
  merchantRules: MerchantRuleRecord[];
  transactions: TransactionRecord[];
  budgets: BudgetEnvelopeRecord[];
  recurringRules: RecurringRuleRecord[];
  receiptItems: ReceiptItemRecord[];
  auditLogs: AuditLogRecord[];
}

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  defaultCurrency: text('default_currency').notNull().default('USD'),
  themePreference: text('theme_preference').notNull().default('light'),
  createdAt: text('created_at').notNull(),
});

export const accountsTable = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  currency: text('currency').notNull().default('USD'),
  openingBalanceCents: integer('opening_balance_cents').notNull(),
  currentBalanceCents: integer('current_balance_cents').notNull(),
  creditLimitCents: integer('credit_limit_cents'),
  institution: text('institution').notNull(),
  accountNumberMasked: text('account_number_masked').notNull(),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  lastReconciledAt: text('last_reconciled_at'),
  createdAt: text('created_at').notNull(),
});

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  kind: text('kind').notNull(),
  colorToken: text('color_token').notNull(),
  iconName: text('icon_name').notNull(),
  monthlyTargetCents: integer('monthly_target_cents').notNull().default(0),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
});

export const transactionsTable = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  transferAccountId: text('transfer_account_id'),
  categoryId: text('category_id').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  amountCents: integer('amount_cents').notNull(),
  merchant: text('merchant').notNull(),
  description: text('description').notNull(),
  occurredOn: text('occurred_on').notNull(),
  isSplit: integer('is_split', { mode: 'boolean' }).notNull().default(false),
  recurringRuleId: text('recurring_rule_id'),
  reconciledBatchId: text('reconciled_batch_id'),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const SQL_MIGRATION_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MEMBER', 'VIEWER')),
  default_currency TEXT NOT NULL DEFAULT 'USD',
  theme_preference TEXT NOT NULL DEFAULT 'light',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT')),
  currency TEXT NOT NULL DEFAULT 'USD',
  opening_balance_cents INTEGER NOT NULL,
  current_balance_cents INTEGER NOT NULL,
  credit_limit_cents INTEGER,
  institution TEXT NOT NULL,
  account_number_masked TEXT NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  last_reconciled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('EXPENSE', 'INCOME', 'TRANSFER')),
  color_token TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  monthly_target_cents INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  transfer_account_id TEXT REFERENCES accounts(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
  status TEXT NOT NULL CHECK (status IN ('CLEARED', 'PENDING', 'RECONCILED')),
  amount_cents INTEGER NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  is_split INTEGER NOT NULL DEFAULT 0,
  recurring_rule_id TEXT,
  reconciled_batch_id TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
`;
