# CloudERP Simplebooks

CloudERP Simplebooks is a lightweight accounting platform for small businesses inspired by Billy and Dinero. The project delivers clear, explicit bookkeeping flows without automation, covering master data, invoicing, bills, manual payments, and a double-entry ledger.

## Project Structure

```
/
├─ apps/
│  ├─ api/                     # Express + Prisma API service
│  └─ web/                     # Next.js web frontend
├─ prisma/
│  ├─ schema.prisma            # Database schema
│  └─ seed.ts                  # Seed data for organizations and chart of accounts
├─ docker-compose.yml          # Local development services
├─ REQUIREMENTS.md             # MVP requirements reference
└─ README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Docker Desktop or compatible runtime

### Install dependencies

```bash
npm install
```

This command installs dependencies for both the API and web apps via npm workspaces.

### Environment variables

Copy `.env.example` to `.env` in the repository root and adjust values as needed.

```bash
cp .env.example .env
```

Environment variables are documented inline within the example file.

### Database setup

The project uses Prisma with PostgreSQL. Apply migrations and generate the Prisma client before running services:

```bash
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed
```

These commands are available within the API workspace and can be executed with `npm run --workspace apps/api <command>`.

### Running locally with Docker Compose

```bash
docker compose up --build
```

Docker Compose provisions the PostgreSQL database, the API service on port 5010, and the Next.js web frontend on port 3000.

### Running locally without Docker

#### API

```bash
npm run --workspace apps/api dev
```

The API starts on `http://localhost:5010` and automatically reloads on file changes.

#### Web

```bash
npm run --workspace apps/web dev
```

The web app starts on `http://localhost:3000` using the App Router.

### Testing

Each workspace exposes its own test commands. To execute all tests:

```bash
npm test
```

## Documentation

- OpenAPI documentation is served from the API at `/docs` when the service is running.
- Key accounting flows and posting rules are described in `REQUIREMENTS.md`.

## Contributing

1. Fork the repository and create a branch.
2. Install dependencies and ensure the test suite passes.
3. Submit a pull request with a clear description and testing evidence.

## License

This project is released under the MIT License.
