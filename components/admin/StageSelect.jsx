'use client';

import { useEffect, useState, useTransition } from 'react';

// Production-stage dropdown for the admin order card. Lives in its own
// client component (the onChange handler can't be attached from a
// Server Component).
//
// It is CONTROLLED on purpose: an uncontrolled <select> inside a form
// gets reset by React after the server action finishes, which made the
// stage jump back to "Order Received" even though it had saved. Here
// the chosen stage stays on screen, is re-synced from the database
// value whenever the page refreshes, and rolls back with a message if
// the update is rejected.
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

export default function StageSelect({ id, current, action, locked = false, cod = false }) {
  const saved = current || 'order_received';
  const [value, setValue] = useState(saved);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  // Follow the database value whenever the page re-renders with a new one.
  useEffect(() => {
    setValue(saved);
  }, [saved]);

  function handleChange(e) {
    const next = e.target.value;
    const previous = value;
    setValue(next);
    setError('');

    const formData = new FormData();
    formData.set('id', String(id));
    formData.set('stage', next);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) {
          setValue(previous);
          setError(result.error);
        }
      } catch (err) {
        setValue(previous);
        setError('Could not update the stage — please try again.');
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
      <label className="text-xs uppercase tracking-widest text-slate-400">Production stage</label>
      <select
        value={value}
        disabled={locked || pending}
        onChange={handleChange}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 disabled:opacity-60"
      >
        {STAGE_OPTIONS.map(([optValue, label]) => (
          <option key={optValue} value={optValue}>
            {label}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-400">Saving…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
      <p className="w-full text-xs text-slate-400">
        {locked
          ? 'Accept the order first, then update its progress here — the customer sees every change.'
          : cod
          ? 'Ready for Fulfillment sends the order out for delivery. After delivery press Mark Payment Received, then choose Completed.'
          : 'Ready for Fulfillment sends the order out for delivery (or marks it ready for pickup). Completed marks it delivered / picked up.'}
      </p>
    </div>
  );
}
