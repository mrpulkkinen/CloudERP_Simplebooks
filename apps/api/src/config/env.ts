import dotenv from 'dotenv';

export interface Env {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
}

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  dotenv.config();

  const PORT = Number(process.env.PORT ?? 5010);
  const DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/clouderp';
  const JWT_SECRET = process.env.JWT_SECRET ?? 'insecure-test-secret';

  cachedEnv = {
    PORT,
    DATABASE_URL,
    JWT_SECRET
  };

  return cachedEnv;
}
