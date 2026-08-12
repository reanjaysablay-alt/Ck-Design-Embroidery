import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getDesignDownloadUrl } from '@/lib/upload';
import { acceptOrder, markShipped, markCompleted, cancelOrder, setCustomizationFee } from '@/app/admin/actions';
import { AcceptButton, ShipButton, ReceivedButton, CancelButton } from '@/components/admin/OrderActionButtons';
import OrderCard, { buildDesignUrls } from '@/components/admin/OrderCard';

// Only active, in-progress orders live here. The moment an order is
// marked Completed or Canceled it drops off this list automatically
// (it's simply no longer in this query) and shows up on the History
// page instead.
export default async function AdminOrdersPage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .in('order_status', ['pending', 'to_ship', 'to_receive'])
    .order('created_at', { ascending: false });

  const designUrls = await buildDesignUrls(orders, getDesignDownloadUrl);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-thread">Orders</h1>
        <Link
          href="/admin/orders/history"
          className="text-xs uppercase tracking-widest text-thread/50 hover:text-gold"
        >
          View History →
        </Link>
      </div>

      <div className="space-y-4">
        {orders?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            designUrls={designUrls}
            feeAction={setCustomizationFee}
            actions={
              <>
                {order.order_status === 'pending' && (
                  <div className="flex gap-3">
                    <AcceptButton id={order.id} action={acceptOrder} />
                    <CancelButton id={order.id} action={cancelOrder} />
                  </div>
                )}
                {order.order_status === 'to_ship' && (
                  <div className="flex gap-3">
                    <ShipButton id={order.id} action={markShipped} />
                    <CancelButton id={order.id} action={cancelOrder} />
                  </div>
                )}
                {order.order_status === 'to_receive' && (
                  <div className="flex gap-3">
                    <ReceivedButton id={order.id} action={markCompleted} />
                    <CancelButton id={order.id} action={cancelOrder} />
                  </div>
                )}
              </>
            }
          />
        ))}
        {(!orders || orders.length === 0) && (
          <p className="text-thread/50">No active orders.</p>
        )}
      </div>
    </div>
  );
}
