import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { registerRoutes } from './routes/index.js';
import { loadEnv } from './config/env.js';

export async function createServer(): Promise<Application> {
  const env = loadEnv();
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  registerRoutes(app);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: { code: 'internal_error', message: err.message } });
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', databaseUrl: env.DATABASE_URL });
  });

  return app;
}
