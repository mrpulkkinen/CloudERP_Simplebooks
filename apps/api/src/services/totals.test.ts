import { describe, it, expect } from 'vitest';

import { computeLineTotals } from './totals.js';

describe('computeLineTotals', () => {
  it('calculates subtotals and tax amounts with different rates', () => {
    const lines = [
      { quantity: 2, unitPriceNet: 10000, taxRateId: 'vat' },
      { quantity: 1.5, unitPriceNet: 5000 }
    ];
    const vatMap = new Map<string, number>([['vat', 25]]);

    const results = computeLineTotals(lines, vatMap);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      lineTotal: 20000,
      taxAmount: 5000,
      taxRatePercent: 25
    });
    expect(results[1]).toEqual({
      lineTotal: 7500,
      taxAmount: 0,
      taxRatePercent: undefined
    });
  });
});
