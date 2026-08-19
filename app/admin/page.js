import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

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

export default async function AdminHome() {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  const { count: productCount } = isAdmin
    ? await supabase.from('products').select('*', { count: 'exact', head: true })
    : { count: null };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <p className="text-slate-400 text-sm mb-1">{today}</p>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
        {isAdmin && (
          <DashboardCard
            href="/admin/products"
            value={productCount ?? 0}
            label="Products in the shop"
            icon={CARD_ICONS.products}
            accent="emerald"
          />
        )}
      </div>
    </div>
  );
}
