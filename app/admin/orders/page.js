import { createAdminClient } from '@/lib/supabase/server';
import { acceptOrder, declineOrder } from '@/app/admin/actions';
import { AcceptButton, DeclineButton } from '@/components/admin/OrderActionButtons';

export default async function AdminOrdersPage() {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">Orders</h1>

      <div className="space-y-4">
        {orders?.map((order) => (
          <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-md p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500">
                  Order #{order.id} · {new Date(order.created_at).toLocaleString()}
                </div>
                <div className="text-black">{order.customer_email}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={order.order_status} />
                <span className="font-medium text-black">${order.total}</span>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              {order.payment_method === 'paypal' ? 'Paid via PayPal' : 'Cash on Delivery'}
              {' — '}
              <span className="capitalize">{order.payment_status.replace('_', ' ')}</span>
            </div>

            {order.shipping_address && (
              <div className="text-sm text-gray-600 mb-3">
                {order.shipping_address.fullName} · {order.shipping_address.phone}
                <br />
                {order.shipping_address.line1}, {order.shipping_address.city}, {order.shipping_address.emirate}
              </div>
            )}

            <ul className="text-sm text-gray-700 mb-4 space-y-1">
              {order.items?.map((item, i) => (
                <li key={i}>
                  {item.name}{' '}
                  <span
                    className={`text-[10px] font-medium uppercase tracking-widest border rounded-sm px-1.5 py-0.5 align-middle ${
                      item.type === 'custom'
                        ? 'border-black text-black'
                        : 'border-gray-400 text-gray-500'
                    }`}
                  >
                    {item.type === 'custom' ? 'Custom' : 'Plain'}
                  </span>{' '}
                  {item.size && `(${item.size})`} × {item.qty}
                  {item.type === 'custom' && item.note && (
                    <div className="text-gray-500 mt-1">
                      <span className="font-medium text-xs uppercase tracking-widest text-gray-500">
                        Design note:
                      </span>{' '}
                      {item.note}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {order.order_status === 'pending' && (
              <div className="flex gap-3">
                <AcceptButton id={order.id} action={acceptOrder} />
                <DeclineButton id={order.id} action={declineOrder} />
              </div>
            )}
          </div>
        ))}
        {(!orders || orders.length === 0) && (
          <p className="text-gray-500">No orders yet.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'text-yellow-600 border-yellow-600',
    accepted: 'text-green-600 border-green-600',
    declined: 'text-red-600 border-red-600',
  };
  return (
    <span className={`text-xs uppercase tracking-widest border rounded-sm px-2 py-1 ${styles[status]}`}>
      {status}
    </span>
  );
}
