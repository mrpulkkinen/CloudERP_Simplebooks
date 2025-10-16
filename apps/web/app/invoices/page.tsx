import { NewInvoiceForm } from '../../components/NewInvoiceForm';
import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface InvoiceCustomer {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  status: string;
  customer: InvoiceCustomer;
}

interface InvoicesResponse {
  data: Invoice[];
}

interface CustomersResponse {
  data: Array<{ id: string; name: string }>;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function InvoicesPage() {
  let invoices: Invoice[] = [];
  let customers: Array<{ id: string; name: string }> = [];
  let loadError: string | null = null;

  try {
    const [invoicesResponse, customersResponse] = await Promise.all([
      apiFetch<InvoicesResponse>('/invoices'),
      apiFetch<CustomersResponse>('/customers')
    ]);

    invoices = invoicesResponse.data;
    customers = customersResponse.data;
  } catch (error) {
    console.error('Failed to load invoices', error);
    loadError = 'Unable to load invoices from the API.';
  }

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Invoices</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : invoices.length === 0 ? (
          <div className="empty-state">No invoices yet. Create an invoice using the form on the right.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Customer</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNo}</td>
                  <td>{invoice.customer?.name ?? 'Unknown'}</td>
                  <td>{formatDate(invoice.issueDate)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td>{invoice.status}</td>
                  <td>{formatDKK(invoice.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Create invoice</h2>
        <p>Issue an invoice for a customer. Totals are calculated automatically.</p>
        <NewInvoiceForm customers={customers} />
      </section>
    </div>
  );
}
