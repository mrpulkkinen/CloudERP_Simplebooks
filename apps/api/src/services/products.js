import { readState, mutateState } from '../lib/store.js';
import { takeCounter } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureInteger(value, field) {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
}

function buildProductPayload(input, existing = {}) {
  if (!input.name && !existing.name) {
    throw new Error('Product name is required');
  }
  if (input.unit_price_net !== undefined) {
    ensureInteger(input.unit_price_net, 'unit_price_net');
  }
  const timestamp = nowIso();
  return {
    id: existing.id ?? null,
    sku: input.sku ?? existing.sku ?? null,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description ?? null,
    unitPriceNet: input.unit_price_net ?? existing.unitPriceNet ?? 0,
    incomeAccountId: input.income_account_id ?? existing.incomeAccountId ?? 'acct_sales',
    isService: input.is_service ?? existing.isService ?? true,
    taxRateId: input.tax_rate_id ?? existing.taxRateId ?? 'tax_default',
    isActive: input.is_active ?? existing.isActive ?? true,
    createdAt: existing.createdAt ?? timestamp,
    updatedAt: timestamp
  };
}

export async function listProducts() {
  const state = await readState();
  return state.products.map(clone);
}

export async function createProduct(payload) {
  return mutateState((state) => {
    const product = buildProductPayload(payload);
    const idNumber = takeCounter(state, 'product');
    product.id = `prod_${idNumber}`;
    state.products.push(product);
    return clone(product);
  });
}

export async function updateProduct(id, payload) {
  return mutateState((state) => {
    const existing = state.products.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Product ${id} not found`);
    }
    const updated = buildProductPayload(payload, existing);
    updated.id = existing.id;
    state.products = state.products.map((item) =>
      item.id === id ? updated : item
    );
    return clone(updated);
  });
}
