import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar, Badge, Breadcrumb, Button } from '../primitives/ui-primitives';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  group: 'Overview' | 'Ledger' | 'Planning' | 'Insights' | 'System';
  badgeCount?: number;
}

export interface AppShellProps {
  appName: string;
  navItems: NavItem[];
  activePath: string;
  activeMonth: string;
  onMonthChange: (month: string) => void;
  onNavigate: (href: string) => void;
  onOpenCommandSearch: () => void;
  onOpenQuickAdd: () => void;
  netWorthSummary?: {
    netWorthFormatted: string;
    monthlySavingsRatePct: number;
  };
  currentUserName?: string;
  currentUserRole?: string;
  headerActions?: React.ReactNode;
  rightPanel?: React.ReactNode;
  footerText?: string;
  children: React.ReactNode;
}

const AVAILABLE_MONTHS = [
  { value: '2024-02', label: 'Feb 2024' },
  { value: '2024-03', label: 'Mar 2024' },
  { value: '2024-04', label: 'Apr 2024' },
  { value: '2024-05', label: 'May 2024' },
  { value: '2024-06', label: 'Jun 2024' },
  { value: '2024-07', label: 'Jul 2024' },
  { value: '2024-08', label: 'Aug 2024' },
  { value: '2024-09', label: 'Sep 2024' },
  { value: '2024-10', label: 'Oct 2024' },
  { value: '2024-11', label: 'Nov 2024' },
];

export const AppShell: React.FC<AppShellProps> = ({
  appName,
  navItems,
  activePath,
  activeMonth,
  onMonthChange,
  onNavigate,
  onOpenCommandSearch,
  onOpenQuickAdd,
  netWorthSummary,
  currentUserName = 'Amina Tariq',
  currentUserRole = 'OWNER',
  headerActions,
  rightPanel,
  footerText,
  children,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeNav = navItems.find((item) => item.href === activePath) ?? navItems[0];
  const groups: NavItem['group'][] = ['Overview', 'Ledger', 'Planning', 'Insights', 'System'];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] max-w-full overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[var(--accent-primary)] focus:text-[var(--accent-text)]"
      >
        Skip to main content
      </a>

      <header
        role="banner"
        className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 min-h-[64px] px-3 md:px-6 py-2 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden"
          >
            Menu
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-bold tracking-tight truncate">{appName}</span>
              <Badge label="Offline 2024" tone="accent" />
            </div>
            <div className="hidden sm:block">
              <Breadcrumb
                items={[
                  { label: 'Workspace', onClick: () => onNavigate('/') },
                  { label: activeNav ? activeNav.label : 'Overview' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label htmlFor="global-period-select" className="sr-only">
              Active Accounting Month
            </label>
            <select
              id="global-period-select"
              aria-label="Active Accounting Month"
              value={activeMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs md:text-sm rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenCommandSearch}
            aria-label="Open command search"
          >
            Search (Ctrl+K)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenQuickAdd}
            aria-label="Record new transaction"
          >
            + Expense
          </Button>

          {headerActions}

          <Button
            variant="secondary"
            size="sm"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>

          <div className="hidden lg:flex items-center pl-1">
            <Avatar name={currentUserName} roleLabel={currentUserRole} size="sm" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-w-0">
        <aside
          aria-label="Primary Navigation"
          className={`${
            mobileMenuOpen ? 'block fixed inset-y-16 left-0 z-40 w-64 shadow-lg' : 'hidden'
          } md:block md:static md:w-56 lg:w-64 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 md:p-4 overflow-y-auto`}
        >
          {netWorthSummary && (
            <div className="mb-4 p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
              <p className="text-xs font-medium text-[var(--text-muted)]">Household Net Worth</p>
              <p className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
                {netWorthSummary.netWorthFormatted}
              </p>
              <p className="text-xs text-[var(--success)] mt-1">
                Savings Rate: {netWorthSummary.monthlySavingsRatePct.toFixed(1)}%
              </p>
            </div>
          )}

          <nav aria-label="Workspace Sections" className="space-y-4">
            {groups.map((groupName) => {
              const items = navItems.filter((i) => i.group === groupName);
              if (items.length === 0) return null;
              return (
                <div key={groupName}>
                  <p className="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {groupName}
                  </p>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const isActive = activePath === item.href;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(item.href);
                              setMobileMenuOpen(false);
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                              isActive
                                ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {typeof item.badgeCount === 'number' && (
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full font-mono ${
                                  isActive
                                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                }`}
                              >
                                {item.badgeCount}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden"
        >
          {children}
        </main>

        {rightPanel && (
          <aside
            aria-label="Contextual Financial Inspector"
            className="hidden xl:block xl:w-80 shrink-0 border-l border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
          >
            {rightPanel}
          </aside>
        )}
      </div>

      <footer
        role="contentinfo"
        className="px-3 md:px-6 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-2"
      >
        <span>{footerText || `${appName} — 100% Offline SQLite & Local Asset Financial Ledger`}</span>
        <span>WCAG AA Contrast Verified • 2024 Pinned Stack</span>
      </footer>
    </div>
  );
};
