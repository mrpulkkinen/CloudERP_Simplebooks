import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { healthRouter } from './routes/health.js';

export async function createServer() {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      credentials: true
    })
  );
  app.use(morgan('dev'));

  app.use('/health', healthRouter);

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
