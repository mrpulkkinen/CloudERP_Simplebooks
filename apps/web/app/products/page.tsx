import { NewProductForm } from '../../components/NewProductForm';
import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  unitPriceNet: number;
  incomeAccount?: {
    code: string;
    name: string;
  } | null;
  taxRate?: {
    id: string;
    name: string;
  } | null;
}

interface ProductsResponse {
  data: Product[];
}

interface Account {
  code: string;
  name: string;
}

interface AccountsResponse {
  data: Account[];
}

interface TaxRate {
  id: string;
  name: string;
}

interface TaxRatesResponse {
  data: TaxRate[];
}

export default async function ProductsPage() {
  let products: Product[] = [];
  let accounts: Account[] = [];
  let taxRates: TaxRate[] = [];
  let loadError: string | null = null;

  try {
    const [productsResponse, accountsResponse, taxRatesResponse] = await Promise.all([
      apiFetch<ProductsResponse>('/products'),
      apiFetch<AccountsResponse>('/accounts?type=INCOME'),
      apiFetch<TaxRatesResponse>('/tax-rates')
    ]);

    products = productsResponse.data;
    accounts = accountsResponse.data;
    taxRates = taxRatesResponse.data;
  } catch (error) {
    console.error('Failed to load products', error);
    loadError = 'Unable to load products from the API.';
  }

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Products & Services</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : products.length === 0 ? (
          <div className="empty-state">No products yet. Add your first offering on the right.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Unit Price</th>
                <th>Income Account</th>
                <th>Tax Rate</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{formatDKK(product.unitPriceNet)}</td>
                  <td>
                    {product.incomeAccount
                      ? `${product.incomeAccount.code} – ${product.incomeAccount.name}`
                      : '—'}
                  </td>
                  <td>{product.taxRate?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Add product</h2>
        <p>Catalog recurring services or goods so invoices stay consistent.</p>
        <NewProductForm accounts={accounts} taxRates={taxRates} />
      </section>
    </div>
  );
}
