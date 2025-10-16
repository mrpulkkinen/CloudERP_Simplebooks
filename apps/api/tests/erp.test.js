import test from 'node:test';
import assert from 'node:assert/strict';
import { resetDatabase } from './helpers.js';
import { createCustomer } from '../src/services/customers.js';
import { createProduct } from '../src/services/products.js';
import {
  createSalesOrder,
  confirmSalesOrder,
  convertSalesOrderToInvoice
} from '../src/services/salesOrders.js';
import {
  issueInvoice,
  recordInvoicePayment,
  listInvoices
} from '../src/services/invoices.js';
import { accountBalances, ensureLedgerBalanced } from '../src/services/journal.js';
import { createVendor } from '../src/services/vendors.js';
import { createBill, approveBill, recordBillPayment } from '../src/services/bills.js';
import { buildTrialBalance, buildAgingReport } from '../src/services/reports.js';

await resetDatabase();

test('accounts receivable flow posts balanced journals', async () => {
  await resetDatabase();
  const customer = await createCustomer({ name: 'ACME ApS' });
  const product = await createProduct({
    name: 'Subscription',
    unit_price_net: 10000,
    income_account_id: 'acct_sales',
    tax_rate_id: 'tax_default'
  });
  const order = await createSalesOrder({
    customer_id: customer.id,
    issue_date: '2024-01-05',
    due_date: '2024-01-20',
    lines: [
      { product_id: product.id, qty: 2 },
      {
        description: 'Consulting day',
        unit_price_net: 5000,
        tax_rate_percent_snapshot: 25,
        account_id_snapshot: 'acct_sales'
      }
    ]
  });
  assert.equal(order.status, 'draft');
  await confirmSalesOrder(order.id);
  const invoiceDraft = await convertSalesOrderToInvoice(order.id);
  assert.equal(invoiceDraft.status, 'draft');
  const issued = await issueInvoice(invoiceDraft.id);
  assert.equal(issued.status, 'issued');
  assert.ok(issued.invoice_no?.startsWith('INV-'));
  assert.equal(issued.total, 31250);
  const partial = await recordInvoicePayment(issued.id, {
    amount: 15000,
    method: 'bank_transfer',
    date: '2024-01-10'
  });
  assert.equal(partial.status, 'partially_paid');
  const paid = await recordInvoicePayment(issued.id, {
    amount: 16250,
    method: 'bank_transfer',
    date: '2024-01-18'
  });
  assert.equal(paid.status, 'paid');
  assert.equal(paid.balance, 0);

  const balances = await accountBalances('2024-12-31');
  const bank = balances.find((acct) => acct.accountId === 'acct_bank');
  const ar = balances.find((acct) => acct.accountId === 'acct_ar');
  const sales = balances.find((acct) => acct.accountId === 'acct_sales');
  const outputVat = balances.find((acct) => acct.accountId === 'acct_output_vat');
  assert.equal(bank.balance, 31250);
  assert.equal(ar.balance, 0);
  assert.equal(sales.balance, -25000);
  assert.equal(outputVat.balance, -6250);
  await ensureLedgerBalanced();
});

test('accounts payable flow posts balanced journals', async () => {
  await resetDatabase();
  const vendor = await createVendor({ name: 'Office Supply Co.' });
  const bill = await createBill({
    vendor_id: vendor.id,
    issue_date: '2024-01-06',
    due_date: '2024-01-25',
    lines: [
      {
        description: 'Office chairs',
        unit_price_net: 8000,
        tax_rate_percent_snapshot: 25,
        account_id_snapshot: 'acct_office_expense'
      }
    ]
  });
  assert.equal(bill.status, 'draft');
  const approved = await approveBill(bill.id);
  assert.equal(approved.status, 'approved');
  assert.equal(approved.total, 10000);
  const paid = await recordBillPayment(bill.id, {
    amount: 10000,
    method: 'bank_transfer',
    date: '2024-01-28'
  });
  assert.equal(paid.status, 'paid');
  assert.equal(paid.balance, 0);
  const balances = await accountBalances('2024-12-31');
  const ap = balances.find((acct) => acct.accountId === 'acct_ap');
  const bank = balances.find((acct) => acct.accountId === 'acct_bank');
  const expense = balances.find((acct) => acct.accountId === 'acct_office_expense');
  const inputVat = balances.find((acct) => acct.accountId === 'acct_input_vat');
  assert.equal(ap.balance, 0);
  assert.equal(bank.balance, -10000);
  assert.equal(expense.balance, 8000);
  assert.equal(inputVat.balance, 2000);
  await ensureLedgerBalanced();
});

test('trial balance equation holds and aging buckets aggregate balances', async () => {
  await resetDatabase();
  const customer = await createCustomer({ name: 'Aging Test Customer' });
  const product = await createProduct({
    name: 'Service',
    unit_price_net: 5000,
    income_account_id: 'acct_sales',
    tax_rate_id: 'tax_default'
  });
  const invoice = await createSalesOrder({
    customer_id: customer.id,
    issue_date: '2024-02-01',
    due_date: '2024-02-10',
    lines: [{ product_id: product.id, qty: 1 }]
  });
  await confirmSalesOrder(invoice.id);
  const invoiceDoc = await convertSalesOrderToInvoice(invoice.id);
  await issueInvoice(invoiceDoc.id);
  await recordInvoicePayment(invoiceDoc.id, {
    amount: 2500,
    method: 'bank_transfer',
    date: '2024-02-15'
  });

  const vendor = await createVendor({ name: 'Aging Vendor' });
  const bill = await createBill({
    vendor_id: vendor.id,
    issue_date: '2024-02-05',
    due_date: '2024-02-18',
    lines: [
      {
        description: 'Supplies',
        unit_price_net: 4000,
        tax_rate_percent_snapshot: 25,
        account_id_snapshot: 'acct_office_expense'
      }
    ]
  });
  await approveBill(bill.id);
  await recordBillPayment(bill.id, {
    amount: 2000,
    method: 'bank_transfer',
    date: '2024-02-20'
  });

  const trialBalance = await buildTrialBalance('2024-03-31');
  assert.ok(trialBalance.equationBalanced);
  const arAging = await buildAgingReport('AR', '2024-03-31');
  const apAging = await buildAgingReport('AP', '2024-03-31');
  const arTotal = arAging.buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const apTotal = apAging.buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  assert.ok(arTotal > 0);
  assert.ok(apTotal > 0);
});
