import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getDesignDownloadUrl } from '@/lib/upload';
import OrderCard, { buildDesignUrls } from '@/components/admin/OrderCard';

// Completed, picked up, and canceled orders land here once they leave
// the active Orders page — read-only, no action buttons, since there's
// nothing left to do on them.
export default async function AdminOrderHistoryPage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .in('order_status', ['completed', 'canceled', 'picked_up'])
    .order('created_at', { ascending: false });

  const designUrls = await buildDesignUrls(orders, getDesignDownloadUrl);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-thread">Order History</h1>
        <Link
          href="/admin/orders"
          className="text-xs uppercase tracking-widest text-thread/50 hover:text-gold"
        >
          ← Back to Orders
        </Link>
      </div>

      <div className="space-y-4">
        {orders?.map((order) => (
          <OrderCard key={order.id} order={order} designUrls={designUrls} />
        ))}
        {(!orders || orders.length === 0) && (
          <p className="text-thread/50">No completed or canceled orders yet.</p>
        )}
      </div>
    </div>
  );
}
