'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  advanceDelivery,
  completeDelivery,
  failDelivery,
  releaseDelivery,
} from '@/app/delivery/actions';
import {
  STAGES,
  NEXT_STEP,
  FAIL_REASONS,
  money,
  getStage,
  codDue,
  cleanPhone,
  destinationQuery,
  mapEmbedUrl,
  googleMapsUrl,
  wazeUrl,
} from '@/lib/delivery';

const SHOP_ADDRESS = process.env.NEXT_PUBLIC_SHOP_ADDRESS || '';

// Shrinks phone photos before upload so they stay well under the server action body limit.
async function compressImage(file, maxSize = 1280, quality = 0.75) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;

    return new File([blob], 'proof.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function Stepper({ stage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <ol className="flex items-start justify-between">
      {STAGES.map((step, index) => {
        const done = currentIndex >= 0 && index <= currentIndex;

        return (
          <li key={step.key} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${index === 0 ? 'opacity-0' : done ? 'bg-slate-900' : 'bg-slate-200'}`} />
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </div>
              <div
                className={`h-0.5 flex-1 ${
                  index === STAGES.length - 1 ? 'opacity-0' : index < currentIndex ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            </div>
            <span className={`mt-1.5 text-[11px] leading-tight ${done ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CompleteForm({ order, isPending, onSubmit, onCancel }) {
  const isCod = order.payment_method === 'cod';
  const due = codDue(order);

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [recipient, setRecipient] = useState(order.customer_name || '');
  const [notes, setNotes] = useState('');
  const [collected, setCollected] = useState(isCod ? String(due) : '');
  const [localError, setLocalError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    const compressed = await compressImage(file);
    setProcessing(false);

    setPhoto(compressed);
    setPreview(URL.createObjectURL(compressed));
  }

  const collectedNumber = Number(collected);
  const change = isCod && Number.isFinite(collectedNumber) ? collectedNumber - due : 0;

  function handleSubmit() {
    setLocalError('');

    if (!photo) return setLocalError('Take a photo as proof of delivery.');
    if (!recipient.trim()) return setLocalError('Enter who received the order.');
    if (isCod && (!Number.isFinite(collectedNumber) || collectedNumber < due)) {
      return setLocalError(`Collected cash must be at least ${money(due)}.`);
    }

    const formData = new FormData();
    formData.set('orderId', String(order.id));
    formData.set('photo', photo);
    formData.set('recipientName', recipient.trim());
    formData.set('notes', notes.trim());
    if (isCod) formData.set('codCollected', String(collectedNumber));

    onSubmit(formData);
  }

  return (
    <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Proof of delivery</p>

      <div>
        <label className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white text-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Proof of delivery" className="h-48 w-full object-cover" />
          ) : (
            <span className="px-4 py-10 text-sm text-slate-500">
              {processing ? 'Preparing photo...' : '📷 Tap to take a photo of the delivered parcel'}
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
        </label>
        {preview && (
          <p className="mt-1 text-center text-xs text-slate-400">Tap the photo to retake</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Received by
        </label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          placeholder="Name of recipient"
        />
      </div>

      {isCod && (
        <div className="rounded-xl bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Cash to collect
            </p>
            <p className="text-lg font-semibold text-slate-900">{money(due)}</p>
          </div>

          <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Cash received
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={collected}
              onChange={(e) => setCollected(e.target.value)}
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => setCollected(String(due))}
              className="shrink-0 rounded-xl border border-amber-200 bg-white px-4 text-sm font-medium text-amber-800"
            >
              Exact
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-700">
            Change to give back: <span className="font-semibold">{money(Math.max(change, 0))}</span>
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          placeholder="Left with guard, etc."
        />
      </div>

      {localError && <p className="text-sm text-red-600">{localError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || processing}
          className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : 'Confirm delivery'}
        </button>
      </div>
    </div>
  );
}

function FailForm({ isPending, onSubmit, onCancel, orderId }) {
  const [reason, setReason] = useState(FAIL_REASONS[0]);
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    const formData = new FormData();
    formData.set('orderId', String(orderId));
    formData.set('reason', reason);
    formData.set('notes', notes.trim());
    onSubmit(formData);
  }

  return (
    <div className="mt-5 space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-800">Why could it not be delivered?</p>

      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none"
      >
        {FAIL_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none"
        placeholder="Notes (optional)"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Report failed delivery'}
        </button>
      </div>
    </div>
  );
}

export default function ActiveDelivery({ order }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null); // 'complete' | 'fail' | null

  const stage = getStage(order);
  const isCod = order.payment_method === 'cod';
  const next = NEXT_STEP[stage];

  // Before pickup the map points at the shop (if configured), afterwards at the customer.
  const headingToShop = stage === 'accepted' && Boolean(SHOP_ADDRESS);
  const destination = headingToShop ? SHOP_ADDRESS : destinationQuery(order);

  function run(action, formData) {
    setError('');

    startTransition(async () => {
      const result = await action(formData);

      if (!result?.ok) {
        setError(result?.error || 'Something went wrong. Try again.');
        return;
      }

      setPanel(null);
      router.refresh();
    });
  }

  function simple(action, extra = {}) {
    const formData = new FormData();
    formData.set('orderId', String(order.id));
    Object.entries(extra).forEach(([key, value]) => formData.set(key, value));
    run(action, formData);
  }

  const canFail = ['picked_up', 'out_for_delivery', 'arrived'].includes(stage);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Order #{order.id}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {headingToShop ? 'Head to the shop to pick up' : 'Deliver to customer'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {isCod ? 'Collect' : 'Paid'}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {money(isCod ? codDue(order) : order.total_amount)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Stepper stage={stage} />
        </div>
      </div>

      {stage === 'failed' && (
        <div className="mx-5 mb-4 rounded-2xl bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Delivery failed
          </p>
          <p className="mt-1 text-sm text-red-800">{order.delivery_failed_reason}</p>
        </div>
      )}

      {/* Map */}
      {destination ? (
        <div className="border-y border-slate-100">
          <iframe
            title={`Map for order ${order.id}`}
            src={mapEmbedUrl(destination)}
            className="h-60 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="border-y border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No address available for the map.
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg" aria-hidden="true">{headingToShop ? '🏬' : '📍'}</span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {headingToShop ? 'Pick-up' : 'Drop-off'}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-800">
              {headingToShop ? SHOP_ADDRESS : order.shipping_address || 'No address provided'}
            </p>
          </div>
        </div>

        {destination && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={googleMapsUrl(destination)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Navigate · Google Maps
            </a>
            <a
              href={wazeUrl(destination)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-sky-100 px-4 py-3 text-center text-sm font-semibold text-sky-800"
            >
              Navigate · Waze
            </a>
          </div>
        )}

        {/* Customer */}
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Customer</p>
            <p className="mt-1 truncate font-medium text-slate-900">
              {order.customer_name || 'Customer'}
            </p>
            {order.customer_phone && (
              <p className="text-sm text-slate-500">{order.customer_phone}</p>
            )}
          </div>

          {order.customer_phone && (
            <div className="flex shrink-0 gap-2">
              <a
                href={`tel:${cleanPhone(order.customer_phone)}`}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Call
              </a>
              <a
                href={`sms:${cleanPhone(order.customer_phone)}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                SMS
              </a>
            </div>
          )}
        </div>

        {isCod && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Cash on Delivery
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{money(codDue(order))}</p>
            <p className="mt-0.5 text-xs text-amber-800">Collect this amount before handing over the order.</p>
          </div>
        )}

        {/* Panels */}
        {panel === 'complete' && (
          <CompleteForm
            order={order}
            isPending={isPending}
            onSubmit={(formData) => run(completeDelivery, formData)}
            onCancel={() => setPanel(null)}
          />
        )}

        {panel === 'fail' && (
          <FailForm
            orderId={order.id}
            isPending={isPending}
            onSubmit={(formData) => run(failDelivery, formData)}
            onCancel={() => setPanel(null)}
          />
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Actions */}
        {!panel && (
          <div className="mt-5 space-y-2">
            {stage === 'arrived' && (
              <button
                type="button"
                onClick={() => setPanel('complete')}
                className="w-full rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Complete delivery
              </button>
            )}

            {next && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => simple(advanceDelivery, { to: next.to })}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending ? 'Updating...' : next.label}
              </button>
            )}

            <div className="flex gap-2">
              {canFail && (
                <button
                  type="button"
                  onClick={() => setPanel('fail')}
                  className="flex-1 rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700"
                >
                  Can&apos;t deliver
                </button>
              )}

              {stage === 'accepted' && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (window.confirm('Give this delivery back to the pool?')) {
                      simple(releaseDelivery);
                    }
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 disabled:opacity-50"
                >
                  Release order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
