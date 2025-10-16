import { mutateState, readState } from '../lib/store.js';
import { allocateInvoiceNumber, takeCounter } from '../lib/ids.js';
import { requireCustomer, requireProduct, requireTaxRate } from '../lib/lookups.js';
import { ensureDateInput, nowIso } from '../lib/time.js';
import { summariseLines } from '../lib/money.js';
import { appendJournalEntry } from './journal.js';
import { registerPayment } from './payments.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureLines(lines) {
  if (!lines || lines.length === 0) {
    throw new Error('Invoice requires at least one line');
  }
}

function buildInvoiceLine(state, payload) {
  const lineId = takeCounter(state, 'invoiceLine');
  let productId = payload.product_id ?? null;
  let description = payload.description ?? null;
  let unitPriceNet = payload.unit_price_net ?? null;
  let accountIdSnapshot = payload.account_id_snapshot ?? null;
  let taxRatePercent = payload.tax_rate_percent_snapshot ?? null;
  if (productId) {
    const product = requireProduct(state, productId);
    productId = product.id;
    description = description ?? product.name;
    unitPriceNet = unitPriceNet ?? product.unitPriceNet;
    accountIdSnapshot = accountIdSnapshot ?? product.incomeAccountId;
    const taxRate = requireTaxRate(state, product.taxRateId ?? 'tax_default');
    taxRatePercent = taxRate.ratePercent;
  }
  if (unitPriceNet === null || unitPriceNet === undefined) {
    throw new Error('Invoice line requires unit_price_net');
  }
  if (taxRatePercent === null || taxRatePercent === undefined) {
    taxRatePercent = 0;
  }
  return {
    id: `invline_${lineId}`,
    product_id: productId,
    description: description ?? 'Custom line',
    qty: payload.qty ?? 1,
    unit_price_net: unitPriceNet,
    discount_amount: payload.discount_amount ?? 0,
    tax_rate_percent_snapshot: taxRatePercent,
    account_id_snapshot: accountIdSnapshot ?? 'acct_sales'
  };
}

function assembleInvoice(state, payload) {
  const customer = requireCustomer(state, payload.customer_id);
  const issueDate = ensureDateInput(payload.issue_date ?? nowIso());
  const dueDate = ensureDateInput(payload.due_date ?? issueDate);
  const idNumber = takeCounter(state, 'invoice');
  const lines = (payload.lines ?? []).map((line) => buildInvoiceLine(state, line));
  ensureLines(lines);
  const totals = summariseLines(lines);
  const timestamp = nowIso();
  return {
    id: `inv_${idNumber}`,
    invoice_no: null,
    customer_id: customer.id,
    sales_order_id: payload.sales_order_id ?? null,
    status: 'draft',
    issue_date: issueDate,
    due_date: dueDate,
    currency: payload.currency ?? 'DKK',
    subtotal: totals.subtotal,
    tax_total: totals.taxTotal,
    total: totals.total,
    balance: totals.total,
    created_at: timestamp,
    updated_at: timestamp,
    lines,
    payments: []
  };
}

export function createInvoiceFromSalesOrder(state, order) {
  const invoiceId = takeCounter(state, 'invoice');
  const timestamp = nowIso();
  const lines = order.lines.map((line) => {
    const lineId = takeCounter(state, 'invoiceLine');
    return {
      id: `invline_${lineId}`,
      product_id: line.productId ?? line.product_id ?? null,
      description: line.description,
      qty: line.qty,
      unit_price_net: line.unit_price_net,
      discount_amount: line.discount_amount ?? 0,
      tax_rate_percent_snapshot: line.tax_rate_percent_snapshot ?? 0,
      account_id_snapshot: line.account_id_snapshot ?? 'acct_sales'
    };
  });
  const totals = summariseLines(lines);
  return {
    id: `inv_${invoiceId}`,
    invoice_no: null,
    customer_id: order.customer_id,
    sales_order_id: order.id,
    status: 'draft',
    issue_date: order.issue_date,
    due_date: order.due_date,
    currency: order.currency ?? 'DKK',
    subtotal: totals.subtotal,
    tax_total: totals.taxTotal,
    total: totals.total,
    balance: totals.total,
    created_at: timestamp,
    updated_at: timestamp,
    lines,
    payments: []
  };
}

export async function listInvoices() {
  const state = await readState();
  return state.invoices.map(clone);
}

export async function createInvoice(payload) {
  return mutateState((state) => {
    const invoice = assembleInvoice(state, payload);
    state.invoices.push(invoice);
    return clone(invoice);
  });
}

function determineInvoiceStatus(invoice) {
  if (invoice.status === 'void') {
    return 'void';
  }
  if (invoice.balance === 0) {
    return 'paid';
  }
  if (invoice.balance < invoice.total) {
    return 'partially_paid';
  }
  return invoice.status;
}

export async function issueInvoice(id) {
  return mutateState((state) => {
    const invoice = state.invoices.find((item) => item.id === id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    if (invoice.status !== 'draft') {
      throw new Error('Invoice must be in draft status to issue');
    }
    const invoiceNo = allocateInvoiceNumber(state, invoice.issue_date);
    invoice.invoice_no = invoiceNo;
    invoice.status = 'issued';
    invoice.issued_at = nowIso();
    invoice.updated_at = invoice.issued_at;
    appendJournalEntry(state, {
      date: invoice.issue_date,
      memo: `Issue invoice ${invoice.invoice_no}`,
      source: 'invoice_issue',
      sourceId: invoice.id,
      lines: [
        { accountId: 'acct_ar', debit: invoice.total },
        { accountId: 'acct_sales', credit: invoice.subtotal },
        ...(invoice.tax_total > 0
          ? [{ accountId: 'acct_output_vat', credit: invoice.tax_total }]
          : [])
      ]
    });
    return clone(invoice);
  });
}

export async function recordInvoicePayment(id, payload) {
  return mutateState((state) => {
    const invoice = state.invoices.find((item) => item.id === id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    if (!['issued', 'partially_paid'].includes(invoice.status)) {
      throw new Error('Invoice must be issued before recording payments');
    }
    if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
      throw new Error('Payment amount must be a positive integer');
    }
    if (payload.amount > invoice.balance) {
      throw new Error('Payment exceeds outstanding balance');
    }
    const payment = registerPayment(state, {
      type: 'AR',
      method: payload.method ?? 'other',
      amount: payload.amount,
      date: ensureDateInput(payload.date ?? nowIso()),
      reference: payload.reference ?? null,
      customer_id: invoice.customer_id
    });
    invoice.payments.push({ payment_id: payment.id, amount: payload.amount });
    invoice.balance -= payload.amount;
    invoice.status = determineInvoiceStatus(invoice);
    invoice.updated_at = nowIso();
    appendJournalEntry(state, {
      date: payment.date,
      memo: `Payment for invoice ${invoice.invoice_no ?? invoice.id}`,
      source: 'invoice_payment',
      sourceId: invoice.id,
      lines: [
        { accountId: 'acct_bank', debit: payload.amount },
        { accountId: 'acct_ar', credit: payload.amount }
      ]
    });
    return clone(invoice);
  });
}

export async function voidInvoice(id, payload = {}) {
  return mutateState((state) => {
    const invoice = state.invoices.find((item) => item.id === id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    if (invoice.status === 'void') {
      throw new Error('Invoice already voided');
    }
    if (invoice.payments.length > 0) {
      throw new Error('Cannot void an invoice with recorded payments');
    }
    const voidDate = ensureDateInput(payload.date ?? nowIso());
    if (invoice.status !== 'draft') {
      appendJournalEntry(state, {
        date: voidDate,
        memo: `Void invoice ${invoice.invoice_no ?? invoice.id}`,
        source: 'invoice_void',
        sourceId: invoice.id,
        lines: [
          { accountId: 'acct_sales', debit: invoice.subtotal },
          ...(invoice.tax_total > 0
            ? [{ accountId: 'acct_output_vat', debit: invoice.tax_total }]
            : []),
          { accountId: 'acct_ar', credit: invoice.total }
        ]
      });
    }
    invoice.status = 'void';
    invoice.balance = 0;
    invoice.updated_at = nowIso();
    return clone(invoice);
  });
}
