import { pool } from '../db/pool.js';

const COLUMNS = `username, password_hash AS "passwordHash", session_secret AS "sessionSecret"`;

export const accountRepository = {
  async get(db = pool) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM account WHERE id = 1`);
    return rows[0] || null;
  },

  /** Returns the new account, or null if one already exists (sign-up is closed). */
  async create({ username, passwordHash, sessionSecret }, db = pool) {
    const { rows } = await db.query(
      `INSERT INTO account (id, username, password_hash, session_secret) VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO NOTHING RETURNING ${COLUMNS}`,
      [username, passwordHash, sessionSecret]);
    return rows[0] || null;
  },

  async setPassword(passwordHash, db = pool) {
    const { rows } = await db.query(
      `UPDATE account SET password_hash = $1, password_changed_at = now() WHERE id = 1 RETURNING ${COLUMNS}`,
      [passwordHash]);
    return rows[0] || null;
  },
};
