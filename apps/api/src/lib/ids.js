export function takeCounter(state, key) {
  if (typeof state.counters[key] !== 'number') {
    throw new Error(`Counter ${key} not configured`);
  }
  state.counters[key] += 1;
  return state.counters[key];
}

function nextSequenceValue(container, issueDate, prefix) {
  const year = new Date(issueDate).getFullYear();
  const key = String(year);
  if (!container[key]) {
    container[key] = 1;
  }
  const next = container[key];
  container[key] += 1;
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

export function allocateInvoiceNumber(state, issueDate) {
  return nextSequenceValue(state.organization.invoiceSequences, issueDate, 'INV');
}

export function allocateBillNumber(state, issueDate) {
  return nextSequenceValue(state.organization.billSequences, issueDate, 'BILL');
}

export function allocateSalesOrderNumber(state, issueDate) {
  return nextSequenceValue(state.organization.salesOrderSequences, issueDate, 'SO');
}
