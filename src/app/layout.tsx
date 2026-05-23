import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'STOCKR — Inventory Reservation',
  description: 'Reserve inventory across warehouses in real time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav
          style={{
            borderBottom: '1px solid var(--border)',
            padding: '0 2rem',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg)',
            zIndex: 100,
          }}
        >
          <a
            href="/"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: '15px',
              letterSpacing: '0.08em',
              color: 'var(--accent)',
            }}
          >
            STOCKR
          </a>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            INVENTORY v1
          </span>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 52px)' }}>{children}</main>
      </body>
    </html>
  );
}
