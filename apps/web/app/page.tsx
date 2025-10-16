import Link from 'next/link';

const routes = [
  { href: '/invoices', label: 'Invoices' },
  { href: '/bills', label: 'Bills' },
  { href: '/customers', label: 'Customers' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/products', label: 'Products' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/reports', label: 'Reports' }
];

async function fetchHealth(): Promise<{ status: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';
  try {
    const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
    if (!res.ok) {
      return { status: 'unavailable' };
    }
    return res.json();
  } catch (error) {
    console.error('Failed to reach API health endpoint', error);
    return { status: 'unavailable' };
  }
}

export default async function HomePage() {
  const apiHealth = await fetchHealth();

  return (
    <main>
      <section>
        <h1>CloudERP Simplebooks</h1>
        <p>A clear and explicit bookkeeping experience for small businesses.</p>
      </section>
      <section>
        <h2>API Health</h2>
        <p>Status: {apiHealth.status}</p>
      </section>
      <section>
        <h2>Quick Links</h2>
        <ul>
          {routes.map((route) => (
            <li key={route.href}>
              <Link href={route.href}>{route.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
