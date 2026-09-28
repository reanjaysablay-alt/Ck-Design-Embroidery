import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { toShopTime } from '@/lib/formatDate';
import { SALE_STATUSES, computeTopProducts } from '@/lib/salesStats';
import TopProductsLive from '@/components/admin/TopProductsLive';
import AutoRefresh from '@/components/admin/AutoRefresh';

// Always compute fresh from the database — the dashboard's counts
// (pending orders, revenue, unread inquiries...) must never show a
// cached/stale snapshot.
export const dynamic = 'force-dynamic';

const CARD_ICONS = {
  orders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h2l1.6 9.6a2 2 0 002 1.9h8.8a2 2 0 002-1.7L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  inquiries: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-4-1L3 20l1-5.5a8.5 8.5 0 1117-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ratings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2-4.8-4.3 6.4-.6z" strokeLinejoin="round" />
    </svg>
  ),
  products: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
      <path d="M12 13v8" />
    </svg>
  ),
};

function DashboardCard({ href, value, label, icon, accent }) {
  const accents = {
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <Link
      href={href}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accents[accent]}`}>
        {icon}
      </div>
      <div className="text-3xl font-semibold text-slate-900 mb-1">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </Link>
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

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminHome() {
  // Dashboard (and the Sales figures merged into it below) is
  // admin-only — staff land on Orders instead.
  const supabaseAuth = await createClient();
  const {
    data: { user: authUser },
  } = await supabaseAuth.auth.getUser();
  if (!isAdminEmail(authUser?.email)) redirect('/admin/orders');

  const admin = createAdminClient();
  const { count: pendingCount } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_status', 'pending');

  const { count: unreadInquiries } = await admin
    .from('contact_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
    .neq('type', 'rating');

  const { count: unreadRatings } = await admin
    .from('contact_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
    .eq('type', 'rating');

  const { count: productCount } = await supabaseAuth
    .from('products')
    .select('*', { count: 'exact', head: true });

  // --- Sales figures — merged in from the old standalone /admin/sales
  // page, which now redirects here. ---
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

  // Top products by revenue, aggregated across every sold order's
  // items — only used as the initial snapshot here; TopProductsLive
  // below takes over with polled, live-updating data from that point.
  const topProducts = computeTopProducts(sales);

  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Dubai',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <AutoRefresh />
      <p className="text-slate-400 text-sm mb-1">{today}</p>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <DashboardCard
          href="/admin/orders"
          value={pendingCount ?? 0}
          label="Orders awaiting review"
          icon={CARD_ICONS.orders}
          accent="amber"
        />
        <DashboardCard
          href="/admin/inquiries"
          value={unreadInquiries ?? 0}
          label="Unread inquiries"
          icon={CARD_ICONS.inquiries}
          accent="indigo"
        />
        <DashboardCard
          href="/admin/ratings"
          value={unreadRatings ?? 0}
          label="Unread ratings"
          icon={CARD_ICONS.ratings}
          accent="violet"
        />
        <DashboardCard
          href="/admin/products"
          value={productCount ?? 0}
          label="Products in the shop"
          icon={CARD_ICONS.products}
          accent="emerald"
        />
      </div>

      {/* Sales — merged in from the old standalone /admin/sales page. */}
      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Sales</h2>
      <p className="text-slate-500 mb-6">
        Based on {totalOrders} completed order{totalOrders === 1 ? '' : 's'} — Completed and Picked Up only.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Total Revenue" value={money(totalRevenue)} accent="emerald" />
        <StatCard label="Orders Completed" value={totalOrders} accent="indigo" />
        <StatCard label="Average Order Value" value={money(avgOrderValue)} accent="violet" />
        <StatCard label="Revenue This Month" value={money(thisMonthRevenue)} accent="amber" />
      </div>

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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700 mb-5">Revenue by payment method</h2>
          <div className="space-y-4">
            <MethodBar label="PayPal" value={byMethod.paypal} total={totalRevenue} color="bg-blue-500" />
            <MethodBar label="Cash on Delivery" value={byMethod.cod} total={totalRevenue} color="bg-amber-500" />
            <MethodBar label="Walk-in" value={byMethod.walkin} total={totalRevenue} color="bg-emerald-500" />
          </div>
        </div>

        {/* Top products — live, polls for updates independently of
            the rest of this server-rendered page. */}
        <TopProductsLive initialTopProducts={topProducts} />
      </div>
    </div>
  );
}
