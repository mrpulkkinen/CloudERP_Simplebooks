import http from 'node:http';
import { URL } from 'node:url';
import { listCustomers, createCustomer, updateCustomer } from './services/customers.js';
import { listVendors, createVendor, updateVendor } from './services/vendors.js';
import { listProducts, createProduct, updateProduct } from './services/products.js';
import { listTaxRates, createTaxRate, updateTaxRate } from './services/taxRates.js';
import {
  listSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  convertSalesOrderToInvoice
} from './services/salesOrders.js';
import {
  listInvoices,
  createInvoice,
  issueInvoice,
  recordInvoicePayment,
  voidInvoice
} from './services/invoices.js';
import {
  listBills,
  createBill,
  approveBill,
  recordBillPayment,
  voidBill
} from './services/bills.js';
import { listPayments, createStandalonePayment } from './services/payments.js';
import { listJournalEntries, createJournalEntry } from './services/journal.js';
import { buildTrialBalance, buildAgingReport } from './services/reports.js';

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, jsonHeaders);
  res.end(`${body}\n`);
}

function errorResponse(error) {
  return {
    error: {
      code: 'BAD_REQUEST',
      message: error.message ?? 'Unexpected error'
    }
  };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          if (!text) {
            resolve(null);
            return;
          }
          resolve(JSON.parse(text));
        } catch (error) {
          reject(new Error('Invalid JSON payload'));
        }
      })
      .on('error', reject);
  });
}

const routes = [
  {
    method: 'GET',
    pattern: /^\/health$/,
    async handler() {
      return { status: 200, data: { status: 'ok' } };
    }
  },
  {
    method: 'GET',
    pattern: /^\/customers$/,
    async handler() {
      return { status: 200, data: await listCustomers() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/customers$/,
    async handler({ body }) {
      return { status: 201, data: await createCustomer(body ?? {}) };
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/customers\/([^/]+)$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await updateCustomer(params.id, body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/vendors$/,
    async handler() {
      return { status: 200, data: await listVendors() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/vendors$/,
    async handler({ body }) {
      return { status: 201, data: await createVendor(body ?? {}) };
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/vendors\/([^/]+)$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await updateVendor(params.id, body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/products$/,
    async handler() {
      return { status: 200, data: await listProducts() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/products$/,
    async handler({ body }) {
      return { status: 201, data: await createProduct(body ?? {}) };
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/products\/([^/]+)$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await updateProduct(params.id, body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/tax-rates$/,
    async handler() {
      return { status: 200, data: await listTaxRates() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/tax-rates$/,
    async handler({ body }) {
      return { status: 201, data: await createTaxRate(body ?? {}) };
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/tax-rates\/([^/]+)$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await updateTaxRate(params.id, body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/sales-orders$/,
    async handler() {
      return { status: 200, data: await listSalesOrders() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/sales-orders$/,
    async handler({ body }) {
      return { status: 201, data: await createSalesOrder(body ?? {}) };
    }
  },
  {
    method: 'PATCH',
    pattern: /^\/sales-orders\/([^/]+)$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await updateSalesOrder(params.id, body ?? {}) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/sales-orders\/([^/]+)\/confirm$/,
    keys: ['id'],
    async handler({ params }) {
      return { status: 200, data: await confirmSalesOrder(params.id) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/sales-orders\/([^/]+)\/to-invoice$/,
    keys: ['id'],
    async handler({ params }) {
      return { status: 201, data: await convertSalesOrderToInvoice(params.id) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/invoices$/,
    async handler() {
      return { status: 200, data: await listInvoices() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/invoices$/,
    async handler({ body }) {
      return { status: 201, data: await createInvoice(body ?? {}) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/invoices\/([^/]+)\/issue$/,
    keys: ['id'],
    async handler({ params }) {
      return { status: 200, data: await issueInvoice(params.id) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/invoices\/([^/]+)\/record-payment$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await recordInvoicePayment(params.id, body ?? {}) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/invoices\/([^/]+)\/void$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await voidInvoice(params.id, body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/bills$/,
    async handler() {
      return { status: 200, data: await listBills() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/bills$/,
    async handler({ body }) {
      return { status: 201, data: await createBill(body ?? {}) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/bills\/([^/]+)\/approve$/,
    keys: ['id'],
    async handler({ params }) {
      return { status: 200, data: await approveBill(params.id) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/bills\/([^/]+)\/record-payment$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await recordBillPayment(params.id, body ?? {}) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/bills\/([^/]+)\/void$/,
    keys: ['id'],
    async handler({ params, body }) {
      return { status: 200, data: await voidBill(params.id, body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/payments$/,
    async handler() {
      return { status: 200, data: await listPayments() };
    }
  },
  {
    method: 'POST',
    pattern: /^\/payments$/,
    async handler({ body }) {
      return { status: 201, data: await createStandalonePayment(body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/journals$/,
    async handler({ query }) {
      const { account_id: accountId, from, to } = query;
      return { status: 200, data: await listJournalEntries({ accountId, from, to }) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/ledger$/,
    async handler({ query }) {
      const { account_id: accountId, from, to } = query;
      return { status: 200, data: await listJournalEntries({ accountId, from, to }) };
    }
  },
  {
    method: 'POST',
    pattern: /^\/journals$/,
    async handler({ body }) {
      return { status: 201, data: await createJournalEntry(body ?? {}) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/reports\/trial-balance$/,
    async handler({ query }) {
      const { date } = query;
      return { status: 200, data: await buildTrialBalance(date ?? undefined) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/reports\/ar-aging$/,
    async handler({ query }) {
      const { date } = query;
      return { status: 200, data: await buildAgingReport('AR', date ?? undefined) };
    }
  },
  {
    method: 'GET',
    pattern: /^\/reports\/ap-aging$/,
    async handler({ query }) {
      const { date } = query;
      return { status: 200, data: await buildAgingReport('AP', date ?? undefined) };
    }
  }
];

function findRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }
    const match = route.pattern.exec(pathname);
    if (match) {
      const params = {};
      if (route.keys) {
        route.keys.forEach((key, index) => {
          params[key] = match[index + 1];
        });
      }
      return { route, params };
    }
  }
  return null;
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const found = findRoute(req.method ?? 'GET', url.pathname);
    if (!found) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
      return;
    }
    const { route, params } = found;
    const context = {
      params,
      query: Object.fromEntries(url.searchParams.entries()),
      body: null
    };
    if (['POST', 'PATCH'].includes(req.method ?? '')) {
      context.body = await parseBody(req);
    }
    const result = await route.handler(context);
    sendJson(res, result.status ?? 200, { data: result.data });
  } catch (error) {
    sendJson(res, 400, errorResponse(error));
  }
}

const server = http.createServer(handleRequest);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5010;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default server;
