import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const metadata = { title: 'Track Order — Stitchhouse' };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/account');

  // Admin accounts use the admin dashboard only — they don't have a
  // customer account view.
  if (isAdminEmail(user.email)) redirect('/admin');

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  const activeOrders = orders?.filter((o) => ['pending', 'to_ship', 'to_receive'].includes(o.order_status)) || [];
  const historyOrders = orders?.filter((o) => ['completed', 'canceled'].includes(o.order_status)) || [];

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Track Order</p>

      <h2 id="orders" className="text-xs uppercase tracking-widest text-gold mb-4 scroll-mt-24">
        Active Orders
      </h2>

      {activeOrders.length === 0 && (
        <p className="text-thread/60 mb-14">No active orders.</p>
      )}

      {activeOrders.length > 0 && (
        <div className="space-y-6 mb-14">
          {activeOrders.map((order) => (
            <AccountOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <h2 className="text-xs uppercase tracking-widest text-gold mb-4">
        Order History
      </h2>
      <p className="text-thread/50 mb-8">Completed and canceled orders</p>

      {historyOrders.length === 0 && (
        <p className="text-thread/60">No order history yet.</p>
      )}

      {historyOrders.length > 0 && (
        <div className="space-y-6">
          {historyOrders.map((order) => (
            <AccountOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountOrderCard({ order }) {
  return (
    <div className="bg-canvas2 border border-white/5 rounded-sm p-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-xs text-thread/40">Order #{order.id}</div>
          <div className="text-thread/60 text-sm">
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.order_status} />
          <span className="font-mono text-sm text-gold">${order.total}</span>
        </div>
      </div>
      <div className="text-sm text-thread/70 mb-1">
        {order.payment_method === 'paypal' ? 'Paid via PayPal' : 'Cash on Delivery'}
        {' — '}
        <span className="capitalize">{order.payment_status.replace('_', ' ')}</span>
      </div>
      <ul className="text-sm text-thread/50 mt-3 space-y-1">
        {order.items?.map((item, i) => (
          <li key={i}>
            {item.name}{' '}
            <span
              className={`text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 align-middle ${
                item.type === 'custom'
                  ? 'border-gold text-gold'
                  : 'border-white/20 text-thread/50'
              }`}
            >
              {item.type === 'custom' ? 'Custom' : 'Plain'}
            </span>{' '}
            {item.size && `(${item.size})`} × {item.qty}
            {item.type === 'custom' && item.note && (
              <div className="text-thread/40 mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                  Design note:
                </span>{' '}
                {item.note}
              </div>
            )}
            {item.type === 'custom' && item.design?.name && (
              <div className="text-thread/40 mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                  Design file:
                </span>{' '}
                {item.design.name} ✓ received
              </div>
            )}
            {item.type === 'custom' && item.customizationFee > 0 && (
              <div className="text-gold mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                  Customization fee:
                </span>{' '}
                ${Number(item.customizationFee).toFixed(2)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderStatusBadge({ status }) {
  const styles = {
    pending: 'text-gold border-gold',
    to_ship: 'text-blue-400 border-blue-400',
    to_receive: 'text-blue-400 border-blue-400',
    completed: 'text-green-400 border-green-400',
    canceled: 'text-stitchRed border-stitchRed',
  };
  const labels = {
    pending: 'Pending approval',
    to_ship: 'To ship',
    to_receive: 'To receive',
    completed: 'Completed',
    canceled: 'Canceled',
  };
  return (
    <span className={`text-xs uppercase tracking-widest border rounded-sm px-2 py-1 ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}
