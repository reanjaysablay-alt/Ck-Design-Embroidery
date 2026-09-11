import { createAdminClient } from '@/lib/supabase/server';
import { toShopTime } from '@/lib/formatDate';

export const metadata = { title: 'Sales — Stitchhouse Admin' };

// Orders count as a "sale" once they're actually fulfilled — pending
// or in-progress orders aren't revenue yet, and canceled orders never
// were. This matches Completed (delivery pipeline) and Picked Up
// (walk-in pipeline).
const SALE_STATUSES = ['completed', 'picked_up'];

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminSalesPage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('id, total, currency, payment_method, order_status, items, created_at')
    .in('order_status', SALE_STATUSES)
    .order('created_at', { ascending: false });

  const sales = orders || [];
  const totalRevenue = sales.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // All "what day is it" reasoning below uses the shop's actual Dubai
  // wall-clock time (via toShopTime), not the server process's own
  // timezone — otherwise "this month" and the daily chart buckets
  // could be off by several hours' worth of orders whenever the
  // server itself isn't running in Dubai time (Vercel defaults to
  // UTC).
  const nowShop = toShopTime();
  const startOfMonthShop = new Date(Date.UTC(nowShop.getUTCFullYear(), nowShop.getUTCMonth(), 1));
  const thisMonthRevenue = sales
    .filter((o) => toShopTime(o.created_at) >= startOfMonthShop)
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Revenue per day for the last 14 days, for the bar chart — each
  // day boundary is midnight in Dubai time, not server-local midnight.
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowShop);
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    days.push(d);
  }
  const dayTotals = days.map((day) => {
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);
    const total = sales
      .filter((o) => {
        const created = toShopTime(o.created_at);
        return created >= day && created < next;
      })
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    return { day, total };
  });
  const maxDayTotal = Math.max(...dayTotals.map((d) => d.total), 1);

  // Payment method breakdown.
  const byMethod = { paypal: 0, cod: 0, walkin: 0 };
  for (const o of sales) {
    byMethod[o.payment_method] = (byMethod[o.payment_method] || 0) + Number(o.total || 0);
  }

  // Top products by revenue, aggregated across every sold order's items.
  const productTotals = new Map();
  for (const o of sales) {
    for (const item of o.items || []) {
      const key = item.name;
      const revenue = Number(item.price || 0) * Number(item.qty || 0) + Number(item.customizationFee || 0);
      const existing = productTotals.get(key) || { name: key, revenue: 0, qty: 0 };
      existing.revenue += revenue;
      existing.qty += Number(item.qty || 0);
      productTotals.set(key, existing);
    }
  }
  const topProducts = [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Sales</h1>
      <p className="text-slate-500 mb-8">
        Based on {totalOrders} completed order{totalOrders === 1 ? '' : 's'} — Completed and Picked Up only.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard label="Total Revenue" value={money(totalRevenue)} accent="emerald" />
        <StatCard label="Orders Completed" value={totalOrders} accent="indigo" />
        <StatCard label="Average Order Value" value={money(avgOrderValue)} accent="violet" />
        <StatCard label="Revenue This Month" value={money(thisMonthRevenue)} accent="amber" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-sm font-medium text-slate-700 mb-6">Revenue — last 14 days</h2>
        <div className="flex items-end gap-2 h-40">
          {dayTotals.map(({ day, total }, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-indigo-500 group-hover:bg-indigo-600 rounded-t-md transition-colors"
                  style={{ height: `${Math.max((total / maxDayTotal) * 100, total > 0 ? 4 : 0)}%` }}
                  title={`${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}: ${money(total)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {day.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment method breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700 mb-5">Revenue by payment method</h2>
          <div className="space-y-4">
            <MethodBar label="PayPal" value={byMethod.paypal} total={totalRevenue} color="bg-blue-500" />
            <MethodBar label="Cash on Delivery" value={byMethod.cod} total={totalRevenue} color="bg-amber-500" />
            <MethodBar label="Walk-in" value={byMethod.walkin} total={totalRevenue} color="bg-emerald-500" />
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700 mb-5">Top products</h2>
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
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const accents = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className={`inline-block text-xs font-medium rounded-full px-2.5 py-1 mb-4 ${accents[accent]}`}>
        {label}
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function MethodBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900 font-medium">
          {money(value)} <span className="text-slate-400 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
