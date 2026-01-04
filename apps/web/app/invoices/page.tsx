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
  balance: number;
  status: string;
  customer: InvoiceCustomer;
}

interface InvoicesResponse {
  data: Invoice[];
}

interface CustomersResponse {
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
  type: string;
}

interface AccountsResponse {
  data: Account[];
}

interface Product {
  id: string;
  name: string;
  unitPriceNet: number;
  incomeAccount?: {
    code: string;
    name: string;
  } | null;
  taxRate?: {
    id: string;
    name: string;
  } | null;
  incomeAccountCode?: string | null;
  taxRateId?: string | null;
}

interface ProductsResponse {
  data: Product[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function InvoicesPage() {
  let invoices: Invoice[] = [];
  let customers: Array<{ id: string; name: string }> = [];
  let taxRates: TaxRate[] = [];
  let accounts: Account[] = [];
  let products: Product[] = [];
  let loadError: string | null = null;

  try {
    const [invoicesResponse, customersResponse, taxRatesResponse, accountsResponse, productsResponse] = await Promise.all([
      apiFetch<InvoicesResponse>('/invoices'),
      apiFetch<CustomersResponse>('/customers'),
      apiFetch<TaxRatesResponse>('/tax-rates'),
      apiFetch<AccountsResponse>('/accounts?type=INCOME'),
      apiFetch<ProductsResponse>('/products')
    ]);

    invoices = invoicesResponse.data;
    customers = customersResponse.data;
    taxRates = taxRatesResponse.data;
    accounts = accountsResponse.data;
    products = productsResponse.data.map((product) => ({
      ...product,
      incomeAccountCode: product.incomeAccount?.code ?? null,
      taxRateId: product.taxRate?.id ?? null
    }));
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
                <th>Balance</th>
                <th>Total</th>
                <th>PDF</th>
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
                  <td>{formatDKK(invoice.balance)}</td>
                  <td>{formatDKK(invoice.total)}</td>
                  <td>
                    <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Create invoice</h2>
        <p>Issue an invoice for a customer. Totals are calculated automatically.</p>
        <NewInvoiceForm customers={customers} taxRates={taxRates} accounts={accounts} products={products} />
      </section>
    </div>
  );
}
