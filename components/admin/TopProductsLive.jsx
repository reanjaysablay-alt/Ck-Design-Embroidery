'use client';

import { useEffect, useState } from 'react';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Polls /api/admin/sales/top-products every few seconds so the
// ranking updates shortly after a new sale completes — the rest of
// the Sales page (revenue chart, stat cards, payment breakdown) stays
// the static server-rendered snapshot from page load; only this panel
// is live.
const POLL_MS = 5000;

export default function TopProductsLive({ initialTopProducts }) {
  const [topProducts, setTopProducts] = useState(initialTopProducts);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [live, setLive] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch('/api/admin/sales/top-products', { cache: 'no-store' });
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        if (!mounted) return;
        setTopProducts(data.topProducts);
        setUpdatedAt(new Date());
        setLive(true);
      } catch {
        if (mounted) setLive(false);
      }
    }

    const interval = setInterval(poll, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-medium text-slate-700">Top products</h2>
        <span
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400"
          title={live ? 'Refreshing automatically' : 'Live updates paused — check connection'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          {live ? 'Live' : 'Offline'}
        </span>
      </div>

      {topProducts.length === 0 && <p className="text-slate-400 text-sm">No sales yet.</p>}

      <div className="space-y-3">
        {topProducts.map((p, i) => (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-slate-700 text-sm truncate">{p.name}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-slate-900 text-sm font-medium">{money(p.revenue)}</div>
              <div className="text-slate-400 text-xs">{p.qty} sold</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-slate-300 text-[10px] font-mono mt-5">
        Updated {updatedAt.toLocaleTimeString()}
      </p>
    </div>
  );
}
