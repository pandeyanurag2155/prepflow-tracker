import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';
import { passwordVersion, readCookie, readSessionToken } from '../utils/auth.js';
import { accountService } from '../services/account.service.js';

export const SESSION_COOKIE = 'pf_session';
export const SESSION_TTL_MS = env.SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Rejects /api requests without a valid session cookie (401). Sets req.user on success. */
export async function requireAuth(req, _res, next) {
  const account = await accountService.current();
  const session = account && readSessionToken(readCookie(req.headers.cookie, SESSION_COOKIE), {
    secret: account.sessionSecret,
    version: passwordVersion(account.passwordHash),
  });
  if (!session) return next(new HttpError(401, account ? 'UNAUTHENTICATED' : 'SETUP_REQUIRED', account ? 'Please log in' : 'Create your account first'));
  req.user = { username: account.username };
  next();
}

/*
 * Brute-force guard for login, signup and password changes, in memory (single process, single user):
 * after MAX_FAILS wrong attempts from one IP, that IP is locked out for LOCK_MS.
 */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map();   // ip → { fails, lockedUntil }

export function loginLimiter(req, res, next) {
  const a = attempts.get(req.ip);
  if (a?.lockedUntil > Date.now()) {
    const minutes = Math.ceil((a.lockedUntil - Date.now()) / 60_000);
    res.setHeader('Retry-After', Math.ceil((a.lockedUntil - Date.now()) / 1000));
    return next(new HttpError(429, 'TOO_MANY_ATTEMPTS', `Too many wrong attempts. Try again in ${minutes} min`));
  }
  next();
}

export function recordLoginResult(ip, ok) {
  if (ok) { attempts.delete(ip); return; }
  const a = attempts.get(ip) || { fails: 0, lockedUntil: 0 };
  a.fails += 1;
  if (a.fails >= MAX_FAILS) { a.fails = 0; a.lockedUntil = Date.now() + LOCK_MS; }
  attempts.set(ip, a);
}

/** For tests. */
export const resetLoginAttempts = () => attempts.clear();
