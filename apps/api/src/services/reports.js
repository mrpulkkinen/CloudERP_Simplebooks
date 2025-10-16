import { accountBalances } from './journal.js';
import { readState } from '../lib/store.js';
import { nowIso } from '../lib/time.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function buildTrialBalance(asOfDate = nowIso()) {
  const accounts = await accountBalances(asOfDate);
  const totals = {
    assets: 0,
    liabilities: 0,
    equity: 0,
    income: 0,
    expenses: 0
  };
  for (const account of accounts) {
    const debitBalance = account.debit;
    const creditBalance = account.credit;
    switch (account.type) {
      case 'asset':
        totals.assets += debitBalance - creditBalance;
        break;
      case 'liability':
        totals.liabilities += creditBalance - debitBalance;
        break;
      case 'equity':
        totals.equity += creditBalance - debitBalance;
        break;
      case 'income':
        totals.income += creditBalance - debitBalance;
        break;
      case 'expense':
        totals.expenses += debitBalance - creditBalance;
        break;
      default:
        break;
    }
  }
  const leftSide = totals.assets + totals.expenses;
  const rightSide = totals.liabilities + totals.equity + totals.income;
  return {
    asOf: asOfDate,
    accounts,
    totals,
    equationBalanced: leftSide === rightSide
  };
}

const AGING_BUCKETS = [
  { name: '0-30', min: 0, max: 30 },
  { name: '31-60', min: 31, max: 60 },
  { name: '61-90', min: 61, max: 90 },
  { name: '90+', min: 91, max: Infinity }
];

function daysBetween(from, to) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function bucketAmount(result, days, amount) {
  const overdue = Math.max(days, 0);
  for (const bucket of AGING_BUCKETS) {
    if (overdue >= bucket.min && overdue <= bucket.max) {
      result[bucket.name] += amount;
      return bucket.name;
    }
  }
  return AGING_BUCKETS[AGING_BUCKETS.length - 1].name;
}

function initBucketTotals() {
  const totals = {};
  for (const bucket of AGING_BUCKETS) {
    totals[bucket.name] = 0;
  }
  return totals;
}

export async function buildAgingReport(type, asOfDate = nowIso()) {
  const state = await readState();
  const bucketTotals = initBucketTotals();
  const items = [];
  if (type === 'AR') {
    for (const invoice of state.invoices) {
      if (invoice.status === 'void' || invoice.balance <= 0) {
        continue;
      }
      const days = daysBetween(invoice.due_date, asOfDate);
      const bucketName = bucketAmount(bucketTotals, days, invoice.balance);
      items.push({
        document_id: invoice.id,
        customer_id: invoice.customer_id,
        due_date: invoice.due_date,
        balance: invoice.balance,
        days_overdue: Math.max(days, 0),
        bucket: bucketName
      });
    }
  } else if (type === 'AP') {
    for (const bill of state.bills) {
      if (bill.status === 'void' || bill.balance <= 0) {
        continue;
      }
      const days = daysBetween(bill.due_date, asOfDate);
      const bucketName = bucketAmount(bucketTotals, days, bill.balance);
      items.push({
        document_id: bill.id,
        vendor_id: bill.vendor_id,
        due_date: bill.due_date,
        balance: bill.balance,
        days_overdue: Math.max(days, 0),
        bucket: bucketName
      });
    }
  } else {
    throw new Error('Unsupported aging type');
  }
  return {
    asOf: asOfDate,
    buckets: AGING_BUCKETS.map((bucket) => ({ name: bucket.name, amount: bucketTotals[bucket.name] })),
    detail: items.map(clone)
  };
}
