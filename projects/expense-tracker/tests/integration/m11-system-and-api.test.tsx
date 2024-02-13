import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { SystemService } from '../../src/server/services/system.service';
import { buildApiServer } from '../../src/server/app';
import { App } from '../../src/App';

describe('M11: Global Command Search, CSV/JSON Portability, Fastify API & Full App', () => {
  it('searches across transactions, accounts, categories, and recurring bills', () => {
    const database = new TransactionalLedgerDatabase();
    const service = new SystemService(database);

    const hits = service.searchGlobalCommandPalette('Green Valley');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some((h) => h.title.includes('Green Valley'))).toBe(true);
  });

  it('exports CSV and imports CSV rows with deterministic duplicate skipping', () => {
    const database = new TransactionalLedgerDatabase();
    const service = new SystemService(database);

    const csvText = service.exportTransactionsCsv();
    expect(csvText).toContain('id,occurredOn,merchant,description,type,amountCents');
    expect(csvText).toContain('Green Valley Market');

    const firstRow = database.getStateRef().transactions[0]!;
    const batchPayload = [
      'occurredOn,merchant,description,type,amountCents,accountId,categoryId',
      '2024-02-23,Blue Bottle Artisanal Coffee,Morning Cortado,EXPENSE,850,acc-checking-01,cat-dining',
      `${firstRow.occurredOn},${firstRow.merchant},${firstRow.description},${firstRow.type},${firstRow.amountCents},${firstRow.accountId},${firstRow.categoryId}`,
    ].join('\n');

    const res = service.importTransactionsCsv(batchPayload, 'usr-owner-01');
    expect(res.importedCount).toBe(1);
    expect(res.skippedDuplicatesCount).toBe(1);
    expect(res.errors.length).toBe(0);

    const jsonBundle = service.exportHouseholdJsonBundle();
    expect(jsonBundle.schemaVersion).toBe(1);
    expect(jsonBundle.transactions.length).toBeGreaterThanOrEqual(20);
  });

  it('serves Fastify REST API endpoints via inject()', async () => {
    const database = new TransactionalLedgerDatabase();
    const app = buildApiServer({ database });

    const healthRes = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(healthRes.statusCode).toBe(200);
    const healthJson = healthRes.json() as { status: string; counts: { transactions: number } };
    expect(healthJson.status).toBe('ok');
    expect(healthJson.counts.transactions).toBeGreaterThanOrEqual(19);

    const openApiRes = await app.inject({ method: 'GET', url: '/api/v1/openapi.json' });
    expect(openApiRes.statusCode).toBe(200);
    expect((openApiRes.json() as { openapi: string }).openapi).toBe('3.0.3');

    const overviewRes = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/overview?month=2024-02',
    });
    expect(overviewRes.statusCode).toBe(200);
    expect((overviewRes.json() as { monthIncomeCents: number }).monthIncomeCents).toBeGreaterThan(
      0
    );

    await app.close();
  });

  it('renders the full App shell, navigates between screens, and opens Ctrl+K search', () => {
    const database = new TransactionalLedgerDatabase();

    render(<App database={database} />);
    expect(screen.getByText(/Executive Financial Overview/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Settings & Rules/i }));
    expect(screen.getByTestId('settings-screen')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Open command search/i }));
    expect(screen.getByTestId('command-palette-input')).toBeTruthy();
  });
});
