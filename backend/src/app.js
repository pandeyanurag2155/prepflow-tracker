import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { apiRouter } from './routes/index.js';
import { trackerController } from './controllers/tracker.controller.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        styleSrcAttr: ["'unsafe-inline'"],          // progress bars set width/height via style=""
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: null,             // TLS is terminated by the proxy in production
      },
    },
    // Ignored (with a console warning) on plain-HTTP LAN addresses, e.g. opening it from a phone;
    // the app opens no cross-origin windows (external links use rel="noopener"), so it isn't needed.
    crossOriginOpenerPolicy: false,
  }));
  if (env.CORS_ORIGIN.length) app.use('/api', cors({ origin: env.CORS_ORIGIN }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: req => !req.url.startsWith('/api') } }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', trackerController.health);
  app.use('/api/v1', apiRouter);
  app.use('/api', notFound);

  if (env.SERVE_FRONTEND) {
    // File names carry no content hash (no build step), so browsers must revalidate on every load;
    // an unchanged file costs a 304. A long max-age would mix old and new ES modules after a deploy.
    app.use(express.static(env.FRONTEND_DIR, {
      index: 'index.html',
      setHeaders: res => res.setHeader('Cache-Control', 'no-cache'),
    }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
