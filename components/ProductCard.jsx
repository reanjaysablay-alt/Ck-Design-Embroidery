'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { productImageSrc } from '@/lib/placeholder';

export default function ProductCard({ product }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  // Not logged in — render the card but don't make it clickable.
  if (!user) {
    return (
      <div className="group block">
        <div className="relative aspect-[4/5] overflow-hidden bg-canvas2 rounded-sm">
        <Image
          src={productImageSrc(product.image)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 40vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-2 left-2 bg-canvas/85 text-gold text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm">
          {product.category}
        </span>
      </div>
      <div className="mt-2">
        <h3 className="font-display text-base text-thread group-hover:text-gold transition-colors">
          {product.name}
        </h3>
      </div>
    </Link>
  );
}
