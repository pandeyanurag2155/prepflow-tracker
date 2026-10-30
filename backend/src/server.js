import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { pool } from './db/pool.js';
import { createApp } from './app.js';

const server = createApp().listen(env.PORT, () => {
  logger.info(`PrepFlow API on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish, then close the pool.
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info(`${signal} received, shutting down`);
  const force = setTimeout(() => { logger.error('forced exit after 10s'); process.exit(1); }, 10_000);
  force.unref();
  server.close(async () => {
    await pool.end();
    logger.info('bye');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', err => logger.error({ err }, 'unhandled rejection'));
