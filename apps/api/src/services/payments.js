import { readState, mutateState } from '../lib/store.js';
import { takeCounter } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Payment amount must be a positive integer');
  }
}

export function registerPayment(state, payload) {
  ensureAmount(payload.amount);
  const paymentId = takeCounter(state, 'payment');
  const payment = {
    id: `pay_${paymentId}`,
    type: payload.type,
    method: payload.method ?? 'other',
    amount: payload.amount,
    date: payload.date ?? nowIso(),
    reference: payload.reference ?? null,
    customer_id: payload.customer_id ?? null,
    vendor_id: payload.vendor_id ?? null
  };
  state.payments.push(payment);
  return payment;
}

export async function listPayments() {
  const state = await readState();
  return state.payments.map(clone);
}

export async function createStandalonePayment(payload) {
  return mutateState((state) => clone(registerPayment(state, payload)));
}
