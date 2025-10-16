import { readState, mutateState } from '../lib/store.js';
import { takeCounter } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildVendorPayload(input, existing = {}) {
  if (!input.name && !existing.name) {
    throw new Error('Vendor name is required');
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

export async function listVendors() {
  const state = await readState();
  return state.vendors.map(clone);
}

export async function createVendor(payload) {
  return mutateState((state) => {
    const vendor = buildVendorPayload(payload);
    const idNumber = takeCounter(state, 'vendor');
    vendor.id = `ven_${idNumber}`;
    state.vendors.push(vendor);
    return clone(vendor);
  });
}

export async function updateVendor(id, payload) {
  return mutateState((state) => {
    const existing = state.vendors.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Vendor ${id} not found`);
    }
    const updated = buildVendorPayload(payload, existing);
    updated.id = existing.id;
    state.vendors = state.vendors.map((item) =>
      item.id === id ? updated : item
    );
    return clone(updated);
  });
}
