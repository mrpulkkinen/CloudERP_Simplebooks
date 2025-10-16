import { readState, mutateState } from '../lib/store.js';
import { takeCounter } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCustomerPayload(input, existing = {}) {
  if (!input.name && !existing.name) {
    throw new Error('Customer name is required');
  }
  const timestamp = nowIso();
  return {
    id: existing.id ?? null,
    name: input.name ?? existing.name,
    email: input.email ?? existing.email ?? null,
    phone: input.phone ?? existing.phone ?? null,
    billingAddress: input.billing_address ?? existing.billingAddress ?? {},
    shippingAddress: input.shipping_address ?? existing.shippingAddress ?? {},
    vatNumber: input.vat_number ?? existing.vatNumber ?? null,
    notes: input.notes ?? existing.notes ?? null,
    isArchived: input.is_archived ?? existing.isArchived ?? false,
    createdAt: existing.createdAt ?? timestamp,
    updatedAt: timestamp
  };
}

export async function listCustomers() {
  const state = await readState();
  return state.customers.map(clone);
}

export async function createCustomer(payload) {
  return mutateState((state) => {
    const customer = buildCustomerPayload(payload);
    const idNumber = takeCounter(state, 'customer');
    customer.id = `cus_${idNumber}`;
    state.customers.push(customer);
    return clone(customer);
  });
}

export async function updateCustomer(id, payload) {
  return mutateState((state) => {
    const existing = state.customers.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Customer ${id} not found`);
    }
    const updated = buildCustomerPayload(payload, existing);
    updated.id = existing.id;
    state.customers = state.customers.map((item) =>
      item.id === id ? updated : item
    );
    return clone(updated);
  });
}
