function ensureInteger(value, field) {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
}

export function calculateLineTotals(line) {
  const qty = line.qty ?? 1;
  if (typeof qty !== 'number' || qty <= 0) {
    throw new Error('qty must be a positive number');
  }
  ensureInteger(line.unit_price_net, 'unit_price_net');
  const discount = line.discount_amount ?? 0;
  ensureInteger(discount, 'discount_amount');
  const netAmount = Math.round(qty * line.unit_price_net) - discount;
  if (netAmount < 0) {
    throw new Error('Line net amount cannot be negative');
  }
  const taxPercent = line.tax_rate_percent_snapshot ?? 0;
  const taxAmount = Math.round((netAmount * taxPercent) / 100);
  const total = netAmount + taxAmount;
  return {
    netAmount,
    taxAmount,
    total
  };
}

export function summariseLines(lines) {
  return lines.reduce(
    (acc, line) => {
      const totals = calculateLineTotals(line);
      acc.subtotal += totals.netAmount;
      acc.taxTotal += totals.taxAmount;
      acc.total += totals.total;
      return acc;
    },
    { subtotal: 0, taxTotal: 0, total: 0 }
  );
}

export function formatOre(value) {
  const amount = (value / 100).toFixed(2);
  return `${amount} DKK`;
}
