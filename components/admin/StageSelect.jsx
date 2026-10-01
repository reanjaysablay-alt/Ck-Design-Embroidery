'use client';

// Production-stage dropdown for the admin order card. Lives in its own
// client component because the auto-submit onChange handler can't be
// attached to an element rendered by a Server Component (OrderCard).
const STAGE_OPTIONS = [
  ['order_received', 'Order Received'],
  ['proofing_pending', 'Proofing Pending'],
  ['design_approved', 'Design Approved'],
  ['in_tailoring', 'In Tailoring'],
  ['in_embroidery', 'In Embroidery'],
  ['quality_check', 'Quality Check'],
  ['ready_for_fulfillment', 'Ready for Fulfillment'],
  ['completed', 'Completed'],
];

export default function StageSelect({ id, current, action, locked = false }) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs uppercase tracking-widest text-slate-400">Production stage</label>
      <select
        name="stage"
        defaultValue={current || 'order_received'}
        disabled={locked}
        onChange={(e) => e.target.form.requestSubmit()}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
      >
        {STAGE_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <p className="w-full text-xs text-slate-400">
        {locked
          ? 'Accept the order first, then update its progress here — the customer sees every change.'
          : 'Ready for Fulfillment ships the order (or marks it ready for pickup). Completed marks it delivered / picked up.'}
      </p>
    </form>
  );
}
