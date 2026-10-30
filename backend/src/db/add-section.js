import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';
import { trackerService } from '../services/tracker.service.js';

/** CLI: npm run db:add-section -- sysdesign → insert a seed section the database doesn’t have yet. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sectionId = process.argv[2];
  trackerService.addMissingSection(sectionId)
    .then(r => logger.info(r.added ? `added ${sectionId}: ${r.groups} groups, ${r.items} items` : `${sectionId} already has ${r.groups} groups; nothing to do`))
    .catch(err => { logger.error({ err }, 'add section failed'); process.exitCode = 1; })
    .finally(() => pool.end());
}
