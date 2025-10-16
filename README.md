# CloudERP Simplebooks

CloudERP Simplebooks is a minimal, offline-friendly accounting service that models customers, vendors, invoices, bills, payments, and the supporting double-entry ledger. The project focuses on transparent bookkeeping flows that can run without third-party dependencies, relying only on Node.js built-in modules and a JSON-backed datastore.

## Repository layout

```
/
├─ apps/
│  ├─ api/                # Node.js HTTP API and accounting domain logic
│  └─ web/                # Static documentation landing page
├─ data/
│  └─ store.json          # Persistent datastore with chart of accounts seed data
├─ REQUIREMENTS.md        # Product requirements reference
├─ README.md
└─ package.json
```

## Prerequisites

- Node.js 20+
- npm 9+

No additional package installation is required—the project avoids third-party dependencies so that `npm install` completes instantly even in restricted environments.

## Running the API

```bash
npm start
```

The API listens on [http://localhost:5010](http://localhost:5010) by default. A health probe is available at `/health` and the complete REST surface is documented in the landing page located at `apps/web/public/index.html`.

Data is persisted to `data/store.json`. The file is updated transactionally whenever entities or ledger postings change. The pristine seed used for tests lives in `data/seed.json`.

## Running the accounting scenario tests

```bash
npm test
```

The test suite uses the built-in `node:test` runner to exercise the core posting rules:

- Issuing invoices creates balanced journals (Dr AR, Cr Sales, Cr Output VAT) and supports partial payments.
- Approving bills posts expenses and VAT input (Dr Expense, Dr Input VAT, Cr AP) with payment settlement.
- Trial balance and AR/AP aging reports reconcile document balances with the ledger.

Each test resets the datastore to the seeded chart of accounts before execution.

## Key API endpoints

| Endpoint | Description |
| --- | --- |
| `GET /customers`, `POST /customers`, `PATCH /customers/:id` | Manage customer master data |
| `GET /vendors`, `POST /vendors`, `PATCH /vendors/:id` | Manage vendors |
| `GET /products`, `POST /products`, `PATCH /products/:id` | Product and service catalog |
| `GET /sales-orders`, `POST /sales-orders`, `POST /sales-orders/:id/confirm`, `POST /sales-orders/:id/to-invoice` | Sales order lifecycle |
| `GET /invoices`, `POST /invoices`, `POST /invoices/:id/issue`, `POST /invoices/:id/record-payment`, `POST /invoices/:id/void` | Accounts receivable |
| `GET /bills`, `POST /bills`, `POST /bills/:id/approve`, `POST /bills/:id/record-payment`, `POST /bills/:id/void` | Accounts payable |
| `GET /payments`, `POST /payments` | Standalone payment records |
| `GET /journals`, `GET /ledger`, `POST /journals` | Manual journal access |
| `GET /reports/trial-balance`, `GET /reports/ar-aging`, `GET /reports/ap-aging` | Ledger and aging reports |

All payloads accept and return JSON. Monetary amounts are expressed in øre (integer minor units).

## Development notes

- The ledger enforces balancing through the shared `appendJournalEntry` helper used by every posting flow.
- Journal, invoice, bill, and sales order identifiers are sequential per organization and include the year in their prefixes.
- The datastore can be inspected or reset by editing `data/store.json`; tests provide a programmatic example via `resetState`.

## License

MIT
