import { apiFetch } from '../../lib/api';

interface HealthResponse {
  status: string;
}

export default async function DashboardPage() {
  let health: HealthResponse | null = null;

  try {
    health = await apiFetch<HealthResponse>('/healthz');
  } catch (error) {
    console.error('Failed to load API health', error);
  }

  return (
    <section className="card-grid">
      <article className="card">
        <h2>API Status</h2>
        <p>{health ? `API is ${health.status}` : 'Unable to reach API'}</p>
      </article>
      <article className="card">
        <h2>Quick Links</h2>
        <ul>
          <li>Manage invoices and bills from the navigation.</li>
          <li>Use Docker Compose to start the full stack locally.</li>
        </ul>
      </article>
    </section>
  );
}
