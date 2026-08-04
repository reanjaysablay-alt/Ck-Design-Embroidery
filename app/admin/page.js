import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export default async function AdminHome() {
  const admin = createAdminClient();
  const { count: pendingCount } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_status', 'pending');

  const { count: unreadInquiries } = await admin
    .from('contact_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  const supabase = await createClient();
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/orders"
          className="bg-canvas2 border border-white/5 rounded-sm p-8 hover:border-gold/40 transition-colors"
        >
          <div className="font-mono text-4xl text-gold mb-2">{pendingCount ?? 0}</div>
          <div className="text-thread/70">Orders awaiting review</div>
        </Link>
        <Link
          href="/admin/inquiries"
          className="bg-canvas2 border border-white/5 rounded-sm p-8 hover:border-gold/40 transition-colors"
        >
          <div className="font-mono text-4xl text-gold mb-2">{unreadInquiries ?? 0}</div>
          <div className="text-thread/70">Unread inquiries</div>
        </Link>
        <Link
          href="/admin/products"
          className="bg-canvas2 border border-white/5 rounded-sm p-8 hover:border-gold/40 transition-colors"
        >
          <div className="font-mono text-4xl text-gold mb-2">{productCount ?? 0}</div>
          <div className="text-thread/70">Products in the shop</div>
        </Link>
      </div>
    </div>
  );
}
