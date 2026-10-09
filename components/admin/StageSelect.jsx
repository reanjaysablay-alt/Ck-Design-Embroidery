'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

const STAGES = [
  {
    value: 'order_received',
    label: 'Order Received',
    description: 'Order details and measurements are pending verification.',
  },
  {
    value: 'proofing_pending',
    label: 'Proofing Pending',
    description: 'The design proof is waiting for customer approval.',
  },
  {
    value: 'design_approved',
    label: 'Design Approved',
    description: 'The customer approved the design and production can begin.',
  },
  {
    value: 'in_tailoring',
    label: 'In Tailoring',
    description: 'Fabric cutting and garment tailoring are in progress.',
  },
  {
    value: 'in_embroidery',
    label: 'In Embroidery',
    description: 'Embroidery and thread stitching are in progress.',
  },
  {
    value: 'quality_check',
    label: 'Quality Check',
    description: 'The finished order is being inspected and prepared for handoff.',
  },
  {
    value: 'ready_for_fulfillment',
    label: 'Ready for Fulfillment',
    description: 'The order is packed and ready for delivery or customer pickup.',
  },
];

function SubmitButton({ current }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? 'Saving...'
        : current === 'ready_for_fulfillment'
          ? 'Saved'
          : 'Update Stage'}
    </button>
  );
}

export default function StageSelect({
  id,
  current,
  action,
  locked = false,
  payNote,
}) {
  const currentStage =
    STAGES.find((stage) => stage.value === current) || STAGES[0];

  const isReadyForFulfillment = current === 'ready_for_fulfillment';

  // The server action RETURNS { error } instead of throwing. A plain
  // <form action={action}> throws that result away, so wrap it and keep
  // the result to show under the dropdown.
  const [state, formAction] = useActionState(
    async (_previous, formData) => (await action(formData)) ?? null,
    null
  );

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Production Stage
          </div>

          <div className="mt-1 text-sm font-semibold text-slate-900">
            {currentStage.label}
          </div>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {currentStage.description}
          </p>
        </div>

        {isReadyForFulfillment && (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Ready for handoff
          </span>
        )}
      </div>

      <form action={formAction} className="space-y-3">
        {/* The server action reads id (older actions) and orderId (newer ones). */}
        <input type="hidden" name="orderId" value={id} />
        <input type="hidden" name="id" value={id} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`production-stage-${id}`}
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Change production stage
            </label>

            {/* key={current} resets the select when the saved stage changes. */}
            <select
              key={current}
              id={`production-stage-${id}`}
              name="stage"
              defaultValue={current || 'order_received'}
              disabled={locked}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {!locked && <SubmitButton current={current} />}
        </div>

        {state?.error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <p className="text-xs leading-5 text-red-700">{state.error}</p>
          </div>
        )}

        {locked && (
          <p className="text-xs text-slate-400">
            Production stage changes are unavailable while this order is
            pending acceptance.
          </p>
        )}

        {isReadyForFulfillment && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-800">
              Ready for fulfillment
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              This order has completed production and packing. Delivery
              orders can now be claimed by an available rider.
            </p>
          </div>
        )}

        {payNote && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs leading-5 text-slate-600">{payNote}</p>
          </div>
        )}
      </form>
    </div>
  );
}