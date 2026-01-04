# CloudERP Simplebooks

CloudERP Simplebooks is a monorepo that hosts the backend API and frontend web
application for a lightweight accounting system. The project follows the
architecture outlined in `REQUIREMENTS.md` and uses Docker Compose for local
development.

## Packages

- **apps/api** – Express + Prisma API written in TypeScript. Connects to a
  PostgreSQL database and exposes REST endpoints for the core accounting flows.
- **apps/web** – Next.js 14 application using the App Router. Fetches data from
  the API and renders simple resource lists and forms.
- **prisma** – Prisma schema and seed script for the database.

## Getting started

1. Copy `.env.example` to `.env` and configure any secrets.
2. Run `docker compose up --build` to start Postgres, the API, and the web app.
3. Access the web UI at http://localhost:3000 and the API at
   http://localhost:5010.
4. Sign in at http://localhost:3000/auth/login with the seeded owner account
   `owner@example.com` / `demo1234` (created via `npm run prisma:seed --workspace apps/api`).
   Custom environments must define `JWT_SECRET` (see `.env.example`) so auth
   tokens can be issued.

## Install & Deployment

1. Install dependencies once: `npm install`.
2. Copy `.env.example` to `.env` and edit values (at minimum set `DATABASE_URL`
   and `JWT_SECRET` before building).
3. Generate the Prisma client: `npm run prisma:generate --workspace apps/api`.
4. Run migrations against your database: `npm run prisma:migrate --workspace apps/api`.
5. Seed demo data (optional but useful for first-run login):
   `npm run prisma:seed --workspace apps/api`.
6. Build the workspaces: `npm run build`.
7. Deploy via Docker Compose locally (`docker compose up --build`) or ship the
   built containers/images to your target environment. The API container
   expects the same env vars listed in `.env.example`; the web container needs
   `NEXT_PUBLIC_API_URL` (and optionally `INTERNAL_API_URL` when proxying at
   runtime).

## Local development

Install dependencies once from the repository root:

```bash
npm install
```

Useful commands:

- `npm run dev --workspace apps/api` – Start the API in watch mode.
- `npm run dev --workspace apps/web` – Start the Next.js dev server.
- `npm run test --workspace apps/api` – Run API unit tests (Vitest).
