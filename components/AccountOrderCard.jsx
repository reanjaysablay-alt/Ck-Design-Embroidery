import Image from 'next/image';
import { formatDate } from '@/lib/formatDate';
import { productImageSrc } from '@/lib/placeholder';
import OrderStageDetail, { stageLabel, effectiveStage } from './ProductionStageTracker';

// A single order's card on the customer's My Purchases page — shared
// between the active-orders list and the
// plain Order History list below it, so both stay visually identical.
export default function AccountOrderCard({ order, showTracker = true, proofUrl, productImages = {} }) {
  return (
    <div className="bg-canvas2 border border-white/5 rounded-sm p-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-xs text-thread/40">Order #{order.id}</div>
          <div className="text-thread/60 text-sm">
            {formatDate(order.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge order={order} />
          <span className="font-mono text-sm text-gold">${order.total}</span>
        </div>
      </div>
      <div className="text-sm text-thread/70 mb-1">
        {order.payment_method === 'paypal'
          ? 'Paid via PayPal'
          : order.payment_method === 'walkin'
          ? 'Walk-in — pay at pickup'
          : 'Cash on Delivery'}
        {' — '}
        <span className="capitalize">
          {order.payment_method === 'cod' && order.payment_status !== 'paid'
            ? 'Pay after delivery'
            : order.payment_status.replace('_', ' ')}
        </span>
      </div>

      {order.payment_method === 'cod' && Number(order.delivery_fee) > 0 && (
        <div className="text-sm text-thread/60 mt-1">
          <span className="font-mono text-xs uppercase tracking-widest text-thread/40">
            Delivery fee:
          </span>{' '}
          ${Number(order.delivery_fee).toFixed(2)}
        </div>
      )}

      <ul className="text-sm text-thread/50 mt-3 space-y-3">
        {order.items?.map((item, i) => (
          <li key={i} className="flex gap-3 items-start">
            {/* Small product thumbnail — from the order itself, or the
                product's current photo for older orders saved without one. */}
            <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden rounded-sm bg-canvas">
              <Image
                src={productImageSrc(item.image || productImages[item.slug])}
                alt={item.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
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
            </div>
          </li>
        ))}
      </ul>

      {showTracker && order.order_status !== 'canceled' && (
        <OrderStageDetail order={order} proofUrl={proofUrl} />
      )}
    </div>
  );
}

// The badge uses the SAME wording as the order tracker (Order Received,
// In Tailoring, In Embroidery, ...), so the customer never sees a second,
// different set of status names like "To ship" / "To receive". Finished
// orders read Completed or Canceled.
export function OrderStatusBadge({ order }) {
  const status = order.order_status;
  let label;
  let style;
  if (status === 'canceled') {
    label = 'Canceled';
    style = 'text-stitchRed border-stitchRed';
  } else if (status === 'completed' || status === 'picked_up') {
    label = 'Completed';
    style = 'text-green-400 border-green-400';
  } else {
    label = stageLabel(effectiveStage(order));
    style = 'text-gold border-gold';
  }
  return (
    <span className={`text-xs uppercase tracking-widest border rounded-sm px-2 py-1 ${style}`}>
      {label}
    </span>
  );
}
