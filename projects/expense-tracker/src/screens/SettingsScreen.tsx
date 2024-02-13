import React, { useMemo, useState } from 'react';
import { TransactionalLedgerDatabase } from '../server/db/client';
import { CategoryService } from '../server/services/category.service';
import { SystemService } from '../server/services/system.service';
import { CategoryRuleManager } from '../components/categories/CategoryRuleManager';
import {
  Badge,
  Button,
  Card,
  Tabs,
  Textarea,
  Toast,
} from '../components/primitives/ui-primitives';

export interface SettingsScreenProps {
  database: TransactionalLedgerDatabase;
  actorUserId?: string;
  onDataMutated?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  database,
  actorUserId = 'usr-owner-01',
  onDataMutated,
}) => {
  const systemService = useMemo(() => new SystemService(database), [database]);
  const categoryService = useMemo(() => new CategoryService(database), [database]);
  const [activeTab, setActiveTab] = useState<string>('categories');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const [csvImportPayload, setCsvImportPayload] = useState<string>(
    [
      'occurredOn,merchant,description,type,amountCents,accountId,categoryId',
      '2024-02-23,Blue Bottle Coffee,Cold Brew & Croissant,EXPENSE,1475,acc-checking-01,cat-dining',
    ].join('\n')
  );
  const [exportedText, setExportedText] = useState<string>('');
  const [feedback, setFeedback] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );

  const categories = useMemo(() => {
    void refreshTick;
    return categoryService.listCategories();
  }, [categoryService, refreshTick]);

  const tags = useMemo(() => {
    void refreshTick;
    return categoryService.listTags();
  }, [categoryService, refreshTick]);

  const merchantRules = useMemo(() => {
    void refreshTick;
    return categoryService.listMerchantRules();
  }, [categoryService, refreshTick]);

  const auditLogs = useMemo(() => {
    void refreshTick;
    return systemService.listAuditLogs(40);
  }, [systemService, refreshTick]);

  const householdUsers = useMemo(() => {
    void refreshTick;
    return systemService.listHouseholdUsers();
  }, [systemService, refreshTick]);

  const healthSummary = useMemo(() => {
    void refreshTick;
    return systemService.getSystemHealthSummary();
  }, [systemService, refreshTick]);

  const notifyMutated = () => {
    setRefreshTick((t) => t + 1);
    if (onDataMutated) {
      onDataMutated();
    }
  };

  const handleExportCsv = () => {
    const csv = systemService.exportTransactionsCsv();
    setExportedText(csv);
    setFeedback({ text: 'Generated deterministic CSV ledger export below.', tone: 'success' });
  };

  const handleExportJson = () => {
    const bundle = systemService.exportHouseholdJsonBundle();
    setExportedText(JSON.stringify(bundle, null, 2));
    setFeedback({
      text: 'Generated full JSON schema v2024.1 snapshot below.',
      tone: 'success',
    });
  };

  const handleImportCsv = () => {
    try {
      const res = systemService.importTransactionsCsv(csvImportPayload, actorUserId);
      setFeedback({
        text: `Imported ${res.importedCount} row(s), skipped ${res.skippedDuplicatesCount} duplicate(s).`,
        tone: 'success',
      });
      notifyMutated();
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : 'Failed to import CSV rows.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-screen">
      {feedback && (
        <Toast
          message={feedback.text}
          tone={feedback.tone}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            Workspace Administration, Categories &amp; Data Portability
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage category taxonomies, merchant auto-rules, CSV/JSON ledger backups, household RBAC roles, and immutable audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge label={`Offline Engine v${healthSummary.version}`} tone="success" />
          <Badge label={`${healthSummary.counts.transactions} Ledger Rows`} tone="neutral" />
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'categories', label: 'Categories & Auto-Rules' },
          { id: 'portability', label: 'CSV / JSON Import & Export' },
          { id: 'members', label: 'Household RBAC Members', count: householdUsers.length },
          { id: 'audit', label: 'Security Audit Log', count: auditLogs.length },
        ]}
      />

      {activeTab === 'categories' && (
        <CategoryRuleManager
          categories={categories}
          tags={tags}
          merchantRules={merchantRules}
          onCreateCategory={(input) => {
            categoryService.createCategory(input, actorUserId);
            notifyMutated();
          }}
          onCreateMerchantRule={(input) => {
            categoryService.createMerchantRule(input, actorUserId);
            notifyMutated();
          }}
          onApplyRulesToLedger={() => {
            const out = categoryService.applyMerchantRulesAcrossLedger(actorUserId);
            notifyMutated();
            return out;
          }}
        />
      )}

      {activeTab === 'portability' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title="Import Transactions from CSV"
            subtitle="Deterministic deduplication checks date, merchant, integer cents, and account ID."
          >
            <div className="space-y-4">
              <Textarea
                id="csv-import-textarea"
                label="CSV Batch Payload"
                value={csvImportPayload}
                onChange={(e) => setCsvImportPayload(e.target.value)}
                rows={5}
                className="font-mono text-xs"
                data-testid="csv-import-textarea"
              />
              <Button variant="primary" onClick={handleImportCsv} data-testid="run-csv-import-btn">
                Validate &amp; Import CSV Rows
              </Button>
            </div>
          </Card>

          <Card
            title="Export Ledger Snapshot (CSV / JSON)"
            subtitle="Zero lock-in portability for external spreadsheets or offline backups."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={handleExportCsv} data-testid="export-csv-btn">
                  Generate CSV Export
                </Button>
                <Button variant="secondary" onClick={handleExportJson} data-testid="export-json-btn">
                  Generate Full JSON Snapshot
                </Button>
              </div>
              <Textarea
                id="export-output-textarea"
                label="Export Output Preview"
                value={exportedText}
                onChange={(e) => setExportedText(e.target.value)}
                rows={6}
                placeholder="Click 'Generate CSV Export' or 'Generate Full JSON Snapshot' above..."
                className="font-mono text-xs"
                data-testid="export-output-textarea"
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'members' && (
        <Card
          title="Household Members & Role-Based Access Control (RBAC)"
          subtitle="Granular permission matrix enforcing OWNER, MEMBER, and read-only VIEWER boundaries."
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-2.5 pr-4">Member</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Currency</th>
                  <th className="py-2.5 pr-4">RBAC Role</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {householdUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                      {u.displayName}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                      {u.email}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--text-secondary)]">
                      {u.defaultCurrency}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge label={u.role} tone={u.role === 'OWNER' ? 'accent' : 'neutral'} />
                    </td>
                    <td className="py-3 text-right">
                      <Badge label="Active" tone="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card
          title="Immutable Security & Ledger Audit Trail"
          subtitle="Every state-mutating action across accounts, transactions, budgets, and sessions is recorded."
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" data-testid="audit-log-table">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-2.5 pr-4">Timestamp</th>
                  <th className="py-2.5 pr-4">Actor</th>
                  <th className="py-2.5 pr-4">Action</th>
                  <th className="py-2.5 pr-4">Entity</th>
                  <th className="py-2.5">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                      {log.createdAt.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-medium text-[var(--text-primary)]">
                      {log.actorName}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge label={log.action} tone="neutral" />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                      {log.entityType}:{log.entityId}
                    </td>
                    <td className="py-2.5 text-xs text-[var(--text-primary)]">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
