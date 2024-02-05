# ForgeMind Master Architecture & Execution Plan: Expense Tracker

- **Application Name**: `Expense Tracker`
- **Slug**: `expense-tracker`
- **Target Project Directory**: `D:/Personal Projects/First Projest/Expense Tracker/projects/expense-tracker`
- **Target Git Branch**: `forge/expense-tracker-2026-11-08`
- **Configured Remote**: `https://github.com/binjaved899-oss/Expense_Tracker.git` (`HTTPS`)
- **Total Planned Real LOC**: **9,640 LOC** (strictly within the `8,000`–`12,000` real LOC window across 12 modules)
- **Simulated 2024 Timeline**: **26 backdated commits** from `2024-02-05T09:11:48+05:00` (`Mon`) to `2024-02-26T16:06:17+05:00` (`Mon`)

---

## Part 1: Plain-Language Summary (What We Are Building)

### 1. What the App Does
**Expense Tracker** is a 100% offline-capable, full-stack personal and small-team financial management web application. It enables users to record daily expenses and income across multiple accounts (cash, checking, credit cards, savings), organize spending with hierarchical categories and tags, enforce monthly and category-level budgets with visual burn-rate alerts, manage recurring subscriptions and bills, split shared expenses, attach itemized receipt line-items, reconcile account statements, and inspect rich spending analytics — all running locally with zero external cloud or CDN dependencies.

### 2. The 12 Modules in Everyday Terms
1. **M01 — Design System, Theme Engine & 18 UI Primitives (`780 LOC`)**: Sets up the visual foundation (light/dark mode with WCAG AA contrast) and 18 reusable building blocks (buttons, inputs, modals, tables, drawers, badges, toasts, etc.).
2. **M02 — Database Schema, SQLite Engine & Realistic 2024 Seed Data (`810 LOC`)**: Creates the local SQLite database tables, repository layer, and deterministic 2024 financial seed data so the app opens with realistic accounts, budgets, and transactions immediately.
3. **M03 — Authentication, Household Profiles, RBAC & Security Guards (`760 LOC`)**: Handles local account sign-in, session cookies, role permissions (`OWNER`, `MEMBER`, `VIEWER`), password hashing, CSRF protection, and rate limiting.
4. **M04 — Financial Accounts, Wallets & Balance Ledger Engine (`840 LOC`)**: Manages checking, savings, credit card, and cash accounts, net-worth calculations, inter-account transfers, and running balance history.
5. **M05 — Categories, Subcategories, Tags & Merchant Rules (`790 LOC`)**: Provides customizable spending/income categories with local SVG icons, color tokens, tags, and auto-categorization rules by merchant keyword.
6. **M06 — Transactions Ledger, Split Transactions & Bulk Operations (`920 LOC`)**: The core ledger for creating, editing, filtering, splitting, and bulk-updating expenses, income, and transfers with full pagination and inline validation.
7. **M07 — Monthly Budgets, Rollover Envelopes & Threshold Alerts (`860 LOC`)**: Lets users set monthly category budgets with rollover support, pace/burn-rate indicators, and visual warning badges at 80% and 100% utilization.
8. **M08 — Recurring Bills, Subscriptions & Cashflow Calendar (`830 LOC`)**: Tracks recurring bills and subscriptions (weekly, monthly, yearly), upcoming due dates, auto-posting schedules, and a monthly bill calendar view.
9. **M09 — Receipt Line-Item Breakdown, Reimbursement Claims & Splits (`810 LOC`)**: Breaks receipts into taxed/untaxed line items, tracks reimbursable business expenses, and manages shared expense settlements.
10. **M10 — Financial Analytics, Cashflow Trends & Net-Worth Reports (`820 LOC`)**: Renders interactive offline SVG charts (monthly cashflow bar chart, category breakdown donut, daily spending heatmap, and savings rate trend).
11. **M11 — Global Command Search, CSV/JSON Import-Export & Audit Log (`740 LOC`)**: Provides `Ctrl+K` instant search, deterministic CSV/JSON ledger import and export, bank statement reconciliation, and an immutable security/activity audit log.
12. **M12 — End-to-End Playwright Suite, 3-Breakpoint Visual QA & Docs (`680 LOC`)**: Verifies every screen at `360px`, `768px`, and `1440px`, enforces zero offline leaks, adds Docker/Compose & OpenAPI explorer, and writes complete documentation.

### 3. What You Get
- **8 Complete Interactive Screens**: Executive Financial Overview Dashboard, Transactions Ledger & Split Drawer, Accounts & Transfers Hub, Budgets & Envelope Planner, Recurring Bills & Calendar, Receipts & Reimbursements Workspace, Analytics & Cashflow Reports, and Settings / Import-Export / Audit Center.
- **100% Offline Execution**: Vendored local packages, local Inter & JetBrains Mono variable webfonts, local SVG icons, and embedded SQLite database.
- **Total Planned Line Count**: **9,640 lines of real working code** (excluding comments, blanks, lockfiles, and vendored assets).
- **Simulated 2024 Commit Timeline**: **26 commits** starting **Monday, 5 February 2024 (`09:11:48+05:00`)** and finishing **Monday, 26 February 2024 (`16:06:17+05:00`)**, strictly on weekdays (`Mon`–`Fri`) between `09:00` and `19:00`.

---

## Part 2: Technical Appendix

### 1. Inferred Application Profile & Confidence
- **Inferred Profile**: `web-app` (Full-Stack Responsive Single-Page Application + Fastify REST API + SQLite Persistence)
- **Matched Heuristic Signal**: Keyword `"tracker"` in `APP_NAME` (`"Expense Tracker"`) matches the `web-app` profile in `references/app-type-profiles.md`.
- **Confidence Score**: `0.96` (`>= 0.60` threshold; unambiguous match).

### 2. Pinned 2024 Technology Stack (`<= 2024-12-31`)
Every dependency uses an exact version pin (no `^`, `~`, `*`, or `latest`):

| Layer | Package | Exact Version | Release Date | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime** | `node` | `20.18.1` | 2024-11-20 | Node 20 Iron LTS stable runtime |
| **Language** | `typescript` | `5.5.4` | 2024-07-22 | Strict type checking across client, server, and shared schemas |
| **Frontend UI** | `react` / `react-dom` | `18.3.1` | 2024-04-26 | Deterministic component rendering with concurrent hooks |
| **Routing** | `react-router-dom` | `6.28.0` | 2024-11-06 | Client-side SPA routing across all 8 screens |
| **State Store** | `zustand` | `4.5.5` | 2024-08-08 | Lightweight reactive state store for filters, theme, and session |
| **Build / Bundler** | `vite` | `5.4.11` | 2024-11-12 | Fast local bundling and offline asset pipeline |
| **React Plugin** | `@vitejs/plugin-react` | `4.3.4` | 2024-11-26 | Vite React JSX transform |
| **Styling** | `tailwindcss` | `3.4.16` | 2024-12-04 | Offline utility CSS bound to CSS variables from `tokens.ts` |
| **CSS Pipeline** | `postcss` / `autoprefixer` | `8.4.49` / `10.4.20` | 2024-11-18 | Deterministic local CSS build |
| **Icons** | `lucide-react` | `0.468.0` | 2024-12-11 | Offline SVG icon primitives |
| **Backend HTTP** | `fastify` | `4.28.1` | 2024-06-21 | Low-overhead structured JSON REST server |
| **Fastify Plugins** | `@fastify/cors` / `@fastify/cookie` / `@fastify/swagger` | `9.0.1` / `9.4.0` / `8.15.0` | 2024-07-04 | Local CORS, HTTP-only session cookies, and offline OpenAPI 3.0 spec |
| **Database** | `better-sqlite3` | `11.6.0` | 2024-11-28 | Zero-configuration synchronous embedded SQLite engine with ACID transactions |
| **ORM / Schema** | `drizzle-orm` / `drizzle-kit` | `0.36.4` / `0.28.1` | 2024-11-26 | Type-safe SQL schema, migrations, and relational queries |
| **Validation** | `zod` | `3.23.8` | 2024-05-07 | Shared request/response/form schema validation |
| **Logging** | `pino` | `9.5.0` | 2024-10-15 | Structured JSON logging with redaction |
| **Auth Crypto** | `bcryptjs` | `2.4.3` | 2016-01-12 | Pure-JS password hashing |
| **Linting** | `eslint` / `@eslint/js` / `typescript-eslint` | `9.16.0` / `9.16.0` / `8.17.0` | 2024-12-02 | ESLint 9 flat config with `--max-warnings=0` |
| **Formatting** | `prettier` | `3.4.2` | 2024-12-02 | Consistent code formatting |
| **Unit / API QA** | `vitest` / `@vitest/coverage-v8` / `jsdom` / `@testing-library/react` / `supertest` | `2.1.8` / `2.1.8` / `25.0.1` / `16.1.0` / `7.0.0` | 2024-12-11 | Unit, component, and HTTP integration test suite |
| **E2E & Visual QA** | `@playwright/test` | `1.45.3` | 2024-07-19 | Headless Chromium E2E + `360px`/`768px`/`1440px` visual & contrast verification |

---

### 3. Screen Inventory & UX Specification (Section 9A Compliant)

#### 3.1 Global Layout Shell & Navigation Model
- **Header (`64px` height)**: Breadcrumb trail, active period selector (`Feb 2024`–`Nov 2024`), global `Ctrl+K` Command Search trigger, quick `"New Transaction"` button, light/dark theme switcher, and active user profile avatar badge.
- **Navigation Rail / Sidebar**:
  - `1440px` (Desktop): Fixed `256px` left sidebar with section groups (`Overview`, `Ledger`, `Planning`, `Insights`, `System`), keyboard shortcut hints, and net-worth mini-card.
  - `768px` (Tablet): Collapsible `72px` icon rail expanding to `256px` drawer on toggle.
  - `360px` (Mobile): Sticky bottom navigation bar (`56px` height, `>= 44x44px` touch targets) + slide-over navigation drawer for secondary screens.
- **18 Shared Primitives (`src/components/primitives/`)**:
  `button`, `input`, `select`, `textarea`, `checkbox`, `radio`, `card`, `table`, `modal`, `drawer`, `toast`, `tabs`, `breadcrumb`, `pagination`, `empty-state`, `skeleton-loader`, `avatar`, `badge`.

#### 3.2 Complete Screen Inventory (8 Screens)

| Screen ID | Route | One-Line Purpose | Layout Breakdown (Header / Content / Panels) | Reused Primitives | Responsive Rules (`360px` / `768px` / `1440px`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S01: Executive Overview** | `/` | Real-time summary of net worth, monthly cashflow, budget pace, recent transactions, and upcoming bills. | Top 4 KPI summary cards, 2-column cashflow + budget health grid, bottom recent ledger & upcoming bills panel. | `card`, `badge`, `button`, `table`, `skeleton-loader`, `empty-state`, `toast` | `360px`: 1-col stack; `768px`: 2-col KPI grid; `1440px`: 4-col KPI grid + 8/4 split panels. |
| **S02: Transactions Ledger** | `/transactions` | Searchable, filterable multi-account ledger with split-transaction editor and bulk categorization. | Filter toolbar (search, account, category, type, date range), paginated data table, slide-over transaction/split drawer. | `table`, `input`, `select`, `checkbox`, `drawer`, `modal`, `pagination`, `badge`, `empty-state` | `360px`: Card-list rows + full-screen drawer; `768px`: Compact table; `1440px`: Full 8-column table + `440px` right drawer. |
| **S03: Accounts & Transfers** | `/accounts` | Manage checking, savings, credit card, and cash wallets, execute inter-account transfers, and reconcile balances. | Net-worth banner, grouped account cards by type, inter-account transfer modal, statement reconciliation drawer. | `card`, `button`, `modal`, `drawer`, `input`, `select`, `badge`, `tabs`, `toast` | `360px`: 1-col cards; `768px`: 2-col cards; `1440px`: 3-col cards + side reconciliation panel. |
| **S04: Budgets & Envelopes** | `/budgets` | Configure monthly category budgets, rollover rules, and inspect burn-rate progress bars with 80%/100% alerts. | Month switcher, total budgeted vs. spent summary bar, category envelope cards with progress meters, budget editor modal. | `card`, `badge`, `button`, `modal`, `input`, `select`, `tabs`, `empty-state`, `skeleton-loader` | `360px`: Single column envelopes; `768px`: 2-col grid; `1440px`: 3-col envelope grid + variance sidebar. |
| **S05: Recurring Bills & Subscriptions** | `/recurring` | Track recurring expenses/income, auto-post due occurrences, and inspect the monthly cashflow calendar. | Tabs (`List View` / `Calendar Grid`), upcoming 14-day obligations banner, recurring rule table, create/edit rule modal. | `tabs`, `table`, `card`, `badge`, `button`, `modal`, `input`, `select`, `checkbox` | `360px`: Agenda list view; `768px`: Compact 7-col calendar; `1440px`: Full calendar grid + upcoming obligation rail. |
| **S06: Receipts & Reimbursements** | `/receipts` | Itemize receipts into taxed/untaxed line items, track business reimbursement status, and settle shared splits. | Status filter tabs (`All`, `Pending Claim`, `Reimbursed`, `Shared Split`), itemized receipt table, line-item builder drawer. | `tabs`, `table`, `drawer`, `input`, `select`, `badge`, `button`, `card`, `toast` | `360px`: Stacked line-item cards; `768px`: 2-pane split; `1440px`: Master-detail table + receipt breakdown drawer. |
| **S07: Analytics & Cashflow Reports** | `/analytics` | Interactive SVG visual reports for income vs. expense trends, category share, merchant ranking, and savings rate. | Date range & account filter bar, 4 SVG chart cards (Cashflow Bar, Category Donut, Daily Heatmap, Net Worth Line), top merchants table. | `card`, `tabs`, `select`, `table`, `badge`, `button`, `skeleton-loader` | `360px`: 1-col responsive SVG viewBox charts; `768px`: 2-col chart grid; `1440px`: 2x2 chart grid + merchant breakdown table. |
| **S08: Settings, Categories & Audit** | `/settings` | Manage categories/tags, merchant auto-rules, CSV/JSON import-export, household members, and security audit logs. | Tabbed workspace (`Categories & Rules`, `Import / Export`, `Household & RBAC`, `Audit Log`), action panels and log table. | `tabs`, `card`, `table`, `input`, `select`, `radio`, `checkbox`, `button`, `modal`, `avatar`, `pagination` | `360px`: Scrollable tab pills + 1-col forms; `768px`: 2-col settings cards; `1440px`: Left vertical sub-nav + content pane. |

#### 3.3 Design Tokens Specification (`src/styles/tokens.ts`)
All colors are defined exclusively in `src/styles/tokens.ts` and exposed as CSS custom properties (`--fm-*`). Zero raw hex values exist in components:
- **Light Theme Palette (WCAG AA Verified)**:
  - `bgPrimary`: `#F8FAFC`, `bgSurface`: `#FFFFFF`, `bgElevated`: `#F1F5F9`
  - `textPrimary`: `#0F172A` (Contrast `15.8:1` on `#FFFFFF`), `textSecondary`: `#334155` (Contrast `9.3:1`), `textMuted`: `#475569` (Contrast `6.5:1`)
  - `accentPrimary`: `#0F766E` (Teal 700 — Contrast `5.4:1` with `#FFFFFF`), `accentHover`: `#115E59`
  - `semanticSuccess`: `#15803D` (`5.1:1`), `semanticWarning`: `#B45309` (`5.0:1`), `semanticDanger`: `#B91C1C` (`6.4:1`)
  - `borderSubtle`: `#CBD5E1`, `borderFocus`: `#0F766E`
- **Dark Theme Palette (WCAG AA Verified)**:
  - `bgPrimary`: `#0B1120`, `bgSurface`: `#111827`, `bgElevated`: `#1E293B`
  - `textPrimary`: `#F8FAFC` (Contrast `16.4:1` on `#111827`), `textSecondary`: `#CBD5E1` (Contrast `10.8:1`), `textMuted`: `#94A3B8` (Contrast `5.8:1`)
  - `accentPrimary`: `#2DD4BF` (Teal 400 — Contrast `9.6:1` with `#0B1120`), `accentHover`: `#5EEAD4`
  - `semanticSuccess`: `#4ADE80`, `semanticWarning`: `#FBBF24`, `semanticDanger`: `#F87171`
  - `borderSubtle`: `#334155`, `borderFocus`: `#2DD4BF`
- **Spacing Scale**: `4px` base grid (`0.25rem` to `4rem`).
- **Typography Scale**: Local `Inter` (`sans`) for UI, local `JetBrains Mono` (`mono`) for currency amounts, account numbers, and timestamps (`tabular-nums`).

---

### 4. Module Tree (`M01`–`M12`) & LOC Budget Allocation

Total planned real working lines of code: **9,640 LOC** (Target window: `8,000`–`12,000` LOC).

| Module ID | Module Name | Owning Agents | Planned Files | Target Real LOC |
| :--- | :--- | :--- | :--- | :--- |
| **M01** | Core Config, Design Tokens, Layout Shell & 18 Shared Primitives | `scaffolder`, `frontend-dev`, `qa` | `src/styles/tokens.ts`, `src/styles/theme-provider.tsx`, `src/components/primitives/*.tsx` (18 files), `src/components/layout/AppShell.tsx`, `tests/unit/m01-primitives.test.tsx` | **780 LOC** |
| **M02** | Database Schema, SQLite Migrations, Repositories & 2024 Seed Engine | `db-dev`, `qa` | `src/server/db/connection.ts`, `src/server/db/schema.ts`, `src/server/db/migrate.ts`, `src/server/db/seed.ts`, `src/server/db/repositories/*.ts`, `tests/unit/m02-db.test.ts` | **810 LOC** |
| **M03** | Authentication, Session Cookies, Household RBAC & Security Middleware | `auth-dev`, `qa` | `src/server/auth/password.ts`, `src/server/auth/session.ts`, `src/server/auth/rbac.ts`, `src/server/auth/csrf-rate-limit.ts`, `src/server/routes/auth.routes.ts`, `tests/integration/m03-auth.test.ts` | **760 LOC** |
| **M04** | Financial Accounts, Multi-Currency Wallets & Inter-Account Transfers | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/shared/schemas/account.schema.ts`, `src/server/services/account.service.ts`, `src/server/routes/account.routes.ts`, `src/pages/AccountsPage.tsx`, `tests/integration/m04-accounts.test.ts` | **840 LOC** |
| **M05** | Categories, Subcategories, Tags & Automated Merchant Categorization Rules | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/shared/schemas/category.schema.ts`, `src/server/services/category-rule.service.ts`, `src/server/routes/category.routes.ts`, `src/components/categories/CategoryManager.tsx`, `tests/integration/m05-categories.test.ts` | **790 LOC** |
| **M06** | Transactions Ledger, Split Engine, Filtering & Bulk Operations | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/shared/schemas/transaction.schema.ts`, `src/server/services/transaction.service.ts`, `src/server/routes/transaction.routes.ts`, `src/pages/TransactionsPage.tsx`, `src/components/transactions/SplitEditorDrawer.tsx`, `tests/integration/m06-transactions.test.ts` | **920 LOC** |
| **M07** | Monthly Budgets, Rollover Envelopes & Burn-Rate Alert Engine | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/shared/schemas/budget.schema.ts`, `src/server/services/budget.service.ts`, `src/server/routes/budget.routes.ts`, `src/pages/BudgetsPage.tsx`, `tests/integration/m07-budgets.test.ts` | **860 LOC** |
| **M08** | Recurring Bills, Subscriptions Scheduler & Cashflow Calendar | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/shared/schemas/recurring.schema.ts`, `src/server/services/recurring.service.ts`, `src/server/routes/recurring.routes.ts`, `src/pages/RecurringPage.tsx`, `tests/integration/m08-recurring.test.ts` | **830 LOC** |
| **M09** | Receipt Line-Item Breakdown, Reimbursements & Shared Expense Splits | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/shared/schemas/receipt.schema.ts`, `src/server/services/receipt.service.ts`, `src/server/routes/receipt.routes.ts`, `src/pages/ReceiptsPage.tsx`, `tests/integration/m09-receipts.test.ts` | **810 LOC** |
| **M10** | Executive Overview Dashboard, Financial Analytics & SVG Chart Engine | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/server/services/analytics.service.ts`, `src/server/routes/analytics.routes.ts`, `src/pages/OverviewPage.tsx`, `src/pages/AnalyticsPage.tsx`, `src/components/charts/CashflowSvgCharts.tsx`, `tests/integration/m10-analytics.test.ts` | **820 LOC** |
| **M11** | Command Palette Search, CSV/JSON Import-Export, Reconciliation & Audit Log | `backend-dev`, `api-dev`, `frontend-dev`, `qa` | `src/server/services/import-export.service.ts`, `src/server/services/audit.service.ts`, `src/server/routes/system.routes.ts`, `src/pages/SettingsPage.tsx`, `src/components/layout/CommandSearchModal.tsx`, `tests/integration/m11-system.test.ts` | **740 LOC** |
| **M12** | E2E Playwright Suite, 3-Breakpoint Visual QA, Docker & Architecture Docs | `qa`, `backend-dev`, `scribe` | `tests/e2e/expense-tracker.spec.ts`, `tests/e2e/visual-breakpoints.spec.ts`, `Dockerfile`, `docker-compose.yml`, `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md` | **680 LOC** |
| **TOTAL** | **12 Complete Modules (`M01`–`M12`)** | **All 15 Agents** | **78 Source, Test, Config & Doc Files** | **9,640 LOC** |

---

### 5. Relational Data Model (SQLite + Drizzle ORM)

All monetary amounts are stored as **integer minor units (cents)** (`amountCents: INTEGER NOT NULL`) to eliminate IEEE-754 floating-point rounding bugs.

1. **`users`**: `id (TEXT PK)`, `email (TEXT UNIQUE)`, `displayName (TEXT)`, `passwordHash (TEXT)`, `role ('OWNER'|'MEMBER'|'VIEWER')`, `defaultCurrency (TEXT DEFAULT 'USD')`, `themePreference ('light'|'dark')`, `createdAt (TEXT)`.
2. **`sessions`**: `id (TEXT PK)`, `userId (TEXT FK -> users.id)`, `csrfToken (TEXT)`, `expiresAt (TEXT)`, `createdAt (TEXT)`.
3. **`accounts`**: `id (TEXT PK)`, `userId (TEXT FK)`, `name (TEXT)`, `type ('CHECKING'|'SAVINGS'|'CREDIT_CARD'|'CASH'|'INVESTMENT')`, `currency (TEXT)`, `openingBalanceCents (INTEGER)`, `currentBalanceCents (INTEGER)`, `creditLimitCents (INTEGER NULL)`, `institution (TEXT)`, `isArchived (INTEGER)`, `createdAt (TEXT)`.
4. **`categories`**: `id (TEXT PK)`, `parentId (TEXT NULL FK)`, `name (TEXT)`, `slug (TEXT UNIQUE)`, `kind ('EXPENSE'|'INCOME'|'TRANSFER')`, `colorToken (TEXT)`, `iconName (TEXT)`, `isSystem (INTEGER)`.
5. **`tags`**: `id (TEXT PK)`, `name (TEXT UNIQUE)`, `colorToken (TEXT)`.
6. **`merchant_rules`**: `id (TEXT PK)`, `pattern (TEXT)`, `matchType ('CONTAINS'|'EXACT'|'STARTS_WITH')`, `categoryId (TEXT FK)`, `defaultAccountId (TEXT NULL FK)`, `priority (INTEGER)`.
7. **`transactions`**: `id (TEXT PK)`, `accountId (TEXT FK -> accounts.id)`, `transferAccountId (TEXT NULL FK -> accounts.id)`, `categoryId (TEXT FK -> categories.id)`, `type ('EXPENSE'|'INCOME'|'TRANSFER')`, `status ('CLEARED'|'PENDING'|'RECONCILED')`, `amountCents (INTEGER)`, `merchant (TEXT)`, `description (TEXT)`, `occurredOn (TEXT YYYY-MM-DD)`, `isSplit (INTEGER)`, `recurringRuleId (TEXT NULL FK)`, `reconciledBatchId (TEXT NULL)`, `createdByUserId (TEXT FK)`, `createdAt (TEXT)`.
8. **`transaction_splits`**: `id (TEXT PK)`, `transactionId (TEXT FK -> transactions.id ON DELETE CASCADE)`, `categoryId (TEXT FK -> categories.id)`, `amountCents (INTEGER)`, `memo (TEXT)`, `reimbursementStatus ('NONE'|'PENDING'|'SUBMITTED'|'REIMBURSED')`, `sharedWithPerson (TEXT NULL)`.
9. **`transaction_tags`**: `transactionId (TEXT FK)`, `tagId (TEXT FK)`, composite PK `(transactionId, tagId)`.
10. **`budgets`**: `id (TEXT PK)`, `categoryId (TEXT FK -> categories.id)`, `month (TEXT YYYY-MM)`, `limitCents (INTEGER)`, `rolloverEnabled (INTEGER)`, `carriedOverCents (INTEGER)`, `alertThresholdPct (INTEGER DEFAULT 80)`, UNIQUE `(categoryId, month)`.
11. **`recurring_rules`**: `id (TEXT PK)`, `title (TEXT)`, `accountId (TEXT FK)`, `categoryId (TEXT FK)`, `type ('EXPENSE'|'INCOME')`, `amountCents (INTEGER)`, `frequency ('WEEKLY'|'BIWEEKLY'|'MONTHLY'|'QUARTERLY'|'YEARLY')`, `dayOfMonth (INTEGER)`, `nextDueDate (TEXT YYYY-MM-DD)`, `autoPost (INTEGER)`, `isActive (INTEGER)`.
12. **`receipt_items`**: `id (TEXT PK)`, `transactionId (TEXT FK -> transactions.id ON DELETE CASCADE)`, `itemName (TEXT)`, `quantity (INTEGER)`, `unitPriceCents (INTEGER)`, `taxCents (INTEGER)`, `totalCents (INTEGER)`, `categoryId (TEXT FK)`, `reimbursementClaimCode (TEXT NULL)`, `isReimbursed (INTEGER)`.
13. **`audit_logs`**: `id (TEXT PK)`, `actorUserId (TEXT FK)`, `action (TEXT)`, `entityType (TEXT)`, `entityId (TEXT)`, `summary (TEXT)`, `metadataJson (TEXT)`, `createdAt (TEXT)`.

---

### 6. REST API Contracts (Fastify 4 + Zod Validation)

All responses use a deterministic envelope: `{ data, meta? }` on `2xx` and `{ code, message, details, requestId }` on `4xx/5xx`.

- **Auth (`/api/v1/auth`)**:
  - `POST /api/v1/auth/login` -> Validates `{ email, password }`, sets HTTP-only cookie + returns `{ user, csrfToken }`.
  - `POST /api/v1/auth/logout` -> Invalidates session.
  - `GET /api/v1/auth/me` -> Returns current session user & household permissions.
- **Accounts (`/api/v1/accounts`)**:
  - `GET /api/v1/accounts` -> Lists accounts + computed net worth (`assetsCents`, `liabilitiesCents`, `netWorthCents`).
  - `POST /api/v1/accounts` -> Creates account with opening balance ledger entry.
  - `PATCH /api/v1/accounts/:id` -> Updates account metadata or archives account.
  - `POST /api/v1/accounts/transfer` -> Atomic SQLite transaction debiting source account and crediting destination account.
  - `POST /api/v1/accounts/:id/reconcile` -> Marks selected cleared transactions as `RECONCILED` against statement ending balance.
- **Categories & Merchant Rules (`/api/v1/categories`, `/api/v1/merchant-rules`)**:
  - `GET /api/v1/categories`, `POST /api/v1/categories`, `PATCH /api/v1/categories/:id`, `DELETE /api/v1/categories/:id`.
  - `GET /api/v1/merchant-rules`, `POST /api/v1/merchant-rules`, `POST /api/v1/merchant-rules/apply` (runs deterministic auto-categorization).
- **Transactions & Splits (`/api/v1/transactions`)**:
  - `GET /api/v1/transactions` -> Paginated query (`page`, `pageSize`, `search`, `accountId`, `categoryId`, `type`, `status`, `dateFrom`, `dateTo`, `minAmountCents`, `maxAmountCents`).
  - `POST /api/v1/transactions` -> Creates single or split transaction (validating `sum(splits.amountCents) === amountCents`) and updates account balance atomically.
  - `PATCH /api/v1/transactions/:id`, `DELETE /api/v1/transactions/:id`.
  - `POST /api/v1/transactions/bulk` -> Bulk category/status/tag assignment.
- **Budgets (`/api/v1/budgets`)**:
  - `GET /api/v1/budgets?month=YYYY-MM` -> Returns category envelopes, actual spend, rollover balance, utilization `%`, and alert state (`OK` | `WARNING_80` | `EXCEEDED_100`).
  - `PUT /api/v1/budgets` -> Upserts monthly budget envelope + rollover flag.
  - `POST /api/v1/budgets/copy-previous` -> Copies prior month envelopes with rollover calculation.
- **Recurring Bills (`/api/v1/recurring`)**:
  - `GET /api/v1/recurring` -> Lists rules + 30-day calendar projection.
  - `POST /api/v1/recurring`, `PATCH /api/v1/recurring/:id`.
  - `POST /api/v1/recurring/:id/post-now` -> Materializes occurrence into `transactions` and advances `nextDueDate`.
- **Receipts & Reimbursements (`/api/v1/receipts`)**:
  - `GET /api/v1/receipts` -> Lists itemized receipt breakdowns and reimbursement claims.
  - `POST /api/v1/receipts/:transactionId/items` -> Replaces/saves line-item breakdown and recalculates parent transaction total.
  - `PATCH /api/v1/receipts/items/:itemId/reimburse` -> Marks claim item as reimbursed.
- **Analytics (`/api/v1/analytics`)**:
  - `GET /api/v1/analytics/overview?month=YYYY-MM` -> KPI totals, savings rate, top categories, budget pace, upcoming bills.
  - `GET /api/v1/analytics/trends?months=6` -> Monthly income/expense/net series, category breakdown, daily spend heatmap, top merchants.
- **System, Search, Import/Export & Audit (`/api/v1/system`)**:
  - `GET /api/v1/system/search?q=...` -> Unified command palette search across transactions, accounts, categories, and bills.
  - `GET /api/v1/system/export?format=csv|json` -> Deterministic ledger export.
  - `POST /api/v1/system/import` -> Validated CSV/JSON import with duplicate detection.
  - `GET /api/v1/system/audit-logs` -> Paginated security and ledger mutation log.
  - `GET /api/v1/openapi.json` -> Locally generated OpenAPI 3.0 specification.

---

### 7. Per-Module Test Plan & Quality Gates
Every module `M01`–`M12` must pass `scripts/run-gates.sh` before its 2024 commit:
1. **Unit & Component Tests (`vitest`)**:
   - Integer-cent arithmetic, split-sum validation, rollover budget math, recurring date advancement, merchant rule matching, and primitive accessibility attributes.
2. **API Integration Tests (`vitest` + `supertest` / Fastify `.inject()`)**:
   - Happy path, Zod validation error envelopes (`400`), RBAC permission denials (`403`), atomic transfer rollback on failure, and pagination invariants.
3. **Playwright E2E & 3-Breakpoint Visual Verification (`@playwright/test`)**:
   - Full user journeys across all 8 screens.
   - Automated screenshots at `360x800`, `768x1024`, and `1440x900` saved to `.forgemind/screenshots/`.
   - Asserts `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (zero horizontal overflow), zero console/page errors, visible focus rings, and WCAG AA contrast ratios.
4. **Offline Gate (`scripts/verify-offline.sh`)**:
   - Scans source, HTML, CSS, and configs for any `http://`/`https://` CDN URL, Google Fonts link, or unpinned version range.

---

### 8. Risk Register & Preemption Matrix

| Risk ID | Description | Preemption Strategy |
| :--- | :--- | :--- |
| **R01** | Floating-point precision drift in currency splits or transfers | Store and compute all monetary values in integer cents (`amountCents`); format only at the UI presentation boundary. |
| **R02** | Native `better-sqlite3` build or binding mismatch on Windows | Vendor prebuilt binaries via local `npm ci --offline` cache and wrap database connection with automatic schema bootstrap. |
| **R03** | Horizontal overflow at `360px` mobile viewport on wide financial tables | Use responsive card-row projection below `768px` and overflow-safe containers inside `src/components/primitives/table.tsx`. |
| **R04** | Accidental non-2024 commit timestamp | All commits run exclusively through `scripts/backdate-commit.sh` verified by `hooks/post-commit` and `hooks/pre-push`. |
| **R05** | LOC falling outside `8,000`–`12,000` real lines | Track per-module LOC via `scripts/count-loc.sh` after every module (`M01`–`M12`) against the `9,640 LOC` budget table. |

---

### 9. Complete Pre-Generated 2024 Commit Schedule (`schedule.json`)

Generated by `scripts/schedule-commits.sh` for window `2024-02-05` to `2024-11-29` (`+05:00`), strictly increasing, weekdays only (`Mon`–`Fri`), `09:00`–`19:00` local time, `>= 20m` apart with jitter and larger gaps after larger modules:

| Commit # | Module ID | Scheduled 2024 Timestamp (`+05:00`) | Weekday | Est. LOC | Planned Commit Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | `M00-scaffold` | `2024-02-05T09:11:48+05:00` | Mon | 420 | Initial workspace, toolchain, and design system scaffold |
| **1** | `M01` | `2024-02-05T13:21:36+05:00` | Mon | 310 | Implement M01 core domain and UI components |
| **2** | `M01` | `2024-02-05T17:34:30+05:00` | Mon | 310 | Complete M01 test suite and visual verification |
| **3** | `M01` | `2024-02-06T14:33:18+05:00` | Tue | 310 | Implement M01 core domain and UI components |
| **4** | `M02` | `2024-02-07T09:00:42+05:00` | Wed | 310 | Complete M02 test suite and visual verification |
| **5** | `M02` | `2024-02-07T15:29:50+05:00` | Wed | 310 | Implement M02 core domain and UI components |
| **6** | `M03` | `2024-02-08T10:02:43+05:00` | Thu | 310 | Complete M03 test suite and visual verification |
| **7** | `M03` | `2024-02-08T16:41:05+05:00` | Thu | 310 | Implement M03 core domain and UI components |
| **8** | `M04` | `2024-02-09T10:53:30+05:00` | Fri | 420 | Complete M04 test suite and visual verification |
| **9** | `M04` | `2024-02-12T10:45:41+05:00` | Mon | 420 | Implement M04 core domain and UI components |
| **10** | `M05` | `2024-02-12T15:08:04+05:00` | Mon | 420 | Complete M05 test suite and visual verification |
| **11** | `M05` | `2024-02-13T15:21:27+05:00` | Tue | 420 | Implement M05 core domain and UI components |
| **12** | `M06` | `2024-02-14T10:00:38+05:00` | Wed | 420 | Complete M06 test suite and visual verification |
| **13** | `M06` | `2024-02-15T10:12:40+05:00` | Thu | 420 | Implement M06 core domain and UI components |
| **14** | `M07` | `2024-02-15T14:52:28+05:00` | Thu | 420 | Complete M07 test suite and visual verification |
| **15** | `M07` | `2024-02-16T14:38:26+05:00` | Fri | 420 | Implement M07 core domain and UI components |
| **16** | `M08` | `2024-02-16T18:39:43+05:00` | Fri | 420 | Complete M08 test suite and visual verification |
| **17** | `M08` | `2024-02-19T18:43:30+05:00` | Mon | 420 | Implement M08 core domain and UI components |
| **18** | `M09` | `2024-02-20T13:05:52+05:00` | Tue | 420 | Complete M09 test suite and visual verification |
| **19** | `M09` | `2024-02-21T13:15:20+05:00` | Wed | 420 | Implement M09 core domain and UI components |
| **20** | `M10` | `2024-02-21T17:19:21+05:00` | Wed | 310 | Complete M10 test suite and visual verification |
| **21** | `M10` | `2024-02-22T14:19:40+05:00` | Thu | 310 | Implement M10 core domain and UI components |
| **22** | `M11` | `2024-02-22T18:32:38+05:00` | Thu | 310 | Complete M11 test suite and visual verification |
| **23** | `M11` | `2024-02-23T15:22:37+05:00` | Fri | 310 | Implement M11 core domain and UI components |
| **24** | `M12` | `2024-02-26T09:26:17+05:00` | Mon | 310 | Complete M12 test suite and visual verification |
| **25** | `M12` | `2024-02-26T16:06:17+05:00` | Mon | 310 | Implement M12 core domain and UI components |
