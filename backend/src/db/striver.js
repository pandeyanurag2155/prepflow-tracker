import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';
import { trackerService } from '../services/tracker.service.js';

/** CLI: npm run db:striver → load striver-sheet.json into the Striver section, keeping progress. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  trackerService.refreshStriver()
    .then(r => logger.info(`Striver: ${r.groups} groups, ${r.items} items (${r.done} done kept, ${r.kept} unmatched kept)`))
    .catch(err => { logger.error({ err }, 'striver refresh failed'); process.exitCode = 1; })
    .finally(() => pool.end());
}
