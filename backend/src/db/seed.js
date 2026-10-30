import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';
import { trackerService } from '../services/tracker.service.js';

/**
 * CLI: npm run db:seed        → load the starting plan only if the database has no groups
 *      npm run db:reset       → wipe groups/items and load the starting plan (settings kept)
 */
async function main() {
  const force = process.argv.includes('--force');
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM plan_groups');
  if (rows[0].n > 0 && !force) {
    logger.info(`database already has ${rows[0].n} groups; skipping seed (use --force to reset)`);
    return;
  }
  const snapshot = await trackerService.resetToSeed();
  logger.info(`seeded ${snapshot.groups.length} groups and ${snapshot.items.length} items`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch(err => { logger.error({ err }, 'seed failed'); process.exitCode = 1; })
    .finally(() => pool.end());
}
