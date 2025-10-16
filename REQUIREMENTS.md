# CloudERP Simplebooks Requirements

This document captures the MVP scope for the CloudERP Simplebooks project. It
covers the product goals, architecture, functional requirements, and
acceptance criteria that guide implementation. Refer to it when extending the
system to ensure alignment with the agreed-upon MVP.

## 1. Product Summary

A lightweight accounting web application for small businesses that prefer
explicit bookkeeping without automation. Inspired by Billy and Dinero.

Core goals:

- Customers & Vendors master data
- Sales Orders → Invoices (Accounts Receivable)
- Bills (Accounts Payable)
- Manual payments (partial & full)
- Double-entry General Ledger & Chart of Accounts
- Basic reporting: Trial Balance, AR/AP Aging

Non-goals for the MVP:

- Automated bank feeds, OCR, reconciliation
- Inventory, fulfillment, shipping
- Multi-currency or multi-entity consolidation
- Recurring invoices, credit notes, quotes/POs
- Complex approvals or RBAC beyond owner
- Tax engines or multi-tax rules (single per-line rate only)

## 2. Architecture Overview

- **Frontend:** Next.js 14 (TypeScript), App Router, server components, output
  configured for `standalone` deployments.
- **Backend API:** Node.js + Express + TypeScript.
- **Database:** PostgreSQL accessed via Prisma ORM.
- **Auth:** Email/password with JWT stored in httpOnly cookies.
- **Infra:** Docker Compose for local development (db, api, web services).
- **Testing:** Unit tests with Vitest/Jest; API tests with supertest; optional
  Playwright for E2E.

### Services & Ports

- `db`: PostgreSQL 16 (5432)
- `api`: Express API (5010)
- `web`: Next.js application (3000)

### Repository Layout

```
/
├─ apps/
│  ├─ api/                     # Express + Prisma
│  └─ web/                     # Next.js (SSR/SPA)
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ docker-compose.yml
├─ README.md
└─ REQUIREMENTS.md
```

## 3. Functional Requirements (Highlights)

- CRUD for Customers, Vendors, Products/Services, Tax Rates
- Sales Orders that convert to Invoices
- Invoices with sequential numbering, manual payments, PDF view
- Bills with approval workflow and payments
- Payments that post to AR/AP and Bank accounts
- Chart of Accounts with double-entry Journal entries
- Posting rules for issuing/voiding invoices, approving bills, and payments
- Reports: Dashboard metrics, Trial Balance, AR/AP Aging

## 4. Data Model (Prisma)

Refer to `prisma/schema.prisma` for the authoritative schema covering
organizations, users, customers, vendors, documents, payments, accounts, and
journals. The schema enforces balance, unique numbering, and foreign keys.

## 5. API Surface

REST endpoints under `/auth`, `/customers`, `/vendors`, `/products`,
`/tax-rates`, `/sales-orders`, `/invoices`, `/bills`, `/payments`, `/journals`,
`/ledger`, and `/reports/*` with JSON payloads validated via Zod. Errors follow
`{ error: { code, message, details? } }` format with HTTP 422 for validation
failures.

## 6. Frontend Requirements

- Next.js App Router pages for dashboard, invoices, bills, customers, vendors,
  products, ledger, and reports.
- Server components for list views; lightweight client components for forms.
- Fetch helper in `apps/web/lib/api.ts` that reads `NEXT_PUBLIC_API_URL` and
  disables caching via `no-store`.
- Money formatting helper for Danish Krone øre values.

## 7. Security & Compliance

- JWT in httpOnly cookies (secure in production)
- Password hashing with bcrypt
- Input validation with Zod
- Rate limiting on auth routes
- CORS restricted to the web origin

## 8. DevEx & Infrastructure

Environment variables:

```
PORT=5010
DATABASE_URL=postgresql://postgres:postgres@db:5432/clouderp
JWT_SECRET=change-me
PRISMA_HIDE_UPDATE_MESSAGE=1
PRISMA_DISABLE_TELEMETRY=1

NEXT_PUBLIC_API_URL=http://localhost:5010
```

Docker Compose spins up Postgres, the API, and the web app. The API container
runs migrations and seeds on boot before starting the Express server. The web
container builds the Next.js app using the `standalone` output.

## 9. Acceptance Criteria

- End-to-end Accounts Receivable and Accounts Payable flows post balanced
  journal entries and update document statuses.
- Reports return balanced trial balance and accurate aging buckets.
- Frontend renders lists sourced from the API with empty states.
- Docker Compose bootstraps the full stack and exposes ports 3000/5010/5432.

