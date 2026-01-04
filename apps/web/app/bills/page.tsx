import { NewBillForm } from '../../components/NewBillForm';
import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface BillVendor {
  id: string;
  name: string;
}

interface Bill {
  id: string;
  billNo: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  balance: number;
  status: string;
  vendor: BillVendor;
}

interface BillsResponse {
  data: Bill[];
}

interface VendorsResponse {
  data: Array<{ id: string; name: string }>;
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
}

interface TaxRatesResponse {
  data: TaxRate[];
}

interface Account {
  code: string;
  name: string;
}

interface AccountsResponse {
  data: Account[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function BillsPage() {
  let bills: Bill[] = [];
  let vendors: Array<{ id: string; name: string }> = [];
  let taxRates: TaxRate[] = [];
  let accounts: Account[] = [];
  let loadError: string | null = null;

  try {
    const [billsResponse, vendorsResponse, taxRatesResponse, accountsResponse] = await Promise.all([
      apiFetch<BillsResponse>('/bills'),
      apiFetch<VendorsResponse>('/vendors'),
      apiFetch<TaxRatesResponse>('/tax-rates'),
      apiFetch<AccountsResponse>('/accounts?type=EXPENSE')
    ]);

    bills = billsResponse.data;
    vendors = vendorsResponse.data;
    taxRates = taxRatesResponse.data;
    accounts = accountsResponse.data;
  } catch (error) {
    console.error('Failed to load bills', error);
    loadError = 'Unable to load bills from the API.';
  }

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Bills</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : bills.length === 0 ? (
          <div className="empty-state">No bills yet. Record your first vendor bill on the right.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Vendor</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td>{bill.billNo}</td>
                  <td>{bill.vendor?.name ?? 'Unknown'}</td>
                  <td>{formatDate(bill.issueDate)}</td>
                  <td>{formatDate(bill.dueDate)}</td>
                  <td>{bill.status}</td>
                  <td>{formatDKK(bill.balance)}</td>
                  <td>{formatDKK(bill.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Record bill</h2>
        <p>Log incoming vendor bills to keep Accounts Payable up to date.</p>
        <NewBillForm vendors={vendors} taxRates={taxRates} accounts={accounts} />
      </section>
    </div>
  );
}
