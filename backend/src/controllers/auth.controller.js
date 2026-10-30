import { HttpError } from '../utils/http-error.js';
import { createSessionToken, passwordVersion } from '../utils/auth.js';
import { accountService } from '../services/account.service.js';
import { SESSION_COOKIE, SESSION_TTL_MS, recordLoginResult } from '../middlewares/auth.js';

// Secure only over HTTPS (req.secure honours X-Forwarded-Proto behind a proxy); plain-HTTP LAN use still works.
const cookieOptions = req => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: req.secure,
  path: '/',
});

function startSession(req, res, account) {
  const token = createSessionToken({
    username: account.username,
    version: passwordVersion(account.passwordHash),
    ttlMs: SESSION_TTL_MS,
    secret: account.sessionSecret,
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_TTL_MS });
}

export const authController = {
  /** Public: tells the UI whether to show sign-up (no account yet) or log-in. */
  async status(_req, res) {
    res.json({ data: { setUp: await accountService.isSetUp() } });
  },

  /** Public, but only works once: the first account closes sign-up. Logs straight in. */
  async signup(req, res) {
    const { username, password } = req.valid.body;
    const account = await accountService.signup(username, password);
    startSession(req, res, account);
    res.status(201).json({ data: { username: account.username } });
  },

  async login(req, res) {
    const { username, password } = req.valid.body;
    if (!(await accountService.isSetUp())) throw new HttpError(409, 'SETUP_REQUIRED', 'Create your account first');
    const account = await accountService.verify(username, password);
    recordLoginResult(req.ip, Boolean(account));
    if (!account) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Wrong username or password');
    startSession(req, res, account);
    res.json({ data: { username: account.username } });
  },

  logout(req, res) {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
    res.json({ data: { ok: true } });
  },

  me(req, res) {
    res.json({ data: { username: req.user.username } });
  },

  /** Needs the current password. Other devices are logged out; this one gets a fresh cookie. */
  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.valid.body;
    const ok = await accountService.verify(req.user.username, currentPassword);
    recordLoginResult(req.ip, Boolean(ok));
    if (!ok) throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is wrong');
    startSession(req, res, await accountService.changePassword(newPassword));
    res.json({ data: { ok: true } });
  },
};
