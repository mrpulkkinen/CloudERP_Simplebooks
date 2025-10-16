import { mutateState, readState } from '../lib/store.js';
import { allocateSalesOrderNumber, takeCounter } from '../lib/ids.js';
import { requireCustomer, requireProduct, requireTaxRate } from '../lib/lookups.js';
import { ensureDateInput } from '../lib/time.js';
import { summariseLines } from '../lib/money.js';
import { createInvoiceFromSalesOrder } from './invoices.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildOrderLine(state, payload) {
  const lineId = takeCounter(state, 'salesOrderLine');
  let productSnapshot = null;
  let description = payload.description ?? null;
  let unitPriceNet = payload.unit_price_net ?? null;
  let accountIdSnapshot = payload.account_id_snapshot ?? null;
  let taxRatePercent = payload.tax_rate_percent_snapshot ?? null;
  if (payload.product_id) {
    const product = requireProduct(state, payload.product_id);
    productSnapshot = product.id;
    description = description ?? product.name;
    unitPriceNet = unitPriceNet ?? product.unitPriceNet;
    accountIdSnapshot = accountIdSnapshot ?? product.incomeAccountId;
    const taxRate = requireTaxRate(state, product.taxRateId ?? 'tax_default');
    taxRatePercent = taxRate.ratePercent;
  }
  if (unitPriceNet === null || unitPriceNet === undefined) {
    throw new Error('Sales order line requires unit_price_net');
  }
  if (taxRatePercent === null || taxRatePercent === undefined) {
    taxRatePercent = 0;
  }
  return {
    id: `sol_${lineId}`,
    productId: productSnapshot,
    description: description ?? 'Custom line',
    qty: payload.qty ?? 1,
    unit_price_net: unitPriceNet,
    discount_amount: payload.discount_amount ?? 0,
    tax_rate_percent_snapshot: taxRatePercent,
    account_id_snapshot: accountIdSnapshot ?? 'acct_sales'
  };
}

function buildOrder(state, payload) {
  const customer = requireCustomer(state, payload.customer_id);
  const issueDate = ensureDateInput(payload.issue_date);
  const dueDate = ensureDateInput(payload.due_date ?? payload.issue_date ?? issueDate);
  const idNumber = takeCounter(state, 'salesOrder');
  const orderNo = allocateSalesOrderNumber(state, issueDate);
  const lines = (payload.lines ?? []).map((line) => buildOrderLine(state, line));
  if (lines.length === 0) {
    throw new Error('Sales order requires at least one line');
  }
  const totals = summariseLines(lines);
  return {
    id: `so_${idNumber}`,
    sales_order_no: orderNo,
    customer_id: customer.id,
    status: 'draft',
    issue_date: issueDate,
    due_date: dueDate,
    currency: payload.currency ?? 'DKK',
    notes: payload.notes ?? null,
    totals_cache: totals,
    lines
  };
}

export async function listSalesOrders() {
  const state = await readState();
  return state.salesOrders.map(clone);
}

export async function createSalesOrder(payload) {
  return mutateState((state) => {
    const order = buildOrder(state, payload);
    state.salesOrders.push(order);
    return clone(order);
  });
}

export async function updateSalesOrder(id, payload) {
  return mutateState((state) => {
    const existing = state.salesOrders.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Sales order ${id} not found`);
    }
    if (existing.status !== 'draft') {
      throw new Error('Only draft sales orders can be updated');
    }
    const merged = buildOrder(state, { ...existing, ...payload, customer_id: existing.customer_id });
    merged.id = existing.id;
    merged.sales_order_no = existing.sales_order_no;
    merged.status = existing.status;
    state.salesOrders = state.salesOrders.map((item) =>
      item.id === id ? merged : item
    );
    return clone(merged);
  });
}

export async function confirmSalesOrder(id) {
  return mutateState((state) => {
    const order = state.salesOrders.find((item) => item.id === id);
    if (!order) {
      throw new Error(`Sales order ${id} not found`);
    }
    if (order.status !== 'draft') {
      throw new Error('Sales order is not in draft status');
    }
    order.status = 'confirmed';
    return clone(order);
  });
}

export async function convertSalesOrderToInvoice(id) {
  const invoice = await mutateState((state) => {
    const order = state.salesOrders.find((item) => item.id === id);
    if (!order) {
      throw new Error(`Sales order ${id} not found`);
    }
    if (order.status === 'invoiced') {
      throw new Error('Sales order already invoiced');
    }
    if (order.status === 'draft') {
      throw new Error('Sales order must be confirmed before invoicing');
    }
    const invoice = createInvoiceFromSalesOrder(state, order);
    order.status = 'invoiced';
    state.invoices.push(invoice);
    return clone(invoice);
  });
  return invoice;
}
