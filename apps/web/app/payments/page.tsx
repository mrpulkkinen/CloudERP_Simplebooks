import { RecordPaymentForm } from '../../components/RecordPaymentForm';
import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface Invoice {
  id: string;
  invoiceNo: string;
  balance: number;
  status: string;
}

interface Bill {
  id: string;
  billNo: string;
  balance: number;
  status: string;
}

interface PaymentInvoiceLink {
  invoice: {
    id: string;
    invoiceNo: string;
  };
  amount: number;
}

interface PaymentBillLink {
  bill: {
    id: string;
    billNo: string;
  };
  amount: number;
}

interface Payment {
  id: string;
  type: string;
  method: string;
  amount: number;
  date: string;
  reference?: string | null;
  invoices: PaymentInvoiceLink[];
  bills: PaymentBillLink[];
}

interface InvoicesResponse {
  data: Invoice[];
}

interface BillsResponse {
  data: Bill[];
}

interface PaymentsResponse {
  data: Payment[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function PaymentsPage() {
  let invoices: Invoice[] = [];
  let bills: Bill[] = [];
  let payments: Payment[] = [];
  let loadError: string | null = null;

  try {
    const [invoiceResponse, billsResponse, paymentsResponse] = await Promise.all([
      apiFetch<InvoicesResponse>('/invoices'),
      apiFetch<BillsResponse>('/bills'),
      apiFetch<PaymentsResponse>('/payments')
    ]);

    invoices = invoiceResponse.data;
    bills = billsResponse.data;
    payments = paymentsResponse.data;
  } catch (error) {
    console.error('Failed to load payments data', error);
    loadError = 'Unable to load payment data from the API.';
  }

  const openInvoices = invoices.filter((invoice) => invoice.balance > 0);
  const openBills = bills.filter((bill) => bill.balance > 0);

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Payments</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : payments.length === 0 ? (
          <div className="empty-state">No payments recorded yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Applied to</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{payment.type}</td>
                  <td>{payment.reference ?? '—'}</td>
                  <td>
                    {payment.type === 'AR'
                      ? payment.invoices.map((link) => `${link.invoice.invoiceNo}`).join(', ') || '—'
                      : payment.bills.map((link) => `${link.bill.billNo}`).join(', ') || '—'}
                  </td>
                  <td>{formatDKK(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Record payment</h2>
        <p>Apply customer receipts or vendor payments. Ledger postings are created automatically.</p>
        <RecordPaymentForm invoices={openInvoices} bills={openBills} />
      </section>
    </div>
  );
}
