# Expense Tracker — Offline Personal & Household Financial Ledger

An offline-first, double-entry personal and household expense tracker built on a pinned 2024 TypeScript stack. Every monetary value is stored and computed in integer cents (`amountCents`) to eliminate IEEE-754 floating-point drift across account balances, multi-category split transactions, zero-based monthly budgets, recurring bill schedules, and itemized receipt claims.

---

## Core Capabilities

1. **Executive Financial Overview (`S02`)**:
   - Real-time Household Net Worth, Liquid Cash, Monthly Income, Monthly Spend, and Savings Rate KPIs.
   - Pure offline SVG visualizations for 5-Month Cashflow Trajectory (Income vs. Expense) and Category Spend Share.
   - Recent Ledger Activity and Upcoming Recurring Obligations.
2. **Transactions Ledger & Multi-Category Split Engine (`S03`)**:
   - Full search, account/category/type filters, split-only filtering, and paginated ledger table.
   - Interactive 2-way and multi-way Split Transaction Drawer with strict integer-cent invariant verification ($\sum \text{split.amountCents} = \text{transaction.amountCents}$).
   - Bulk category reassignment and status reconciliation.
3. **Accounts, Inter-Account Transfers & Statement Reconciliation (`S04`)**:
   - Supports Checking, High-Yield Savings, Credit Card, Cash Wallet, and Brokerage accounts.
   - Atomic double-entry inter-account transfers and statement ending-balance reconciliation workflow.
4. **Monthly Budgets & Rollover Envelopes (`S05`)**:
   - Category-level monthly budget limits, optional positive rollover carry-forward, and automated `OK` / `WARNING_80` / `EXCEEDED_100` alert states.
   - One-click rollover copy from the previous accounting month.
5. **Recurring Bills, Subscriptions & Calendar Grid (`S06`)**:
   - Weekly, biweekly, monthly, quarterly, and annual recurring rules with monthly equivalent normalization.
   - Interactive 42-cell monthly obligation calendar and one-click occurrence posting.
6. **Receipts, Line-Item Breakdown & Reimbursement Claims (`S07`)**:
   - Itemized receipt sub-items (`quantity * unitPriceCents + taxCents`), claim tracking (`NONE` -> `PENDING` -> `SUBMITTED` -> `REIMBURSED`), and 50/50 shared expense calculations.
7. **Workspace Administration, Categories, Auto-Rules, Portability & Audit (`S08`)**:
   - Hierarchical category taxonomy and priority-ordered merchant auto-categorization rules (`CONTAINS`, `EXACT`, `STARTS_WITH`).
   - Deterministic CSV import/export with duplicate detection and full JSON ledger snapshots.
   - Household Role-Based Access Control (`OWNER`, `MEMBER`, `VIEWER`) and immutable security audit log.
8. **Global Command Search (`Ctrl+K`) & Fastify 4 REST API**:
   - Instant cross-entity search across transactions, accounts, categories, and recurring rules.
   - Fastify 4 REST API server (`/api/v1/*`) with OpenAPI 3.0 specification (`/api/v1/openapi.json`).

---

## Pinned 2024 Technology Stack

| Layer | Package & Version | Purpose |
| :--- | :--- | :--- |
| Runtime | Node.js `20.x` LTS | Server & build runtime |
| Language | TypeScript `5.6.3` | Strict static typechecking across client & server |
| Frontend UI | React `18.3.1` + Vite `5.4.10` | Component rendering & local bundling |
| Styling | Tailwind CSS `3.4.14` + CSS Custom Properties | Semantic WCAG AA design token system (Light & Dark) |
| Backend API | Fastify `4.28.1` + Zod `3.23.8` | REST API endpoints & schema validation |
| Database / Persistence | `better-sqlite3` `11.5.0` + Drizzle ORM `0.36.1` + `TransactionalLedgerDatabase` | ACID transactional ledger state & SQL DDL |
| Unit & Integration QA | Vitest `2.1.8` + Testing Library `16.0.1` | 50 unit & integration tests across M01–M11 |
| E2E & Visual QA | Playwright `1.48.2` | Multi-breakpoint (`360px`, `768px`, `1440px`) E2E & visual verification |

---

## Offline Operation & Local Assets

This application runs **100% offline** with zero external runtime calls:
- **Fonts**: Local WOFF2 fonts served from `public/assets/fonts/` (`InterLocal-Regular.woff2`, `InterLocal-Medium.woff2`, `InterLocal-SemiBold.woff2`, `InterLocal-Bold.woff2`, `JetBrainsMonoLocal-Regular.woff2`).
- **Icons**: Local SVG sprite (`public/assets/icons/sprite.svg`) and inline React SVG primitives (`src/components/icons/CategoryIcons.tsx`).
- **Charts**: Custom zero-network SVG chart components (`src/components/charts/CashflowSvgCharts.tsx`).

---

## Quick Start

```bash
# 1. Install dependencies from local cache
npm install --prefer-offline --no-audit --no-fund

# 2. Run TypeScript typecheck and ESLint (zero warnings allowed)
npm run typecheck
npm run lint

# 3. Run Unit & Integration test suite
npm test

# 4. Build production bundle and run Playwright 3-breakpoint E2E suite
npm run build
npx playwright test

# 5. Start interactive development server
npm run dev
```

---

## Project Structure

```text
projects/expense-tracker/
├── docs/
│   └── ARCHITECTURE.md          # System architecture, Design System & Screen Inventory
├── public/
│   └── assets/
│       ├── fonts/               # Local WOFF2 font files (Inter & JetBrains Mono)
│       └── icons/sprite.svg     # Local SVG vector icon sprite
├── src/
│   ├── components/
│   │   ├── categories/          # Category & Merchant Auto-Rule Manager
│   │   ├── charts/              # Pure SVG Cashflow & Category Share charts
│   │   ├── icons/               # Local SVG icon components
│   │   ├── layout/              # AppShell & Ctrl+K CommandSearchModal
│   │   ├── primitives/          # 18 shared WCAG AA UI primitives
│   │   └── theme/               # Light/Dark ThemeProvider
│   ├── screens/                 # All workspace screens (Overview, Transactions, Accounts, etc.)
│   ├── server/
│   │   ├── auth/                # Session auth, CSRF, rate limiter & RBAC matrix
│   │   ├── db/                  # Schema, SQL DDL, ACID ledger engine & 2024 seed data
│   │   ├── services/            # Domain services (Account, Category, Transaction, Budget, etc.)
│   │   ├── app.ts               # Fastify 4 REST API application factory
│   │   └── index.ts             # Fastify CLI server entry point
│   ├── styles/
│   │   ├── tokens.ts            # Single source of truth for design tokens
│   │   └── globals.css          # Local @font-face declarations & token CSS variables
│   ├── utils/                   # Integer-cent currency math, date helpers, logger & errors
│   ├── App.tsx                  # Root workspace router & state coordinator
│   └── main.tsx                 # Browser entry point
└── tests/
    ├── unit/                    # M01–M03 unit test suites
    ├── integration/             # M04–M11 integration & component test suites
    └── e2e/                     # M12 Playwright 3-breakpoint E2E & visual test suite
```
