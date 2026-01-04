import { apiFetch } from '../../lib/api';
import { formatDKK } from '../../lib/money';

interface HealthResponse {
  status: string;
}

interface DashboardResponse {
  data: {
    openInvoices: {
      count: number;
      total: number;
    };
    openBills: {
      count: number;
      total: number;
    };
    cashBalance: number;
    receivablesBalance: number;
    payablesBalance: number;
  };
}

export default async function DashboardPage() {
  let health: HealthResponse | null = null;
  let metrics: DashboardResponse['data'] | null = null;

  try {
    const [healthResponse, metricsResponse] = await Promise.all([
      apiFetch<HealthResponse>('/healthz'),
      apiFetch<DashboardResponse>('/reports/dashboard')
    ]);
    health = healthResponse;
    metrics = metricsResponse.data;
  } catch (error) {
    console.error('Failed to load dashboard data', error);
  }

  return (
    <section className="card-grid">
      <article className="card">
        <h2>API Status</h2>
        <p>{health ? `API is ${health.status}` : 'Unable to reach API'}</p>
      </article>
      <article className="card">
        <h2>Financial Snapshot</h2>
        {metrics ? (
          <ul>
            <li>
              Open invoices: {metrics.openInvoices.count} totaling {formatDKK(metrics.openInvoices.total)}
            </li>
            <li>
              Open bills: {metrics.openBills.count} totaling {formatDKK(metrics.openBills.total)}
            </li>
            <li>Cash balance: {formatDKK(metrics.cashBalance)}</li>
            <li>Receivables balance: {formatDKK(metrics.receivablesBalance)}</li>
            <li>Payables balance: {formatDKK(metrics.payablesBalance)}</li>
          </ul>
        ) : (
          <p>Metrics unavailable. Check the API service.</p>
        )}
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
