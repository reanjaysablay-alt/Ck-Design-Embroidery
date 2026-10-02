import ProofReview from './ProofReview';

const STAGES = [
  {
    key: 'order_received',
    label: 'Order Received',
    description: 'Order details & measurements pending verification.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3h10a1 1 0 011 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 8h6M9 12h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'proofing_pending',
    label: 'Proofing Pending',
    description: 'Digitized embroidery design uploaded; awaiting your approval.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: 'design_approved',
    label: 'Design Approved',
    description: 'You approved the design; it is queued for production.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'in_tailoring',
    label: 'In Tailoring',
    description: 'Fabric cutting and garment tailoring in progress.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4L8.5 15.5M8.5 8.5L14 14M14 10l6 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'in_embroidery',
    label: 'In Embroidery',
    description: 'Machine hooping and thread stitching in progress.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'quality_check',
    label: 'Quality Check',
    description: 'Thread trimming, ironing, and quality inspection.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L21 21" strokeLinecap="round" />
        <path d="M8 10.5l1.8 1.8L13.5 8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'ready_for_fulfillment',
    label: 'Ready for Fulfillment',
    description: 'Packed and ready for delivery or pickup.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 8l9-5 9 5-9 5-9-5z" strokeLinejoin="round" />
        <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
        <path d="M12 13v8" />
      </svg>
    ),
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Delivered, or claimed in-store. Thank you!',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// Cash on Delivery: the customer pays the delivery team when the order
// arrives, so Payment sits right BEFORE Completed in the icon row:
// ... → Ready for Fulfillment → Payment → Completed.
const PAYMENT_STAGE = {
  key: 'payment',
  label: 'Payment',
  description: 'Pay in cash to our delivery team when your order arrives.',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="12" cy="14.5" r="1.5" />
    </svg>
  ),
};

// The icon row shown on My Purchases (each icon is a clickable tab).
export const TRACKER_STAGES = [
  ...STAGES.slice(0, -1),
  PAYMENT_STAGE,
  STAGES[STAGES.length - 1],
];

// Which tab an order sits under from the customer's point of view.
// A COD order that is out for delivery is waiting on PAYMENT; once the
// shop records the cash it moves on to COMPLETED (awaiting final close).
export function effectiveStage(order) {
  const base = order.production_stage || 'order_received';
  const paysOnHandover = order.payment_method === 'cod' || order.payment_method === 'walkin';
  if (paysOnHandover && base === 'ready_for_fulfillment') {
    return order.payment_status === 'paid' ? 'completed' : 'payment';
  }
  return base;
}

export function stageLabel(key) {
  return TRACKER_STAGES.find((s) => s.key === key)?.label || 'Order Received';
}

// What's happening with this order right now: the stage description,
// the design-proof review (Approve / Request changes) and delivery notes.
// Rendered inside the order card shown under the selected stage tab.
export default function OrderStageDetail({ order, proofUrl }) {
  const stage = order.production_stage || 'order_received';
  const eff = effectiveStage(order);
  const isCod = order.payment_method === 'cod';
  const isWalkin = order.payment_method === 'walkin';
  const paysOnHandover = isCod || isWalkin;

  const message =
    eff === 'payment' && isWalkin
      ? `Ready for pickup. Please pay $${order.total} at the shop counter — payment is confirmed once our cashier records it.`
      : eff === 'payment'
      ? `Out for delivery. Please pay $${order.total} in cash to our delivery team when your order arrives — payment is confirmed once our cashier records it.`
      : paysOnHandover && eff === 'completed' && stage === 'ready_for_fulfillment'
      ? 'Payment received — thank you! Your order will be marked completed shortly.'
      : TRACKER_STAGES.find((s) => s.key === eff)?.description;

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <p className="text-thread/60 text-sm">{message}</p>

      {stage === 'proofing_pending' &&
        (order.proof_path ? (
          <ProofReview
            orderId={order.id}
            proofUrl={proofUrl}
            proofName={order.proof_name}
            feedback={order.proof_feedback}
          />
        ) : (
          <p className="text-thread/50 text-sm mt-2">
            We&apos;re preparing your embroidery design proof — you&apos;ll be notified when it&apos;s ready to approve.
          </p>
        ))}

      {stage === 'ready_for_fulfillment' && !paysOnHandover && (
        <p className="text-gold text-sm mt-2">
          {order.payment_method === 'walkin'
            ? 'Ready for pickup — visit the shop to claim your order.'
            : 'Packed and with our delivery team — it will be delivered to you soon.'}
        </p>
      )}
    </div>
  );
}
