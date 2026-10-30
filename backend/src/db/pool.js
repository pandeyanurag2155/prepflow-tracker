import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Return DATE columns as 'YYYY-MM-DD' strings instead of Date objects shifted by the server timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, v => v);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', err => logger.error({ err }, 'idle postgres client error'));

/**
 * Run `fn(client)` inside BEGIN/COMMIT; any throw rolls back.
 * Repositories take a `db` argument so they work with either the pool or this client.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
