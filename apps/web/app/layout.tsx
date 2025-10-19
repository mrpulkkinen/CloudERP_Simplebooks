import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/bills', label: 'Bills' },
  { href: '/customers', label: 'Customers' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/products', label: 'Products' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/reports', label: 'Reports' },
  { href: '/license', label: 'License' }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <h1>CloudERP Simplebooks</h1>
          <nav>
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
