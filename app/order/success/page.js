'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/CartContext';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessInner />
    </Suspense>
  );
}

function OrderSuccessInner() {
  const params = useSearchParams();
  const orderId = params.get('order');
  const cleared = useRef(false);

  // CartProvider only exposes add/remove/updateQty, so clear by removing
  // each item once on mount.
  const { items, removeItem } = useCart();
  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    items.forEach((item) => removeItem(item.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-lg mx-auto px-5 py-24 text-center">
      <h1 className="font-display text-4xl text-thread mb-4">Order placed</h1>
      <p className="text-thread/60 mb-2">
        Thanks — we've got it. You'll hear from us with shipping details.
      </p>
      {orderId && (
        <p className="font-mono text-xs text-thread/40 mb-10">Order #{orderId}</p>
      )}
      <Link
        href="/shop"
        className="inline-block bg-gold text-ink font-body uppercase tracking-widest text-sm px-7 py-3.5 rounded-sm hover:bg-thread transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
