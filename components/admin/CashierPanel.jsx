'use client';

import { useMemo, useState } from 'react';

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// One row in the cart is uniquely identified by slug+size — a shirt in
// S and the same shirt in M are two separate lines.
function lineKey(slug, size) {
  return `${slug}::${size || ''}`;
}

export default function CashierPanel({ products, createSaleAction }) {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{slug, name, price, size, qty, maxQty}]
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState(null); // {orderId, total}

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [search, products]);

  function stockFor(product, size) {
    if (!product.stock) return null; // no per-size tracking — treat as unlimited
    return product.stock[size] ?? 0;
  }

  function addToCart(product, size) {
    const available = stockFor(product, size);
    setCart((prev) => {
      const key = lineKey(product.slug, size);
      const existing = prev.find((i) => lineKey(i.slug, i.size) === key);
      if (existing) {
        if (available != null && existing.qty >= available) return prev; // can't add more
        return prev.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i));
      }
      if (available === 0) return prev;
      return [...prev, { slug: product.slug, name: product.name, price: product.price, size: size || null, qty: 1, maxQty: available }];
    });
  }

  function changeQty(key, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (lineKey(i.slug, i.size) !== key) return i;
          const next = i.qty + delta;
          if (next <= 0) return null;
          if (i.maxQty != null && next > i.maxQty) return i;
          return { ...i, qty: next };
        })
        .filter(Boolean)
    );
  }

  function removeLine(key) {
    setCart((prev) => prev.filter((i) => lineKey(i.slug, i.size) !== key));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tendered = Number(cashTendered);
  const hasTendered = cashTendered !== '' && !Number.isNaN(tendered);
  const change = hasTendered ? tendered - total : null;

  function resetForNewSale() {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCashTendered('');
    setLastSale(null);
    setError('');
  }

  async function handleCompleteSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await createSaleAction({
        items: cart.map(({ slug, size, qty }) => ({ slug, size, qty })),
        customerName,
        customerPhone,
      });
      setLastSale(result);
    } catch (err) {
      setError(err.message || 'Could not complete the sale.');
    } finally {
      setSubmitting(false);
    }
  }

  if (lastSale) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Sale complete</h2>
        <p className="text-slate-500 text-sm mb-6">Order #{lastSale.orderId}</p>
        <div className="text-3xl font-semibold text-slate-900 mb-1">{money(lastSale.total)}</div>
        {change !== null && change >= 0 && (
          <p className="text-slate-500 text-sm mb-6">Change due: {money(change)}</p>
        )}
        <button
          onClick={resetForNewSale}
          className="w-full bg-indigo-600 text-white font-medium text-sm px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors mt-2"
        >
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Product picker */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 mb-4"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((product) => (
            <ProductTile key={product.slug} product={product} onAdd={addToCart} stockFor={stockFor} />
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full text-slate-400 text-sm text-center py-8">No products match "{search}".</p>
          )}
        </div>
      </div>

      {/* Cart / checkout */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 lg:sticky lg:top-6">
        <h2 className="text-sm font-medium text-slate-700 mb-4">Current Sale</h2>

        {cart.length === 0 && <p className="text-slate-400 text-sm mb-4">No items yet — add something from the left.</p>}

        {cart.length > 0 && (
          <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => {
              const key = lineKey(item.slug, item.size);
              return (
                <div key={key} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="text-slate-800 truncate">
                      {item.name}
                      {item.size && <span className="text-slate-400"> ({item.size})</span>}
                    </div>
                    <div className="text-slate-400 text-xs">{money(item.price)} each</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => changeQty(key, -1)}
                      className="w-6 h-6 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-slate-800">{item.qty}</span>
                    <button
                      onClick={() => changeQty(key, 1)}
                      disabled={item.maxQty != null && item.qty >= item.maxQty}
                      className="w-6 h-6 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30"
                    >
                      +
                    </button>
                    <button onClick={() => removeLine(key)} className="text-red-500 hover:text-red-700 ml-1" aria-label="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mb-4">
          <span className="text-slate-500 text-sm">Total</span>
          <span className="text-xl font-semibold text-slate-900">{money(total)}</span>
        </div>

        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
          />
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder="Cash received (optional)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
          {hasTendered && (
            <p className={`text-xs ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {change >= 0 ? `Change due: ${money(change)}` : `Short by ${money(-change)}`}
            </p>
          )}
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || submitting}
          className="w-full bg-indigo-600 text-white font-medium text-sm px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Completing sale…' : `Complete Sale — ${money(total)}`}
        </button>
      </div>
    </div>
  );
}

function ProductTile({ product, onAdd, stockFor }) {
  const [size, setSize] = useState(product.sizes?.[0] || null);
  const available = stockFor(product, size);
  const soldOut = available === 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
      <div className="text-sm text-slate-800 font-medium truncate">{product.name}</div>
      <div className="text-slate-400 text-xs mb-2">{money(product.price)}</div>

      {product.sizes?.length > 0 && (
        <select
          value={size || ''}
          onChange={(e) => setSize(e.target.value)}
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 mb-2 text-slate-700"
        >
          {product.sizes.map((s) => (
            <option key={s} value={s}>
              {s} {product.stock ? `(${product.stock[s] ?? 0} left)` : ''}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={() => onAdd(product, size)}
        disabled={soldOut}
        className="mt-auto text-xs uppercase tracking-widest bg-slate-900 text-white rounded-lg py-1.5 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {soldOut ? 'Sold out' : 'Add'}
      </button>
    </div>
  );
}
