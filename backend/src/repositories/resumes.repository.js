import { pool } from '../db/pool.js';

// Never select `data` in lists: files can be megabytes each
const META = `id, label, filename, content_type AS "contentType", size_bytes AS "size", created_at AS "createdAt"`;

export const resumesRepository = {
  async list(db = pool) {
    const { rows } = await db.query(`SELECT ${META} FROM resumes ORDER BY created_at DESC`);
    return rows;
  },

  async findFile(id, db = pool) {
    const { rows } = await db.query(`SELECT ${META}, data FROM resumes WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async create({ label, filename, contentType, data }, db = pool) {
    const { rows } = await db.query(
      `INSERT INTO resumes (label, filename, content_type, size_bytes, data) VALUES ($1, $2, $3, $4, $5) RETURNING ${META}`,
      [label, filename, contentType, data.length, data]);
    return rows[0];
  },

  async rename(id, label, db = pool) {
    const { rows } = await db.query(`UPDATE resumes SET label = $2 WHERE id = $1 RETURNING ${META}`, [id, label]);
    return rows[0] || null;
  },

  async deleteById(id, db = pool) {
    const { rowCount } = await db.query('DELETE FROM resumes WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
