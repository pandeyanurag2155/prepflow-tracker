import { randomBytes } from 'node:crypto';
import { HttpError } from '../utils/http-error.js';
import { hashPassword, verifyPassword, safeEqual } from '../utils/auth.js';
import { accountRepository } from '../repositories/account.repository.js';

/*
 * The account row is needed on every authenticated request, so it is cached in memory for
 * CACHE_MS. Sign-up and password changes through the API refresh it at once; a reset from the
 * terminal (npm run auth:reset-password) is picked up within CACHE_MS.
 * `cached`: null = no account yet (sign-up open).
 */
const CACHE_MS = 30_000;
let cached = null;
let loadedAt = 0;

function remember(account) {
  cached = account;
  loadedAt = Date.now();
  return account;
}

async function current() {
  if (Date.now() - loadedAt > CACHE_MS) remember(await accountRepository.get());
  return cached;
}

export const accountService = {
  current,

  /** For tests: forget the cache. */
  reset() { cached = null; loadedAt = 0; },

  async isSetUp() {
    return Boolean(await current());
  },

  /** First-run sign-up. Fails with 409 once an account exists. */
  async signup(username, password) {
    const account = await accountRepository.create({
      username,
      passwordHash: await hashPassword(password),
      sessionSecret: randomBytes(32).toString('base64url'),
    });
    if (!account) throw HttpError.conflict('An account already exists. Log in instead.');
    return remember(account);
  },

  /** Returns the account when the credentials match, otherwise null. Always hashes, so timing doesn’t reveal the username. */
  async verify(username, password) {
    const account = await current();
    const passwordOk = await verifyPassword(password, account?.passwordHash ?? 'scrypt:16384:8:1:AAAA:AAAA');
    return account && passwordOk && safeEqual(username, account.username) ? account : null;
  },

  /** Changes the password; every existing session (other devices too) stops working. */
  async changePassword(newPassword) {
    return remember(await accountRepository.setPassword(await hashPassword(newPassword)));
  },
};
