import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index';
import { getConfig } from './config';

/** Builds the configured Express application (shared by the local server and the Azure Functions adapter). */
export const createApp = () => {
  const config = getConfig();
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : true
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false
    }),
    routes
  );

  // Centralised error handler — logs the real error, returns a safe message to clients.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.statusCode || err?.status || 500;
    // eslint-disable-next-line no-console
    console.error('[recognyze] request failed:', err?.message || err);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      message: 'Something went wrong handling your request. Please try again.'
    });
  });

  return app;
};
