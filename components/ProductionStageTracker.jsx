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

// Extra final step, Cash on Delivery orders only: the customer pays the
// courier after the order is delivered, so payment comes AFTER Completed.
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

// `idle` renders the same steps with nothing active — shown at the top
// of My Purchases when the customer has no active order, so the tracker
// is always visible and they know what to expect.
export default function ProductionStageTracker({ stage, order = {}, proofUrl, idle = false }) {
  const isCod = order.payment_method === 'cod';
  const stages = isCod ? [...STAGES, PAYMENT_STAGE] : STAGES;
  const isPaid = order.payment_status === 'paid';

  let currentIndex = idle ? -1 : stages.findIndex((s) => s.key === stage);
  if (!idle && currentIndex === -1) return null;

  // COD: once delivered, the active step becomes Payment; when paid,
  // every step (including Payment) shows as done.
  const delivered = stage === 'completed';
  if (isCod && delivered) currentIndex = isPaid ? stages.length : stages.length - 1;

  return (
    <div className={idle ? '' : 'mt-4 pt-4 border-t border-white/10'}>
      <div className="flex overflow-x-auto gap-1 pb-1 -mx-1 px-1">
        {stages.map((s, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={s.key} className="flex flex-col items-center flex-shrink-0 w-[88px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                  current
                    ? 'border-gold text-gold bg-gold/10'
                    : done
                    ? 'border-gold/60 text-gold/60'
                    : 'border-white/15 text-thread/30'
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-[10px] uppercase tracking-wide text-center mt-1.5 leading-tight ${
                  current ? 'text-gold' : done ? 'text-thread/60' : 'text-thread/30'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-thread/60 text-sm mt-3">
        {idle
          ? 'No active orders yet — once you place an order, its progress will show here step by step.'
          : currentIndex >= stages.length
          ? 'Delivered and paid. Thank you!'
          : isCod && delivered
          ? `Delivered. Please pay $${order.total} in cash to our delivery team — payment is confirmed once the shop records it.`
          : stages[currentIndex].description}
      </p>

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

      {stage === 'ready_for_fulfillment' && (
        <p className="text-gold text-sm mt-2">
          {order.payment_method === 'walkin'
            ? 'Ready for pickup — visit the shop to claim your order.'
            : 'Packed and with our delivery team — it will be delivered to you soon.'}
        </p>
      )}
    </div>
  );
}
