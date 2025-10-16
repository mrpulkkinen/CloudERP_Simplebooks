import { readState, mutateState } from '../lib/store.js';
import { takeCounter } from '../lib/ids.js';
import { nowIso } from '../lib/time.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureNumber(value, field) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${field} must be a number`);
  }
}

function buildTaxRatePayload(input, existing = {}) {
  if (!input.name && !existing.name) {
    throw new Error('Tax rate name is required');
  }
  if (input.rate_percent !== undefined) {
    ensureNumber(input.rate_percent, 'rate_percent');
  }
  const timestamp = nowIso();
  return {
    id: existing.id ?? null,
    name: input.name ?? existing.name,
    ratePercent: input.rate_percent ?? existing.ratePercent ?? 0,
    isActive: input.is_active ?? existing.isActive ?? true,
    createdAt: existing.createdAt ?? timestamp,
    updatedAt: timestamp
  };
}

export async function listTaxRates() {
  const state = await readState();
  return state.taxRates.map(clone);
}

export async function createTaxRate(payload) {
  return mutateState((state) => {
    const taxRate = buildTaxRatePayload(payload);
    const idNumber = takeCounter(state, 'taxRate');
    taxRate.id = `tax_${idNumber}`;
    state.taxRates.push(taxRate);
    return clone(taxRate);
  });
}

export async function updateTaxRate(id, payload) {
  return mutateState((state) => {
    const existing = state.taxRates.find((item) => item.id === id);
    if (!existing) {
      throw new Error(`Tax rate ${id} not found`);
    }
    const updated = buildTaxRatePayload(payload, existing);
    updated.id = existing.id;
    state.taxRates = state.taxRates.map((item) =>
      item.id === id ? updated : item
    );
    return clone(updated);
  });
}
