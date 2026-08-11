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

  const outOfStock = product.inStock === false;

  const image = (
    <div className="relative aspect-[4/5] overflow-hidden bg-canvas2 rounded-sm">
      <Image
        src={productImageSrc(product.image)}
        alt={product.name}
        fill
        sizes="(max-width: 768px) 40vw, 20vw"
        className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
          outOfStock ? 'opacity-50 grayscale' : ''
        }`}
      />
      <span className="absolute top-2 left-2 bg-canvas/85 text-gold text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm">
        {product.category}
      </span>
      {outOfStock && (
        <span className="absolute top-2 right-2 bg-stitchRed text-thread text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm">
          Out of Stock
        </span>
      )}
    </div>
  );

  // Not logged in — render the card but don't make it clickable.
  if (!user) {
    return (
      <div className="group block">
        {image}
        <div className="mt-2">
          <h3 className="font-display text-base text-thread transition-colors">
            {product.name}
          </h3>
        </div>
      </div>
    );
  }

  // Logged in — the card links to the product detail page (customers
  // can still view an out-of-stock product's details, they just can't
  // add it to their cart — see ProductDetail).
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      {image}
      <div className="mt-2">
        <h3 className="font-display text-base text-thread group-hover:text-gold transition-colors">
          {product.name}
        </h3>
      </div>
    </Link>
  );
}
