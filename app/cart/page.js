'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { productImageSrc } from '@/lib/placeholder';

export default function CartPage() {
  const { items, removeItem, updateQty, subtotal } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-24 text-center">
        <h1 className="font-display text-3xl text-thread mb-4">Your cart is empty</h1>
        <p className="text-thread/60 mb-8">Nothing stitched up yet — go find something to add.</p>
        <Link
          href="/shop"
          className="inline-block bg-gold text-ink font-body uppercase tracking-widest text-sm px-7 py-3.5 rounded-sm hover:bg-thread transition-colors"
        >
          Browse the Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16">
      <h1 className="font-display text-4xl text-thread mb-10">Your Cart</h1>

      <div className="divide-y divide-white/10 mb-10">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-5 py-6">
            <div className="relative w-20 h-24 bg-linen2 rounded-sm overflow-hidden flex-shrink-0">
              <Image src={productImageSrc(item.image)} alt={item.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg text-thread">
                {item.name}
                <span
                  className={`ml-2 text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 align-middle ${
                    item.type === 'custom'
                      ? 'border-gold text-gold'
                      : 'border-white/20 text-thread/50'
                  }`}
                >
                  {item.type === 'custom' ? 'Custom' : 'Plain'}
                </span>
              </div>
              {item.size && (
                <div className="text-thread/50 text-sm font-mono">Size: {item.size}</div>
              )}
              {item.type === 'custom' && item.note && (
                <div className="text-thread/60 text-sm mt-1 leading-relaxed">
                  <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                    Design note:
                  </span>{' '}
                  {item.note}
                </div>
              )}
              <button
                onClick={() => removeItem(item.key)}
                className="text-stitchRed text-xs uppercase tracking-widest mt-2 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.key, item.qty - 1)}
                className="w-8 h-8 border border-white/20 rounded-sm text-thread hover:border-gold"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-mono w-6 text-center">{item.qty}</span>
              <button
                onClick={() => updateQty(item.key, item.qty + 1)}
                className="w-8 h-8 border border-white/20 rounded-sm text-thread hover:border-gold"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <div className="font-mono text-thread w-16 text-right">
              ${(item.price * item.qty).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-6 mb-8">
        <span className="font-display text-xl text-thread">Subtotal</span>
        <span className="font-mono text-xl text-thread">${subtotal.toFixed(2)}</span>
      </div>

      <button
        onClick={() => router.push('/checkout')}
        className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-4 rounded-sm hover:bg-thread transition-colors"
      >
        Checkout
      </button>
      <p className="text-thread/40 text-xs mt-4 text-center font-mono">
        You'll be asked to sign in before paying.
      </p>
    </div>
  );
}
