import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface LedgerLine {
  id: string;
  debit: number;
  credit: number;
  account: {
    code: string;
    name: string;
  };
}

interface LedgerEntry {
  id: string;
  date: string;
  memo?: string | null;
  source: string;
  lines: LedgerLine[];
}

interface LedgerResponse {
  data: LedgerEntry[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function LedgerPage() {
  let entries: LedgerEntry[] = [];
  let loadError: string | null = null;

  try {
    const response = await apiFetch<LedgerResponse>('/ledger');
    entries = response.data;
  } catch (error) {
    console.error('Failed to load ledger', error);
    loadError = 'Unable to load ledger data from the API.';
  }

  return (
    <section className="card">
      <h2>General Ledger</h2>
      {loadError ? (
        <p>{loadError}</p>
      ) : entries.length === 0 ? (
        <div className="empty-state">No journal entries yet. Post invoices or bills to populate the ledger.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Memo</th>
              <th>Account</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {entries.flatMap((entry) =>
              entry.lines.map((line) => (
                <tr key={`${entry.id}-${line.id}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.memo ?? entry.source}</td>
                  <td>
                    {line.account.code} – {line.account.name}
                  </td>
                  <td>{line.debit > 0 ? formatDKK(line.debit) : '—'}</td>
                  <td>{line.credit > 0 ? formatDKK(line.credit) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
