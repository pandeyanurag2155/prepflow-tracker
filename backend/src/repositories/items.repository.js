import { pool } from '../db/pool.js';
import { buildSet } from '../utils/sql.js';

const COLUMNS = `id, section_id AS "sectionId", group_id AS "groupId", title, kind, track, level, difficulty,
  notes, link, done, done_at AS "doneAt", revisit_dates::text[] AS "revisitDates", key, position AS "order",
  created_at AS "createdAt"`;

const WRITABLE = {
  groupId: 'group_id', title: 'title', kind: 'kind', track: 'track', level: 'level', difficulty: 'difficulty',
  notes: 'notes', link: 'link', key: 'key', order: 'position', revisitDates: 'revisit_dates',
};

export const itemsRepository = {
  async list(db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM plan_items ORDER BY group_id, position, created_at`);
    return rows;
  },

  async findById(id, db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM plan_items WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async listByGroups(groupIds, db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM plan_items WHERE group_id = ANY($1::uuid[])`, [groupIds]);
    return rows;
  },

  /** Ids of every problem sharing `key` (linked duplicates across NeetCode and Striver). */
  async problemIdsByKey(key, db = pool) {
    const { rows } = await db.query(`SELECT id FROM plan_items WHERE kind = 'problem' AND key = $1`, [key]);
    return rows.map(r => r.id);
  },

  /** For each key, the done state of one already-completed problem with that key. */
  async doneTwins(keys, db = pool) {
    if (!keys.length) return new Map();
    const { rows } = await db.query(
      `SELECT DISTINCT ON (key) key, done_at AS "doneAt", revisit_dates::text[] AS "revisitDates"
       FROM plan_items WHERE kind = 'problem' AND done AND key = ANY($1::text[])
       ORDER BY key, done_at DESC`, [keys]);
    return new Map(rows.map(r => [r.key, r]));
  },

  async keysInGroup(groupId, db = pool) {
    const { rows } = await db.query(
      `SELECT CASE WHEN key <> '' THEN key ELSE lower(title) END AS k FROM plan_items WHERE group_id = $1`, [groupId]);
    return new Set(rows.map(r => r.k));
  },

  /** Insert many items in one statement. With ignoreExisting, ids that already exist are skipped. */
  async insertMany(items, { ignoreExisting = false } = {}, db = pool) {
    if (!items.length) return [];
    const { rows } = await db.query(
      `INSERT INTO plan_items (id, section_id, group_id, title, kind, track, level, difficulty, notes, link,
         done, done_at, revisit_dates, key, position)
       SELECT x.id, x."sectionId", x."groupId", x.title, x.kind, x.track, x.level, x.difficulty, x.notes, x.link,
         x.done, x."doneAt", ARRAY(SELECT jsonb_array_elements_text(x."revisitDates"))::date[], x.key, x."order"
       FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, "sectionId" text, "groupId" uuid, title text, kind text,
         track text, level text, difficulty text, notes text, link text, done boolean, "doneAt" timestamptz,
         "revisitDates" jsonb, key text, "order" int)
       ${ignoreExisting ? 'ON CONFLICT (id) DO NOTHING' : ''}
       RETURNING ${COLUMNS}`,
      [JSON.stringify(items)]);
    return rows;
  },

  async update(id, patch, db = pool) {
    const { sql, values } = buildSet(patch, WRITABLE, 2);
    if (!sql) return this.findById(id, db);
    const { rows } = await db.query(
      `UPDATE plan_items SET ${sql}, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`, [id, ...values]);
    return rows[0] || null;
  },

  async setDone(ids, { done, doneAt, revisitDates }, db = pool) {
    const { rows } = await db.query(
      `UPDATE plan_items SET done = $2, done_at = $3,
         revisit_dates = CASE WHEN kind = 'problem' THEN $4::date[] ELSE '{}' END, updated_at = now()
       WHERE id = ANY($1::uuid[]) RETURNING ${COLUMNS}`,
      [ids, done, doneAt, revisitDates]);
    return rows;
  },

  async nextPosition(groupId, db = pool) {
    const { rows } = await db.query('SELECT COALESCE(MAX(position) + 1, 0) AS n FROM plan_items WHERE group_id = $1', [groupId]);
    return rows[0].n;
  },

  async setPositions(positions, db = pool) {
    const { rowCount } = await db.query(
      `UPDATE plan_items i SET position = x."order", updated_at = now()
       FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, "order" int) WHERE i.id = x.id`,
      [JSON.stringify(positions)]);
    return rowCount;
  },

  async deleteById(id, db = pool) {
    const { rows } = await db.query(`DELETE FROM plan_items WHERE id = $1 RETURNING ${COLUMNS}`, [id]);
    return rows[0] || null;
  },
};
