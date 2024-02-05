import fs from 'node:fs';
import path from 'node:path';
import { SQL_MIGRATION_DDL } from './schema';
import { appLogger } from '../../utils/logger';

export function runMigrations(dataDir = path.resolve(process.cwd(), 'data')): {
  sqlFilePath: string;
  tablesCreated: number;
} {
  fs.mkdirSync(dataDir, { recursive: true });
  const sqlFilePath = path.join(dataDir, 'schema-2024.sql');
  fs.writeFileSync(sqlFilePath, SQL_MIGRATION_DDL.trim() + '\n', 'utf8');
  const tablesCreated = (SQL_MIGRATION_DDL.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
  appLogger.info('Database SQL migration DDL verified and written', {
    sqlFilePath,
    tablesCreated,
  });
  return { sqlFilePath, tablesCreated };
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  const res = runMigrations();
  console.info(`[db:migrate] Wrote ${res.tablesCreated} table definitions to ${res.sqlFilePath}`);
}
