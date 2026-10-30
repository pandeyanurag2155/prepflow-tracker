import { pool } from '../db/pool.js';
import { buildSet } from '../utils/sql.js';

const COLUMNS = `plan_start AS "planStart", plan_months AS "planMonths",
  theme, link_duplicates AS "linkDuplicates", hide_completed AS "hideCompleted"`;

const WRITABLE = {
  planStart: 'plan_start',
  planMonths: 'plan_months',
  theme: 'theme',
  linkDuplicates: 'link_duplicates',
  hideCompleted: 'hide_completed',
};

export const settingsRepository = {
  async get(db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM settings WHERE id = 1`);
    return rows[0];
  },

  async update(patch, db = pool) {
    const { sql, values } = buildSet(patch, WRITABLE);
    if (!sql) return this.get(db);
    const { rows } = await db.query(
      `UPDATE settings SET ${sql}, updated_at = now() WHERE id = 1 RETURNING ${COLUMNS}`, values);
    return rows[0];
  },
};
