/**
 * Forgot the password? npm run auth:reset-password
 * Sets a new password for the account created on the sign-up page (typed input is hidden).
 * Every device is logged out. Run it where the API's database is reachable (same DATABASE_URL);
 * with docker compose, the database is on localhost:5433 as in .env.example.
 */
import readline from 'node:readline';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/utils/auth.js';
import { accountRepository } from '../src/repositories/account.repository.js';

// One readline whose async iterator buffers lines, so piped input (several lines at once) works too.
// While `muted`, typed characters aren't echoed, so the password never shows on screen.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
const lines = rl[Symbol.asyncIterator]();
let muted = false;
const write = rl._writeToOutput?.bind(rl);
if (write) rl._writeToOutput = s => { if (!muted) write(s); };

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden;
  const { value = '' } = await lines.next();
  if (muted) process.stdout.write('\n');
  muted = false;
  return value;
}

async function main() {
  const account = await accountRepository.get();
  if (!account) {
    console.log('No account yet: open the app and use the sign-up page.');
    return;
  }
  console.log(`Resetting the password for “${account.username}”.`);
  const password = await ask('New password (min 8 characters): ', { hidden: true });
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  const again = await ask('Repeat password: ', { hidden: true });
  if (again !== password) throw new Error('Passwords do not match.');
  await accountRepository.setPassword(await hashPassword(password));
  console.log('Password changed. Every device has to log in again (the running app picks it up within 30 seconds).');
}

main()
  .catch(err => { console.error(err.message); process.exitCode = 1; })
  .finally(() => { rl.close(); pool.end(); });
