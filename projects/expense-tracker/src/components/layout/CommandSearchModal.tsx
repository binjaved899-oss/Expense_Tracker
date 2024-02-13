import React, { useMemo, useState } from 'react';
import { TransactionalLedgerDatabase } from '../../server/db/client';
import { SystemService } from '../../server/services/system.service';
import { Badge, Button, Input, Modal } from '../primitives/ui-primitives';
import { formatCents } from '../../utils/currency';

export interface CommandSearchModalProps {
  database: TransactionalLedgerDatabase;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
}

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({
  database,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const systemService = useMemo(() => new SystemService(database), [database]);
  const [query, setQuery] = useState<string>('');

  const results = useMemo(
    () => systemService.searchGlobalCommandPalette(query, 16),
    [systemService, query]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Global Command Search (Ctrl+K)"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close (Esc)
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          id="command-palette-input"
          label="Search Query"
          placeholder="Type a merchant, account, category, or date (e.g. Green Valley, Chase, 2024-02)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="command-palette-input"
        />

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              No matching ledger records found for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((item) => (
              <button
                key={`${item.entityType}-${item.id}`}
                type="button"
                onClick={() => {
                  onNavigate(item.href);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge label={item.entityType} tone="accent" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  {item.amountCents !== null ? (
                    <span
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        item.amountCents < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'
                      }`}
                    >
                      {formatCents(item.amountCents, 'USD', { showPlusSign: item.amountCents > 0 })}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Open →</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
