import { describe, expect, it } from 'vitest';

import { formatDKK } from './money';

describe('formatDKK', () => {
  it('formats øre into kroner currency', () => {
    const formatted = formatDKK(12345);
    expect(formatted).toMatch(/123,45/);
    expect(formatted.toLowerCase()).toContain('kr');
  });
});
