import fs from 'node:fs';
import path from 'node:path';
import { TransactionalLedgerDatabase } from './client';
import { appLogger } from '../../utils/logger';

export function runDeterministicSeed(dataDir = path.resolve(process.cwd(), 'data')): {
  dbFilePath: string;
  accountsCount: number;
  categoriesCount: number;
  transactionsCount: number;
} {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbInstance = new TransactionalLedgerDatabase();
  const snapshot = dbInstance.resetToSeed();
  const dbFilePath = path.join(dataDir, 'expense-tracker.json');
  fs.writeFileSync(dbFilePath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  appLogger.info('Populated deterministic 2024 seed dataset', {
    dbFilePath,
    accountsCount: snapshot.accounts.length,
    categoriesCount: snapshot.categories.length,
    transactionsCount: snapshot.transactions.length,
  });

  return {
    dbFilePath,
    accountsCount: snapshot.accounts.length,
    categoriesCount: snapshot.categories.length,
    transactionsCount: snapshot.transactions.length,
  };
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  const res = runDeterministicSeed();
  console.info(
    `[db:seed] Seeded ${res.accountsCount} accounts, ${res.categoriesCount} categories, and ${res.transactionsCount} transactions into ${res.dbFilePath}`
  );
}
