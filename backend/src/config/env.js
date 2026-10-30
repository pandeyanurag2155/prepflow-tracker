import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Load backend/.env if present. Variables already set in the environment are not overridden.
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  // no .env file: rely on the real environment
}

const bool = z.enum(['true', 'false', '1', '0']).transform(v => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().url(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  APP_TIMEZONE: z.string().refine(tz => {
    try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return true; } catch { return false; }
  }, 'must be an IANA timezone such as Asia/Kolkata').default('Asia/Kolkata'),
  SERVE_FRONTEND: bool.default('true'),
  FRONTEND_DIR: z.string().default(path.resolve(root, '../frontend')),
  CORS_ORIGIN: z.string().default('').transform(s => s.split(',').map(o => o.trim()).filter(Boolean)),
  // How long a login lasts on a device. The account itself lives in the database (sign-up page).
  SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
