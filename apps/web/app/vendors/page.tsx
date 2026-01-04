import { NewVendorForm } from '../../components/NewVendorForm';
import { apiFetch } from '../../lib/api';

interface Vendor {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface VendorsResponse {
  data: Vendor[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('da-DK');
}

export default async function VendorsPage() {
  let vendors: Vendor[] = [];
  let loadError: string | null = null;

  try {
    const response = await apiFetch<VendorsResponse>('/vendors');
    vendors = response.data;
  } catch (error) {
    console.error('Failed to load vendors', error);
    loadError = 'Unable to load vendors from the API.';
  }

  return (
    <div className="card-grid">
      <section className="card">
        <h2>Vendors</h2>
        {loadError ? (
          <p>{loadError}</p>
        ) : vendors.length === 0 ? (
          <div className="empty-state">No vendors yet. Add your first vendor on the right.</div>
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
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>{vendor.name}</td>
                  <td>{vendor.email ?? '—'}</td>
                  <td>{vendor.phone ?? '—'}</td>
                  <td>{vendor.vatNumber ?? '—'}</td>
                  <td>{formatDate(vendor.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Add vendor</h2>
        <p>Store vendor contact info to prepare Accounts Payable workflows.</p>
        <NewVendorForm />
      </section>
    </div>
  );
}
