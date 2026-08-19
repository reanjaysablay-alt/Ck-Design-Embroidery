export function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    to_ship: 'bg-blue-50 text-blue-700 border-blue-200',
    to_receive: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    canceled: 'bg-red-50 text-red-700 border-red-200',
    preparing: 'bg-blue-50 text-blue-700 border-blue-200',
    ready_for_pickup: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    picked_up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const labels = {
    pending: 'Pending',
    to_ship: 'To Ship',
    to_receive: 'To Receive',
    completed: 'Completed',
    canceled: 'Canceled',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready for Pickup',
    picked_up: 'Picked Up',
  };
  return (
    <span className={`text-xs font-medium border rounded-full px-3 py-1 ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}

// Renders one order's details (customer, shipping, items, design
// downloads, payment). `actions`, if passed, renders below the items
// list — the active orders page passes Accept/Ship/Cancel etc; the
// history page passes nothing since completed/canceled orders are
// read-only. `feeAction`, if passed, adds an inline "customization
// fee" field to each custom item — only the active orders page wires
// this up, so completed/canceled orders in history stay read-only.
export default function OrderCard({ order, designUrls, actions, feeAction }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="font-mono text-xs text-slate-400">
            Order #{order.id} · {new Date(order.created_at).toLocaleString()}
          </div>
          <div className="text-slate-900 font-medium">{order.customer_email}</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.order_status} />
          <span className="font-mono text-slate-900 font-semibold">${order.total}</span>
        </div>
      </div>

      <div className="text-sm text-slate-500 mb-2">
        {order.payment_method === 'paypal'
          ? 'Paid via PayPal'
          : order.payment_method === 'walkin'
          ? 'Walk-in — pay in person'
          : 'Cash on Delivery'}
        {' — '}
        <span className="capitalize">{order.payment_status.replace('_', ' ')}</span>
      </div>

      {order.shipping_address && order.payment_method === 'walkin' && (
        <div className="text-sm text-slate-500 mb-3">
          {order.shipping_address.fullName} · {order.shipping_address.phone}
          <span className="text-slate-400"> — pickup contact, no delivery address</span>
        </div>
      )}
      {order.shipping_address && order.payment_method !== 'walkin' && (
        <div className="text-sm text-slate-500 mb-3">
          {order.shipping_address.fullName} · {order.shipping_address.phone}
          <br />
          {order.shipping_address.line1}, {order.shipping_address.city}, {order.shipping_address.emirate}
        </div>
      )}

      <ul className="text-sm text-slate-600 mb-4 space-y-2 divide-y divide-slate-100">
        {order.items?.map((item, i) => (
          <li key={i} className={i > 0 ? 'pt-2' : ''}>
            {item.name}{' '}
            <span
              className={`text-[10px] font-mono uppercase tracking-widest border rounded-full px-2 py-0.5 align-middle ${
                item.type === 'custom'
                  ? 'border-indigo-200 text-indigo-600 bg-indigo-50'
                  : 'border-slate-200 text-slate-500 bg-slate-50'
              }`}
            >
              {item.type === 'custom' ? 'Custom' : 'Plain'}
            </span>{' '}
            {item.size && `(${item.size})`} × {item.qty}
            {item.type === 'custom' && item.note && (
              <div className="text-slate-500 mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
                  Design note:
                </span>{' '}
                {item.note}
              </div>
            )}
            {item.type === 'custom' && item.design?.path && (
              <div className="mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-400 mr-1">
                  Design file:
                </span>
                {designUrls[item.design.path] ? (
                  <a
                    href={designUrls[item.design.path]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 text-xs underline hover:text-indigo-800"
                  >
                    Download {item.design.name}
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">unavailable</span>
                )}
              </div>
            )}
            {item.type === 'custom' && !feeAction && item.customizationFee > 0 && (
              <div className="text-indigo-600 mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
                  Customization fee:
                </span>{' '}
                ${Number(item.customizationFee).toFixed(2)}
              </div>
            )}
            {item.type === 'custom' && feeAction && (
              <form action={feeAction} className="mt-2 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="itemIndex" value={i} />
                <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
                  Customization fee
                </span>
                <span className="text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  name="fee"
                  step="0.01"
                  min="0"
                  defaultValue={item.customizationFee || ''}
                  placeholder="0.00"
                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                />
                <button
                  type="submit"
                  className="text-[10px] uppercase tracking-widest text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded-full px-3 py-1"
                >
                  {item.customizationFee > 0 ? 'Update' : 'Add charge'}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {actions}
    </div>
  );
}

// Shared by the active-orders page and the history page: signs a
// download URL for every custom item's uploaded design file across a
// list of orders, once, instead of re-signing on every render.
export async function buildDesignUrls(orders, getDesignDownloadUrl) {
  const designUrls = {};
  if (orders?.length) {
    await Promise.all(
      orders.flatMap((order) =>
        (order.items || [])
          .filter((item) => item.type === 'custom' && item.design?.path)
          .map(async (item) => {
            try {
              designUrls[item.design.path] = await getDesignDownloadUrl(item.design.path);
            } catch (err) {
              console.error('Could not sign design URL:', err.message);
            }
          })
      )
    );
  }
  return designUrls;
}
