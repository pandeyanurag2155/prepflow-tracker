import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';
import { dsaLinkFields } from '../domain/build-seed.js';

/**
 * CLI: npm run db:dsa-links → fill in links for DSA-plan problems in an existing database.
 * Updates in place, so ticks and revisit dates stay. Only empty links/notes are filled;
 * anything you edited yourself is left alone.
 */
async function main() {
  const { rows } = await pool.query(`SELECT id, title, link, notes FROM plan_items WHERE section_id = 'dsa' AND kind = 'problem'`);
  let linked = 0;
  for (const it of rows) {
    const f = dsaLinkFields(it.title);
    if (!f.link) continue;
    const link = it.link || f.link;
    const notes = it.notes || f.notes;
    if (link === it.link && notes === it.notes) continue;
    await pool.query('UPDATE plan_items SET link = $2, notes = $3, updated_at = now() WHERE id = $1', [it.id, link, notes]);
    linked++;
  }
  const unknown = rows.filter(it => !dsaLinkFields(it.title).link && !it.link).map(it => it.title);
  logger.info(`DSA plan: updated ${linked} of ${rows.length} problems${unknown.length ? `; no link known for: ${unknown.join(', ')}` : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch(err => { logger.error({ err }, 'dsa links failed'); process.exitCode = 1; })
    .finally(() => pool.end());
}
