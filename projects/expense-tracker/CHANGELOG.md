# Changelog

All notable changes to the **Expense Tracker** project are documented in this file.

## [1.0.0] - 2024-02-26

### Added
- **M01 — Primitives, Integer-Cent Math, Date Engine, Logger & Error Envelopes**:
  - Implemented 18 accessible UI primitives (`Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Card`, `Table`, `Modal`, `Drawer`, `Toast`, `Tabs`, `Breadcrumb`, `Pagination`, `EmptyState`, `SkeletonLoader`, `Avatar`, `Badge`).
  - Added integer-cent currency conversion, formatting, even penny-remainder splitting, and split-sum verification in `src/utils/currency.ts`.
  - Added 2024 calendar grid generation and recurring date advancement in `src/utils/date.ts`.
- **M02 — Database Schema, SQL Migrations, Transactional Engine & Deterministic 2024 Seed**:
  - Defined relational schema (`users`, `sessions`, `accounts`, `categories`, `tags`, `merchant_rules`, `transactions`, `transaction_splits`, `budgets`, `recurring_rules`, `receipt_items`, `audit_logs`) and ACID rollback engine (`TransactionalLedgerDatabase`).
- **M03 — Session Authentication, CSRF Protection, Rate Limiting & Household RBAC**:
  - Implemented password hashing, session validation, CSRF token verification, sliding-window rate limiting, and `OWNER` / `MEMBER` / `VIEWER` permission checks.
- **M04 — Financial Accounts, Double-Entry Transfers & Statement Reconciliation**:
  - Added `AccountService` and `AccountsScreen` supporting Checking, Savings, Credit Card, Cash, and Investment accounts with net worth computation and statement reconciliation.
- **M05 — Categories, Tags & Priority Merchant Auto-Categorization Rules**:
  - Added `CategoryService` and `CategoryRuleManager` with deterministic `CONTAINS`, `EXACT`, and `STARTS_WITH` merchant matching and batch rule application.
- **M06 — Transactions Ledger, Multi-Category Split Engine & Bulk Operations**:
  - Added `TransactionService` and `TransactionsScreen` with search, filtering, pagination, 2-way split drawer, and bulk category reassignment.
- **M07 — Monthly Budgets, Rollover Envelopes & Utilization Alerts**:
  - Added `BudgetService` and `BudgetsScreen` with effective rollover limits and `OK` / `WARNING_80` / `EXCEEDED_100` threshold tracking.
- **M08 — Recurring Bills, Subscriptions & 42-Cell Monthly Calendar**:
  - Added `RecurringService` and `RecurringScreen` with monthly equivalent normalization, calendar grid view, and immediate occurrence posting.
- **M09 — Receipts, Itemized Line Breakdown & Reimbursement Claims**:
  - Added `ReceiptService` and `ReceiptsScreen` for itemized receipt lines, reimbursement workflow transitions, and 50/50 shared expense calculations.
- **M10 — Financial Analytics, Custom SVG Charts & Executive Overview**:
  - Added `AnalyticsService`, `CashflowSvgCharts`, `OverviewScreen`, and `AnalyticsScreen`.
- **M11 — Global Command Search (`Ctrl+K`), CSV/JSON Portability, Audit Log & Fastify API**:
  - Added `SystemService`, `CommandSearchModal`, `SettingsScreen`, Fastify 4 REST API (`src/server/app.ts`), and full `App.tsx` integration.
- **M12 — Playwright 3-Breakpoint Visual & E2E Verification & Documentation**:
  - Added `tests/e2e/expense-tracker.spec.ts` verifying all 8 screens across `360x800`, `768x1024`, and `1440x900` viewports with zero horizontal overflow and zero console errors.
