# CloudERP Simplebooks MVP Requirements

This document captures the minimum viable product scope for CloudERP Simplebooks. It consolidates the high-level goals, architecture decisions, functional requirements, and acceptance criteria provided by product management.

## 1. Product Summary

- Lightweight accounting app inspired by Billy and Dinero.
- Focused on explicit bookkeeping without automation.
- Core workflows: master data management, sales orders, invoices, bills, manual payments, general ledger, and basic reporting.

## 2. Non-goals (MVP)

- No bank feeds, OCR, or ML automations.
- No inventory management, fulfillment, or shipping features.
- No multi-currency or multi-entity consolidation.
- Recurring invoices, credit notes, and purchase orders are excluded.
- No complex approvals beyond owner role.
- Single tax rate per line only; no advanced tax engines.

## 3. Architecture Overview

- **Frontend:** Next.js 14 (TypeScript) App Router.
- **Backend API:** Express.js with TypeScript.
- **Database:** PostgreSQL 16 via Prisma ORM.
- **Auth:** Email/password with JWT stored in httpOnly cookie.
- **Infrastructure:** Docker Compose for local development (db, api, web).
- **Documentation:** OpenAPI 3 served by the API service.
- **Testing:** Unit tests (Vitest/Jest), API tests (supertest), optional Playwright E2E.

## 4. Core Functional Requirements

### 4.1 Master Data
- Customers and Vendors: create/read/update/archive with contact info and addresses.
- Products/Services catalog with pricing, income account, optional tax rate.
- Tax rates with fixed percentages.

### 4.2 Sales & Accounts Receivable
- Sales orders: draft → confirmed → invoiced; convert to invoices.
- Invoices: draft/issued/partially paid/paid/void with sequential numbering and PDF view.
- AR payments: manual, partial/full, applied to invoices.

### 4.3 Accounts Payable
- Bills: draft/approved/partially paid/paid/void.
- AP payments: manual, partial/full, applied to bills.

### 4.4 Ledger & Reporting
- Double-entry general ledger with pre-seeded chart of accounts.
- Posting rules for issuing invoices, recording payments, approving bills, voiding documents, and manual journals.
- Reports: dashboard metrics, trial balance, AR/AP aging.

## 5. API Surface (REST)

- Auth endpoints: register, login, logout, `GET /me`.
- Master data endpoints: customers, vendors, products, tax rates.
- Sales & AR endpoints: sales orders, invoices, payments, PDF export.
- AP endpoints: bills, payments.
- Ledger & reports endpoints: journals, ledger listing, trial balance, AR/AP aging.

## 6. Data Model (Prisma)

- Entities for organizations, users, customers, vendors, products, tax rates, sales orders, invoices, bills, payments, accounts, journals, and junction tables for payments.
- Unique constraints on document numbering per organization and foreign keys on all relations.
- Timestamps on primary entities.

## 7. Frontend Requirements

- Next.js App Router with server components for lists and client components for forms.
- Uses `NEXT_PUBLIC_API_URL` for API base URL.
- Pages for dashboard, invoices, bills, customers, vendors, products, ledger, reports, and login.
- Minimal fetch utility with no-store caching and money formatting helper.

## 8. Security & Compliance

- JWT stored in httpOnly cookies, secure in production.
- Passwords hashed with bcrypt.
- Zod validation and sanitization; rate limiting on auth routes.
- CORS restricted to web origin.

## 9. DevEx & Infrastructure

- Environment variables defined for API and web services.
- Docker Compose orchestrates db/api/web containers.
- API entrypoint runs Prisma migrations, generates client, then starts server.

## 10. Posting Rules & Testing Expectations

- Double-entry posting for invoice issuance, AR/AP payments, bill approval, and voiding.
- Manual journals must balance (sum debits equals sum credits).
- Unit tests assert balanced journals and alignment between document balances and ledger balances.

## 11. Acceptance Criteria

- End-to-end AR and AP flows culminating in balanced ledgers.
- Reports: trial balance equality, accurate AR/AP aging buckets.
- Frontend renders data lists and PDF endpoint available for issued invoices.
- Docker Compose brings up all services; Next.js runs in standalone mode in production image.

## 12. Milestones

1. Project skeleton (current milestone).
2. AR & AP basics.
3. Payments & Ledger.
4. Frontend lists & PDF.
5. Polish & documentation.

## 13. Definition of Done

- All acceptance criteria satisfied.
- CI runs tests, type checks, and builds Docker images.
- README provides clear setup instructions.
- No blocking TODOs remain.
