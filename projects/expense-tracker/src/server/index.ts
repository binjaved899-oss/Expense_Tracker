import { TransactionalLedgerDatabase } from './db/client';
import { buildApiServer } from './app';
import { appLogger } from '../utils/logger';

async function startServer(): Promise<void> {
  const port = Number(process.env.API_PORT ?? 4175);
  const host = process.env.API_HOST ?? '127.0.0.1';

  const database = new TransactionalLedgerDatabase();
  const app = buildApiServer({ database });
  await app.listen({ port, host });
  appLogger.info('LedgerVault Fastify API server listening', { host, port });
}

if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  startServer().catch((err) => {
    appLogger.error('Failed to start LedgerVault API server', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
}
