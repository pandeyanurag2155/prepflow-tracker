import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Apply every migrations/*.sql file not yet recorded in schema_migrations, in filename order.
 * Each file runs in its own transaction. Never edit an applied file: add a new numbered one.
 */
export async function runMigrations() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map(r => r.name));
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();

  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      ran.push(file);
      logger.info({ migration: file }, 'migration applied');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
    } finally {
      client.release();
    }
  }
  return ran;
}

// CLI: npm run db:migrate
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(ran => logger.info(ran.length ? `applied ${ran.length} migration(s)` : 'database is up to date'))
    .catch(err => { logger.error(err.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
