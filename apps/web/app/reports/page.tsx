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

type AgingBucket = 'current' | 'oneToThirty' | 'thirtyOneToSixty' | 'sixtyOneToNinety' | 'ninetyPlus';

interface AgingTotals {
  current: number;
  oneToThirty: number;
  thirtyOneToSixty: number;
  sixtyOneToNinety: number;
  ninetyPlus: number;
  total: number;
}

interface ARAgingItem {
  id: string;
  documentNo: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  balance: number;
  daysPastDue: number;
  bucket: AgingBucket;
}

interface APAgingItem {
  id: string;
  documentNo: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  balance: number;
  daysPastDue: number;
  bucket: AgingBucket;
}

interface AgingResponse<T> {
  asOf: string;
  totals: AgingTotals;
  items: T[];
}

const bucketLabels: Record<AgingBucket, string> = {
  current: 'Current',
  oneToThirty: '1–30 days',
  thirtyOneToSixty: '31–60 days',
  sixtyOneToNinety: '61–90 days',
  ninetyPlus: '90+ days'
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

function renderAgingTotals(totals: AgingTotals) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Bucket</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(bucketLabels) as AgingBucket[]).map((bucket) => (
          <tr key={bucket}>
            <td>{bucketLabels[bucket]}</td>
            <td>{formatDKK(totals[bucket])}</td>
          </tr>
        ))}
        <tr>
          <td>Total</td>
          <td>{formatDKK(totals.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default async function ReportsPage() {
  let trialBalance: TrialBalanceResponse | null = null;
  let arAging: AgingResponse<ARAgingItem> | null = null;
  let apAging: AgingResponse<APAgingItem> | null = null;
  let loadError: string | null = null;

  try {
    const [trialBalanceResponse, arAgingResponse, apAgingResponse] = await Promise.all([
      apiFetch<TrialBalanceResponse>('/reports/trial-balance'),
      apiFetch<AgingResponse<ARAgingItem>>('/reports/ar-aging'),
      apiFetch<AgingResponse<APAgingItem>>('/reports/ap-aging')
    ]);
    trialBalance = trialBalanceResponse;
    arAging = arAgingResponse;
    apAging = apAgingResponse;
  } catch (error) {
    console.error('Failed to load reports', error);
    loadError = 'Unable to load reports from the API.';
  }

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Trial Balance</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : trialBalance && trialBalance.data.length > 0 ? (
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
              {trialBalance.data.map((row) => (
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
                <td>{formatDKK(trialBalance.totals.debit)}</td>
                <td>{formatDKK(trialBalance.totals.credit)}</td>
                <td>{formatDKK(trialBalance.totals.balance)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="empty-state">Ledger is empty. Post invoices or bills to see balances.</div>
        )}
      </section>
      <section className="card">
        <h2>Accounts Receivable Aging</h2>
        {arAging ? (
          <>
            {renderAgingTotals(arAging.totals)}
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Due Date</th>
                  <th>Days Past Due</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {arAging.items.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No open invoices.</td>
                  </tr>
                ) : (
                  arAging.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.documentNo}</td>
                      <td>{item.customerName}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td>{item.daysPastDue <= 0 ? 'Current' : `${item.daysPastDue} days`}</td>
                      <td>{formatDKK(item.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <p>{loadError ?? 'Unable to load AR aging.'}</p>
        )}
      </section>
      <section className="card">
        <h2>Accounts Payable Aging</h2>
        {apAging ? (
          <>
            {renderAgingTotals(apAging.totals)}
            <table className="table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Vendor</th>
                  <th>Due Date</th>
                  <th>Days Past Due</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {apAging.items.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No open bills.</td>
                  </tr>
                ) : (
                  apAging.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.documentNo}</td>
                      <td>{item.vendorName}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td>{item.daysPastDue <= 0 ? 'Current' : `${item.daysPastDue} days`}</td>
                      <td>{formatDKK(item.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <p>{loadError ?? 'Unable to load AP aging.'}</p>
        )}
      </section>
    </div>
  );
}
