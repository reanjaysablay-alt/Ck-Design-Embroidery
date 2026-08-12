export function StatusBadge({ status }) {
  const styles = {
    pending: 'text-gold border-gold',
    to_ship: 'text-blue-400 border-blue-400',
    to_receive: 'text-blue-400 border-blue-400',
    completed: 'text-green-400 border-green-400',
    canceled: 'text-stitchRed border-stitchRed',
  };
  const labels = {
    pending: 'pending',
    to_ship: 'to ship',
    to_receive: 'to receive',
    completed: 'completed',
    canceled: 'canceled',
  };
  return (
    <span className={`text-xs uppercase tracking-widest border rounded-sm px-2 py-1 ${styles[status]}`}>
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
    <div className="bg-canvas2 border border-white/5 rounded-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="font-mono text-xs text-thread/40">
            Order #{order.id} · {new Date(order.created_at).toLocaleString()}
          </div>
          <div className="text-thread">{order.customer_email}</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.order_status} />
          <span className="font-mono text-gold">${order.total}</span>
        </div>
      </div>

      <div className="text-sm text-thread/60 mb-2">
        {order.payment_method === 'paypal' ? 'Paid via PayPal' : 'Cash on Delivery'}
        {' — '}
        <span className="capitalize">{order.payment_status.replace('_', ' ')}</span>
      </div>

      {order.shipping_address && (
        <div className="text-sm text-thread/50 mb-3">
          {order.shipping_address.fullName} · {order.shipping_address.phone}
          <br />
          {order.shipping_address.line1}, {order.shipping_address.city}, {order.shipping_address.emirate}
        </div>
      )}

      <ul className="text-sm text-thread/70 mb-4 space-y-1">
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
              <div className="text-thread/50 mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                  Design note:
                </span>{' '}
                {item.note}
              </div>
            )}
            {item.type === 'custom' && item.design?.path && (
              <div className="mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40 mr-1">
                  Design file:
                </span>
                {designUrls[item.design.path] ? (
                  <a
                    href={designUrls[item.design.path]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold text-xs underline hover:text-thread"
                  >
                    Download {item.design.name}
                  </a>
                ) : (
                  <span className="text-thread/40 text-xs">unavailable</span>
                )}
              </div>
            )}
            {item.type === 'custom' && !feeAction && item.customizationFee > 0 && (
              <div className="text-gold mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                  Customization fee:
                </span>{' '}
                ${Number(item.customizationFee).toFixed(2)}
              </div>
            )}
            {item.type === 'custom' && feeAction && (
              <form action={feeAction} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="itemIndex" value={i} />
                <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
                  Customization fee
                </span>
                <span className="text-thread/40 text-xs">$</span>
                <input
                  type="number"
                  name="fee"
                  step="0.01"
                  min="0"
                  defaultValue={item.customizationFee || ''}
                  placeholder="0.00"
                  className="w-20 bg-canvas border border-white/10 rounded-sm px-2 py-1 text-xs text-thread"
                />
                <button
                  type="submit"
                  className="text-[10px] uppercase tracking-widest text-gold hover:text-thread border border-gold/40 rounded-sm px-2 py-1"
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
