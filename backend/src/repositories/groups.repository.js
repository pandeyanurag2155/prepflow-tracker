import { pool } from '../db/pool.js';
import { buildSet } from '../utils/sql.js';

const COLUMNS = `id, section_id AS "sectionId", parent_id AS "parentId", title, month, focus, step, role,
  position AS "order"`;

const WRITABLE = { title: 'title', focus: 'focus', month: 'month', step: 'step', order: 'position', parentId: 'parent_id' };

export const groupsRepository = {
  async list(db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM plan_groups ORDER BY section_id, position, created_at`);
    return rows;
  },

  async findById(id, db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM plan_groups WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  /** The group plus its direct children (Striver step → sub-steps). */
  async findTree(id, db = pool) {
    const { rows } = await db.query(
      `SELECT ${COLUMNS} FROM plan_groups WHERE id = $1 OR parent_id = $1 ORDER BY parent_id NULLS FIRST, position`, [id]);
    return rows;
  },

  /** Insert many groups in one statement. Parents must come before children in `groups`. */
  async insertMany(groups, { ignoreExisting = false } = {}, db = pool) {
    if (!groups.length) return [];
    const { rows } = await db.query(
      `INSERT INTO plan_groups (id, section_id, parent_id, title, month, focus, step, role, position)
       SELECT x.id, x."sectionId", x."parentId", x.title, x.month, x.focus, x.step, x.role, x."order"
       FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, "sectionId" text, "parentId" uuid, title text,
         month smallint, focus text, step smallint, role text, "order" int)
       ${ignoreExisting ? 'ON CONFLICT (id) DO NOTHING' : ''}
       RETURNING ${COLUMNS}`,
      [JSON.stringify(groups)]);
    return rows;
  },

  async update(id, patch, db = pool) {
    const { sql, values } = buildSet(patch, WRITABLE, 2);
    if (!sql) return this.findById(id, db);
    const { rows } = await db.query(
      `UPDATE plan_groups SET ${sql}, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`, [id, ...values]);
    return rows[0] || null;
  },

  async nextPosition(sectionId, parentId, db = pool) {
    const { rows } = await db.query(
      `SELECT COALESCE(MAX(position) + 1, 0) AS n FROM plan_groups
       WHERE section_id = $1 AND parent_id IS NOT DISTINCT FROM $2`, [sectionId, parentId]);
    return rows[0].n;
  },

  /** Returns how many of the given ids existed and were updated. */
  async setPositions(positions, db = pool) {
    const { rowCount } = await db.query(
      `UPDATE plan_groups g SET position = x."order", updated_at = now()
       FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, "order" int) WHERE g.id = x.id`,
      [JSON.stringify(positions)]);
    return rowCount;
  },

  async deleteById(id, db = pool) {
    const { rowCount } = await db.query('DELETE FROM plan_groups WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async deleteBySection(sectionId, db = pool) {
    await db.query('DELETE FROM plan_groups WHERE section_id = $1', [sectionId]);
  },

  /** Items cascade with their groups. */
  async deleteAll(db = pool) {
    await db.query('DELETE FROM plan_groups');
  },
};
