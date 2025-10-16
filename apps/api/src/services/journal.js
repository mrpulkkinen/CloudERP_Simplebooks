import { mutateState, readState } from '../lib/store.js';
import { takeCounter } from '../lib/ids.js';

function ensurePositiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
}

function cloneEntry(entry) {
  return JSON.parse(JSON.stringify(entry));
}

function normaliseLines(state, lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('Journal entry requires at least one line');
  }
  let debitTotal = 0;
  let creditTotal = 0;
  const normalised = lines.map((line) => {
    if (!line.accountId) {
      throw new Error('Journal line requires accountId');
    }
    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;
    ensurePositiveInteger(debit, 'debit');
    ensurePositiveInteger(credit, 'credit');
    if (debit > 0 && credit > 0) {
      throw new Error('Journal line cannot have both debit and credit amounts');
    }
    debitTotal += debit;
    creditTotal += credit;
    return {
      accountId: line.accountId,
      debit,
      credit
    };
  });
  if (debitTotal !== creditTotal) {
    throw new Error('Journal entry is not balanced');
  }
  return { lines: normalised, debitTotal, creditTotal };
}

export function appendJournalEntry(state, { date, memo, source, sourceId, lines }) {
  if (!date) {
    throw new Error('Journal date is required');
  }
  const { lines: normalised } = normaliseLines(state, lines);
  const entryIdNumber = takeCounter(state, 'journalEntry');
  const entry = {
    id: `je_${entryIdNumber}`,
    date,
    memo: memo ?? null,
    source: source ?? null,
    sourceId: sourceId ?? null,
    lines: []
  };
  for (const line of normalised) {
    const lineIdNumber = takeCounter(state, 'journalLine');
    entry.lines.push({
      id: `jl_${lineIdNumber}`,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit
    });
  }
  state.journalEntries.push(entry);
  return entry;
}

export async function createJournalEntry({ date, memo, source, sourceId, lines }) {
  return mutateState((state) => cloneEntry(appendJournalEntry(state, { date, memo, source, sourceId, lines })));
}

export async function listJournalEntries({ accountId, from, to } = {}) {
  const state = await readState();
  return state.journalEntries
    .filter((entry) => {
      if (accountId && !entry.lines.some((line) => line.accountId === accountId)) {
        return false;
      }
      if (from && new Date(entry.date) < new Date(from)) {
        return false;
      }
      if (to && new Date(entry.date) > new Date(to)) {
        return false;
      }
      return true;
    })
    .map(cloneEntry);
}

export async function calculateTrialBalance(asOfDate) {
  const entries = await listJournalEntries({ to: asOfDate });
  const balances = new Map();
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!balances.has(line.accountId)) {
        balances.set(line.accountId, { debit: 0, credit: 0 });
      }
      const summary = balances.get(line.accountId);
      summary.debit += line.debit;
      summary.credit += line.credit;
    }
  }
  return balances;
}

export async function accountBalances(asOfDate) {
  const balances = await calculateTrialBalance(asOfDate);
  const state = await readState();
  return state.accounts.map((account) => {
    const summary = balances.get(account.id) ?? { debit: 0, credit: 0 };
    const balance = summary.debit - summary.credit;
    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: summary.debit,
      credit: summary.credit,
      balance
    };
  });
}

export async function ensureLedgerBalanced() {
  const state = await readState();
  for (const entry of state.journalEntries) {
    const debitTotal = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    if (debitTotal !== creditTotal) {
      throw new Error(`Journal entry ${entry.id} is not balanced`);
    }
  }
}
