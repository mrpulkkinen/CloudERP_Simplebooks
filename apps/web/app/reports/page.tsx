import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceResponse {
  data: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
}

export default async function ReportsPage() {
  let rows: TrialBalanceRow[] = [];
  let totals = { debit: 0, credit: 0, balance: 0 };
  let loadError: string | null = null;

  try {
    const response = await apiFetch<TrialBalanceResponse>('/reports/trial-balance');
    rows = response.data;
    totals = response.totals;
  } catch (error) {
    console.error('Failed to load trial balance', error);
    loadError = 'Unable to load reports from the API.';
  }

  return (
    <section className="card">
      <h2>Trial Balance</h2>
      {loadError ? (
        <p>{loadError}</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">Ledger is empty. Post invoices or bills to see balances.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.accountCode}>
                <td>
                  {row.accountCode} – {row.accountName}
                </td>
                <td>{row.debit > 0 ? formatDKK(row.debit) : '—'}</td>
                <td>{row.credit > 0 ? formatDKK(row.credit) : '—'}</td>
                <td>{row.balance !== 0 ? formatDKK(row.balance) : '—'}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              <td>{formatDKK(totals.debit)}</td>
              <td>{formatDKK(totals.credit)}</td>
              <td>{formatDKK(totals.balance)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
