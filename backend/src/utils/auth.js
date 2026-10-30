import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

// Stored as scrypt:N:r:p:salt:hash (base64url). No “$” so docker compose env_file never tries to interpolate it.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join(':');
}

export async function verifyPassword(password, stored) {
  const [algo, n, r, p, salt, hash] = String(stored).split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(String(password), Buffer.from(salt, 'base64url'), expected.length, { N: +n, r: +r, p: +p });
  return timingSafeEqual(actual, expected);
}

/** Constant-time string comparison (for the username). */
export function safeEqual(a, b) {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y);
}

/*
 * Session token = base64url(JSON payload) + "." + HMAC-SHA256(payload, SESSION_SECRET).
 * Stateless: nothing stored server-side. `v` fingerprints the password hash, so changing the
 * password logs out every device; rotating SESSION_SECRET does the same.
 */
export const passwordVersion = passwordHash => createHash('sha256').update(passwordHash).digest('base64url').slice(0, 12);

const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export function createSessionToken({ username, version, ttlMs, secret }) {
  const data = Buffer.from(JSON.stringify({ u: username, v: version, exp: Date.now() + ttlMs })).toString('base64url');
  return `${data}.${sign(data, secret)}`;
}

/** Returns the payload if the token is genuine, unexpired and for the current password; otherwise null. */
export function readSessionToken(token, { secret, version }) {
  const [data, mac] = String(token || '').split('.');
  if (!data || !mac) return null;
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.exp > Date.now() && payload.v === version ? payload : null;
  } catch {
    return null;
  }
}

/** Minimal cookie header parser (we only read our own cookie). */
export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
