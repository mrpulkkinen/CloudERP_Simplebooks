import { NewCustomerForm } from '../../components/NewCustomerForm';
import { apiFetch } from '../../lib/api';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface CustomersResponse {
  data: Customer[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function CustomersPage() {
  let customers: Customer[] = [];
  let loadError: string | null = null;

  try {
    const response = await apiFetch<CustomersResponse>('/customers');
    customers = response.data;
  } catch (error) {
    console.error('Failed to load customers', error);
    loadError = 'Unable to load customers from the API.';
  }

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Customers</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : customers.length === 0 ? (
          <div className="empty-state">No customers yet. Add your first customer on the right.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>VAT No.</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.email ?? '—'}</td>
                  <td>{customer.phone ?? '—'}</td>
                  <td>{customer.vatNumber ?? '—'}</td>
                  <td>{formatDate(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Add customer</h2>
        <p>Store contact information for new customers to keep your Accounts Receivable organized.</p>
        <NewCustomerForm />
      </section>
    </div>
  );
}
