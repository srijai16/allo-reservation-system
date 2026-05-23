'use client';

import { useState, useEffect } from 'react';
import type { Product, Reservation } from '@/types';
import { api } from '@/lib/api-client';
import { ProductCard } from '@/components/ProductCard';
import { ReserveModal } from '@/components/ReserveModal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useRouter } from 'next/navigation';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reservingProduct, setReservingProduct] = useState<Product | null>(null);

  useEffect(() => {
    api.products
      .list()
      .then(setProducts)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleReserved = (reservation: Reservation) => {
    setReservingProduct(null);
    router.push(`/reservations/${reservation.id}`);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h2 className="sr-only">Product listing</h2>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}
        >
          Products
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
          Select a product and warehouse to place a reservation.
        </p>
      </div>

      {loadError && <ErrorBanner message={loadError} />}

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '380px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onReserve={setReservingProduct}
            />
          ))}
        </div>
      )}

      {reservingProduct && (
        <ReserveModal
          product={reservingProduct}
          onClose={() => setReservingProduct(null)}
          onReserved={handleReserved}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
