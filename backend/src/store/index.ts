import { Store } from './types';
import { MemoryStore } from './memory.store';
import { PostgresStore } from './postgres.store';

export * from './types';

let storePromise: Promise<Store> | undefined;

const hasPostgres = (): boolean =>
  Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);

/**
 * Returns the active store, initialising it once. Uses Postgres when a connection
 * string is configured, otherwise falls back to the in-memory store so the app
 * runs with zero setup.
 */
export const getStore = (): Promise<Store> => {
  if (!storePromise) {
    const store: Store = hasPostgres() ? new PostgresStore() : new MemoryStore();
    // eslint-disable-next-line no-console
    console.log(`[recognyze] store: ${hasPostgres() ? 'postgres' : 'in-memory (no POSTGRES_URL set)'}`);
    storePromise = store.init().then(() => store);
  }
  return storePromise;
};
