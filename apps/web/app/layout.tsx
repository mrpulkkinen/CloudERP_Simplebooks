import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'CloudERP Simplebooks',
  description: 'Lightweight accounting for small businesses'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
