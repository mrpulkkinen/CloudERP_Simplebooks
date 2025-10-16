import { mutateState, readState } from '../lib/store.js';
import { allocateBillNumber, takeCounter } from '../lib/ids.js';
import { requireVendor, requireAccount, requireTaxRate } from '../lib/lookups.js';
import { ensureDateInput, nowIso } from '../lib/time.js';
import { summariseLines } from '../lib/money.js';
import { appendJournalEntry } from './journal.js';
import { registerPayment } from './payments.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('Bill requires at least one line');
  }
}

function buildBillLine(state, payload) {
  const lineId = takeCounter(state, 'billLine');
  let accountId = payload.account_id_snapshot ?? null;
  let taxPercent = payload.tax_rate_percent_snapshot ?? null;
  if (!accountId) {
    throw new Error('Bill line requires account_id_snapshot');
  }
  requireAccount(state, accountId);
  if (!Number.isInteger(payload.unit_price_net)) {
    throw new Error('Bill line requires unit_price_net as integer');
  }
  if (taxPercent === null || taxPercent === undefined) {
    if (payload.tax_rate_id) {
      const taxRate = requireTaxRate(state, payload.tax_rate_id);
      taxPercent = taxRate.ratePercent;
    } else {
      taxPercent = 0;
    }
  }
  return {
    id: `billline_${lineId}`,
    description: payload.description ?? 'Expense line',
    qty: payload.qty ?? 1,
    unit_price_net: payload.unit_price_net,
    discount_amount: payload.discount_amount ?? 0,
    tax_rate_percent_snapshot: taxPercent,
    account_id_snapshot: accountId
  };
}

function assembleBill(state, payload) {
  const vendor = requireVendor(state, payload.vendor_id);
  const issueDate = ensureDateInput(payload.issue_date ?? nowIso());
  const dueDate = ensureDateInput(payload.due_date ?? issueDate);
  const idNumber = takeCounter(state, 'bill');
  const lines = (payload.lines ?? []).map((line) => buildBillLine(state, line));
  ensureLines(lines);
  const totals = summariseLines(lines);
  const timestamp = nowIso();
  return {
    id: `bill_${idNumber}`,
    bill_no: null,
    vendor_id: vendor.id,
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

export async function listBills() {
  const state = await readState();
  return state.bills.map(clone);
}

export async function createBill(payload) {
  return mutateState((state) => {
    const bill = assembleBill(state, payload);
    state.bills.push(bill);
    return clone(bill);
  });
}

function determineBillStatus(bill) {
  if (bill.status === 'void') {
    return 'void';
  }
  if (bill.balance === 0) {
    return 'paid';
  }
  if (bill.balance < bill.total) {
    return 'partially_paid';
  }
  return bill.status;
}

export async function approveBill(id) {
  return mutateState((state) => {
    const bill = state.bills.find((item) => item.id === id);
    if (!bill) {
      throw new Error(`Bill ${id} not found`);
    }
    if (bill.status !== 'draft') {
      throw new Error('Bill must be in draft status to approve');
    }
    bill.bill_no = allocateBillNumber(state, bill.issue_date);
    bill.status = 'approved';
    bill.approved_at = nowIso();
    bill.updated_at = bill.approved_at;
    appendJournalEntry(state, {
      date: bill.issue_date,
      memo: `Approve bill ${bill.bill_no}`,
      source: 'bill_approve',
      sourceId: bill.id,
      lines: [
        { accountId: 'acct_ap', credit: bill.total },
        { accountId: 'acct_office_expense', debit: bill.subtotal },
        ...(bill.tax_total > 0
          ? [{ accountId: 'acct_input_vat', debit: bill.tax_total }]
          : [])
      ]
    });
    return clone(bill);
  });
}

export async function recordBillPayment(id, payload) {
  return mutateState((state) => {
    const bill = state.bills.find((item) => item.id === id);
    if (!bill) {
      throw new Error(`Bill ${id} not found`);
    }
    if (!['approved', 'partially_paid'].includes(bill.status)) {
      throw new Error('Bill must be approved before recording payments');
    }
    if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
      throw new Error('Payment amount must be a positive integer');
    }
    if (payload.amount > bill.balance) {
      throw new Error('Payment exceeds outstanding balance');
    }
    const payment = registerPayment(state, {
      type: 'AP',
      method: payload.method ?? 'other',
      amount: payload.amount,
      date: ensureDateInput(payload.date ?? nowIso()),
      reference: payload.reference ?? null,
      vendor_id: bill.vendor_id
    });
    bill.payments.push({ payment_id: payment.id, amount: payload.amount });
    bill.balance -= payload.amount;
    bill.status = determineBillStatus(bill);
    bill.updated_at = nowIso();
    appendJournalEntry(state, {
      date: payment.date,
      memo: `Payment for bill ${bill.bill_no ?? bill.id}`,
      source: 'bill_payment',
      sourceId: bill.id,
      lines: [
        { accountId: 'acct_ap', debit: payload.amount },
        { accountId: 'acct_bank', credit: payload.amount }
      ]
    });
    return clone(bill);
  });
}

export async function voidBill(id, payload = {}) {
  return mutateState((state) => {
    const bill = state.bills.find((item) => item.id === id);
    if (!bill) {
      throw new Error(`Bill ${id} not found`);
    }
    if (bill.status === 'void') {
      throw new Error('Bill already voided');
    }
    if (bill.payments.length > 0) {
      throw new Error('Cannot void a bill with recorded payments');
    }
    const voidDate = ensureDateInput(payload.date ?? nowIso());
    if (bill.status !== 'draft') {
      appendJournalEntry(state, {
        date: voidDate,
        memo: `Void bill ${bill.bill_no ?? bill.id}`,
        source: 'bill_void',
        sourceId: bill.id,
        lines: [
          { accountId: 'acct_ap', debit: bill.total },
          { accountId: 'acct_office_expense', credit: bill.subtotal },
          ...(bill.tax_total > 0
            ? [{ accountId: 'acct_input_vat', credit: bill.tax_total }]
            : [])
        ]
      });
    }
    bill.status = 'void';
    bill.balance = 0;
    bill.updated_at = nowIso();
    return clone(bill);
  });
}
