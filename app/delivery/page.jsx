'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  acceptDelivery,
  releaseDelivery,
  advanceDelivery,
  completeDelivery,
  failDelivery,
} from '@/app/delivery/actions';

const supabase = createClient();

const AFTER_LOGOUT_PATH = '/';
const THEME_KEY = 'rider-theme';

/*
 * Dark mode is scoped to the dashboard (.rider-dark) by overriding the
 * Tailwind utility classes used below. It works no matter how the rest
 * of the site handles dark mode.
 */
const DARK_CSS = `
.rider-dark { color-scheme: dark; }
.rider-dark.bg-slate-50, .rider-dark .bg-slate-50 { background-color: #020617; }
.rider-dark .bg-white { background-color: #0f172a; }
.rider-dark .bg-slate-100 { background-color: #1e293b; }
.rider-dark .bg-slate-300 { background-color: #475569; }
.rider-dark .bg-slate-950 { background-color: #f8fafc; }
.rider-dark .bg-slate-950.text-white { color: #0f172a; }
.rider-dark .hover\\:bg-slate-800:hover { background-color: #e2e8f0; }
.rider-dark .hover\\:bg-slate-50:hover { background-color: #1e293b; }
.rider-dark .hover\\:border-slate-300:hover { border-color: #64748b; }
.rider-dark .hover\\:text-slate-800:hover { color: #f1f5f9; }

.rider-dark .text-slate-950, .rider-dark .text-slate-900 { color: #f8fafc; }
.rider-dark .text-slate-800 { color: #f1f5f9; }
.rider-dark .text-slate-700 { color: #e2e8f0; }
.rider-dark .text-slate-600 { color: #cbd5e1; }
.rider-dark .text-slate-500, .rider-dark .text-slate-400 { color: #94a3b8; }
.rider-dark ::placeholder { color: #64748b; }

.rider-dark .border-slate-100 { border-color: #1e293b; }
.rider-dark .border-slate-200 { border-color: #334155; }
.rider-dark .border-slate-300 { border-color: #64748b; }

.rider-dark .bg-amber-50, .rider-dark .bg-amber-50\\/70 { background-color: rgba(245, 158, 11, 0.12); }
.rider-dark .bg-emerald-50 { background-color: rgba(16, 185, 129, 0.12); }
.rider-dark .bg-blue-50 { background-color: rgba(59, 130, 246, 0.14); }
.rider-dark .bg-indigo-50 { background-color: rgba(99, 102, 241, 0.14); }
.rider-dark .bg-violet-50 { background-color: rgba(139, 92, 246, 0.14); }
.rider-dark .bg-cyan-50 { background-color: rgba(6, 182, 212, 0.14); }
.rider-dark .bg-red-50 { background-color: rgba(239, 68, 68, 0.12); }

.rider-dark .border-amber-100, .rider-dark .border-amber-200 { border-color: rgba(245, 158, 11, 0.35); }
.rider-dark .border-emerald-200 { border-color: rgba(16, 185, 129, 0.35); }
.rider-dark .border-blue-200 { border-color: rgba(59, 130, 246, 0.35); }
.rider-dark .border-indigo-200 { border-color: rgba(99, 102, 241, 0.35); }
.rider-dark .border-violet-200 { border-color: rgba(139, 92, 246, 0.35); }
.rider-dark .border-cyan-200 { border-color: rgba(6, 182, 212, 0.35); }
.rider-dark .border-red-200 { border-color: rgba(239, 68, 68, 0.35); }

.rider-dark .text-amber-700, .rider-dark .text-amber-800 { color: #fcd34d; }
.rider-dark .text-amber-900, .rider-dark .text-amber-950 { color: #fde68a; }
.rider-dark .text-amber-600 { color: #fbbf24; }
.rider-dark .text-emerald-600, .rider-dark .text-emerald-700, .rider-dark .text-emerald-800 { color: #6ee7b7; }
.rider-dark .text-emerald-950 { color: #a7f3d0; }
.rider-dark .text-blue-700 { color: #93c5fd; }
.rider-dark .text-indigo-700 { color: #a5b4fc; }
.rider-dark .text-violet-700 { color: #c4b5fd; }
.rider-dark .text-cyan-700 { color: #67e8f9; }
.rider-dark .text-red-700, .rider-dark .text-red-800 { color: #fca5a5; }
`;

function money(value) {
  const amount = Number(value || 0);

  return (
    '$' +
    amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function dateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function shortDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/* ---------------------------------------------------------------- */
/* Date helpers (local time) used by the delivery history calendar   */
/* ---------------------------------------------------------------- */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(value) {
  return String(value).padStart(2, '0');
}

// Returns "YYYY-MM-DD" in the rider's local time zone.
function toDateKey(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function keyToDate(key) {
  const [year, month, day] = key
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
}

function longDate(key) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(keyToDate(key));
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

function normalizeAddress(address) {
  if (!address) {
    return {
      name: '',
      phone: '',
      line1: '',
      city: '',
      region: '',
      country: '',
      full: 'No delivery address provided',
    };
  }

  if (typeof address === 'string') {
    try {
      const parsed = JSON.parse(address);
      return normalizeAddress(parsed);
    } catch {
      return {
        name: '',
        phone: '',
        line1: address.trim(),
        city: '',
        region: '',
        country: '',
        full:
          address.trim() || 'No delivery address provided',
      };
    }
  }

  const name = String(address.fullName || '').trim();
  const phone = String(address.phone || '').trim();
  const line1 = String(address.line1 || '').trim();
  const city = String(address.city || '').trim();

  const region = String(
    address.emirate ||
      address.state ||
      address.province ||
      address.region ||
      ''
  ).trim();

  const country = String(address.country || '').trim();

  const locationParts = [
    line1,
    city,
    region,
    country,
  ].filter(Boolean);

  return {
    name,
    phone,
    line1,
    city,
    region,
    country,
    full:
      locationParts.length > 0
        ? locationParts.join(', ')
        : 'No delivery address provided',
  };
}

function getNavigationUrl(address) {
  const normalized = normalizeAddress(address);

  const query = [
    normalized.name,
    normalized.line1,
    normalized.city,
    normalized.region,
    normalized.country,
  ]
    .filter(Boolean)
    .join(', ');

  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function getOrderState(order) {
  if (!order) return 'available';

  const stage = order.delivery_stage;

  if (
    stage === 'delivered' ||
    order.delivered_at
  ) {
    return 'delivered';
  }

  if (stage === 'failed') return 'failed';
  if (stage === 'arrived') return 'arrived';
  if (stage === 'out_for_delivery') {
    return 'out_for_delivery';
  }
  if (stage === 'picked_up') return 'picked_up';
  if (stage === 'accepted') return 'accepted';

  if (
    order.order_status === 'completed' ||
    order.order_status === 'delivered'
  ) {
    return 'delivered';
  }

  if (order.delivery_user_id) return 'accepted';

  return 'available';
}

function isCod(order) {
  return (
    String(order?.payment_method || '').toLowerCase() ===
    'cod'
  );
}

function getCodAmount(order) {
  if (
    order?.cod_amount !== null &&
    order?.cod_amount !== undefined
  ) {
    return Number(order.cod_amount || 0);
  }

  return Number(order?.total || 0);
}

function isCodAlreadyRemitted(order) {
  return Boolean(order?.cod_remitted_at);
}

function StatusBadge({ state }) {
  const styles = {
    available:
      'border-amber-200 bg-amber-50 text-amber-700',
    accepted:
      'border-blue-200 bg-blue-50 text-blue-700',
    picked_up:
      'border-indigo-200 bg-indigo-50 text-indigo-700',
    out_for_delivery:
      'border-violet-200 bg-violet-50 text-violet-700',
    arrived:
      'border-cyan-200 bg-cyan-50 text-cyan-700',
    failed:
      'border-red-200 bg-red-50 text-red-700',
    delivered:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  const labels = {
    available: 'Available',
    accepted: 'Accepted',
    picked_up: 'Picked up',
    out_for_delivery: 'On the way',
    arrived: 'Arrived',
    failed: 'Delivery failed',
    delivered: 'Delivered',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
        styles[state] || styles.available
      }`}
    >
      {labels[state] || 'Available'}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  count,
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </div>

          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {title}
          </h2>

          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {typeof count === 'number' && (
          <div className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            {count} {count === 1 ? 'order' : 'orders'}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center sm:px-6 sm:py-12">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function AddressBlock({ address }) {
  const normalized = normalizeAddress(address);

  return (
    <div className="min-w-0">
      {normalized.name && (
        <p className="truncate text-sm font-semibold text-slate-900">
          {normalized.name}
        </p>
      )}

      {normalized.phone && (
        <p className="mt-0.5 text-sm text-slate-500">
          {normalized.phone}
        </p>
      )}

      <p className="mt-1 text-sm leading-5 text-slate-600">
        {normalized.full}
      </p>
    </div>
  );
}

const mapsLinkClass =
  'mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto';

function AvailableCard({
  order,
  onAccepted,
}) {
  const [isPending, startTransition] =
    useTransition();

  const [error, setError] = useState('');

  const navigationUrl = getNavigationUrl(
    order.shipping_address
  );

  const codAmount = getCodAmount(order);

  function handleAccept() {
    setError('');

    startTransition(async () => {
      const formData = new FormData();

      formData.set(
        'orderId',
        String(order.id)
      );

      const result =
        await acceptDelivery(formData);

      if (!result?.ok) {
        setError(
          result?.error ||
            'Unable to accept this delivery.'
        );
        return;
      }

      onAccepted?.();
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Delivery request
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Order #{order.id}
              </h3>

              <StatusBadge state="available" />
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Received {shortDate(order.created_at)}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-medium text-slate-400">
              Order total
            </div>

            <div className="mt-1 text-lg font-semibold text-slate-950">
              {money(order.total)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-slate-100 p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Customer
          </div>

          <div className="mt-3">
            <p className="break-all text-sm font-medium text-slate-800">
              {order.customer_email ||
                'No email provided'}
            </p>
          </div>

          <div className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Delivery address
            </div>

            <div className="mt-3">
              <AddressBlock
                address={
                  order.shipping_address
                }
              />
            </div>
          </div>

          {navigationUrl && (
            <a
              href={navigationUrl}
              target="_blank"
              rel="noreferrer"
              className={mapsLinkClass}
            >
              Open in Maps
            </a>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Delivery details
          </div>

          <div className="mt-3 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Payment
              </span>

              <span className="text-sm font-semibold uppercase text-slate-800">
                {order.payment_method || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Payment status
              </span>

              <span className="text-sm font-semibold text-slate-800">
                {order.payment_status || '—'}
              </span>
            </div>

            {isCod(order) && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <div className="text-xs font-medium text-amber-700">
                  Cash to collect
                </div>

                <div className="mt-1 text-base font-semibold text-amber-900">
                  {money(codAmount)}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Production
              </span>

              <span className="text-right text-sm font-semibold text-emerald-700">
                Ready for fulfillment
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? 'Accepting...'
              : 'Accept Delivery'}
          </button>

          <p className="mt-2 text-center text-xs leading-5 text-slate-400">
            Accepting this order assigns it to your delivery account.
          </p>
        </div>
      </div>
    </article>
  );
}

const FAIL_REASONS = [
  'Customer not home',
  'Customer unreachable',
  'Wrong or incomplete address',
  'Customer refused the order',
  'Other',
];

// text-base on phones stops iOS from zooming into inputs on focus.
const inputClass =
  'w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none focus:border-slate-400 sm:text-sm';

function ActiveDeliveryCard({
  order,
  onChanged,
  onReleased,
}) {
  const [isPending, startTransition] =
    useTransition();

  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);

  const state = getOrderState(order);

  const navigationUrl =
    getNavigationUrl(
      order.shipping_address
    );

  const cod = isCod(order);
  const codAmount = getCodAmount(order);

  function run(
    action,
    formData,
    after
  ) {
    setError('');

    startTransition(async () => {
      const result =
        await action(formData);

      if (!result?.ok) {
        setError(
          result?.error ||
            'Something went wrong. Try again.'
        );
        return;
      }

      setPanel(null);
      after?.();
    });
  }

  function baseForm() {
    const formData = new FormData();

    formData.set(
      'orderId',
      String(order.id)
    );

    return formData;
  }

  function handleAdvance(to) {
    const formData = baseForm();

    formData.set('to', to);

    run(
      advanceDelivery,
      formData,
      onChanged
    );
  }

  function handleRelease() {
    run(
      releaseDelivery,
      baseForm(),
      onReleased
    );
  }

  function handleComplete(event) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    formData.set(
      'orderId',
      String(order.id)
    );

    run(
      completeDelivery,
      formData,
      onChanged
    );
  }

  function handleFail(event) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    formData.set(
      'orderId',
      String(order.id)
    );

    run(
      failDelivery,
      formData,
      onChanged
    );
  }

  const primaryBtn =
    'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

  const secondaryBtn =
    'inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

  const stepText = {
    accepted:
      'Pick up the packed order from production, then tap "Picked up".',

    picked_up:
      'You have the order. Tap "Start delivery" when you leave.',

    out_for_delivery:
      'On the way to the customer. Tap "I\'ve arrived" at the drop-off.',

    arrived:
      'At the drop-off. Hand over the order and complete it with a photo.',

    failed: `Delivery failed${
      order.delivery_failed_reason
        ? ` — ${order.delivery_failed_reason}`
        : ''
    }. You can try again.`,
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Active delivery
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Order #{order.id}
              </h3>

              <StatusBadge state={state} />
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Accepted{' '}
              {shortDate(
                order.delivery_accepted_at ||
                  order.created_at
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-medium text-slate-400">
              Total
            </div>

            <div className="mt-1 text-lg font-semibold text-slate-950">
              {money(order.total)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Customer
            </div>

            <div className="mt-3">
              <p className="break-all text-sm font-medium text-slate-800">
                {order.customer_email ||
                  'No email provided'}
              </p>

              <div className="mt-4">
                <AddressBlock
                  address={
                    order.shipping_address
                  }
                />
              </div>
            </div>

            {navigationUrl && (
              <a
                href={navigationUrl}
                target="_blank"
                rel="noreferrer"
                className={mapsLinkClass}
              >
                Open in Maps
              </a>
            )}
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Delivery summary
            </div>

            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">
                  Payment
                </span>

                <span className="text-sm font-semibold uppercase text-slate-800">
                  {order.payment_method || '—'}
                </span>
              </div>

              {Number(
                order.delivery_fee || 0
              ) > 0 && (
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">
                    Delivery fee
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {money(
                      order.delivery_fee
                    )}
                  </span>
                </div>
              )}

              {cod && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-medium text-amber-700">
                    Cash to collect
                  </div>

                  <div className="mt-1 text-lg font-semibold text-amber-900">
                    {money(codAmount)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-sm leading-6 text-slate-600">
            {stepText[state]}
          </p>

          <div className="mt-4 space-y-3">
            {state === 'accepted' && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleAdvance(
                      'picked_up'
                    )
                  }
                  className={primaryBtn}
                >
                  {isPending
                    ? 'Saving...'
                    : 'Picked up'}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRelease}
                  className={`${secondaryBtn} w-full`}
                >
                  Release delivery
                </button>
              </>
            )}

            {state === 'picked_up' && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  handleAdvance(
                    'out_for_delivery'
                  )
                }
                className={primaryBtn}
              >
                {isPending
                  ? 'Saving...'
                  : 'Start delivery'}
              </button>
            )}

            {state ===
              'out_for_delivery' && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  handleAdvance('arrived')
                }
                className={primaryBtn}
              >
                {isPending
                  ? 'Saving...'
                  : "I've arrived"}
              </button>
            )}

            {(state ===
              'out_for_delivery' ||
              state === 'arrived') && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setPanel(
                    panel === 'complete'
                      ? null
                      : 'complete'
                  )
                }
                className={`${
                  state === 'arrived'
                    ? primaryBtn
                    : secondaryBtn
                } w-full`}
              >
                Complete delivery
              </button>
            )}

            {state === 'failed' && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  handleAdvance(
                    'out_for_delivery'
                  )
                }
                className={primaryBtn}
              >
                {isPending
                  ? 'Saving...'
                  : 'Try delivery again'}
              </button>
            )}

            {[
              'picked_up',
              'out_for_delivery',
              'arrived',
            ].includes(state) && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setPanel(
                    panel === 'fail'
                      ? null
                      : 'fail'
                  )
                }
                className={`${secondaryBtn} w-full text-red-700`}
              >
                Couldn't deliver
              </button>
            )}
          </div>

          {panel === 'complete' && (
            <form
              onSubmit={handleComplete}
              className="mt-5 max-w-xl space-y-3 border-t border-slate-200 pt-5"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Received by
                </label>

                <input
                  name="recipientName"
                  required
                  placeholder="Name of the person who received it"
                  className={inputClass}
                />
              </div>

              {cod && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Cash collected (at least{' '}
                    {money(codAmount)})
                  </label>

                  <input
                    name="codCollected"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={codAmount}
                    required
                    defaultValue={codAmount}
                    className={inputClass}
                  />

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    This amount will become part of your COD remittance.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Proof photo (required, max 5 MB)
                </label>

                <input
                  name="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                  className="block w-full text-sm text-slate-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Notes (optional)
                </label>

                <textarea
                  name="notes"
                  rows={2}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={primaryBtn}
              >
                {isPending
                  ? 'Submitting...'
                  : 'Confirm delivered'}
              </button>
            </form>
          )}

          {panel === 'fail' && (
            <form
              onSubmit={handleFail}
              className="mt-5 max-w-xl space-y-3 border-t border-slate-200 pt-5"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Reason
                </label>

                <select
                  name="reason"
                  required
                  defaultValue=""
                  className={inputClass}
                >
                  <option
                    value=""
                    disabled
                  >
                    Select a reason…
                  </option>

                  {FAIL_REASONS.map(
                    (reason) => (
                      <option
                        key={reason}
                        value={reason}
                      >
                        {reason}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Notes (optional)
                </label>

                <textarea
                  name="notes"
                  rows={2}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={primaryBtn}
              >
                {isPending
                  ? 'Saving...'
                  : 'Mark as failed'}
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  emphasized = false,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        emphasized
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
          emphasized
            ? 'text-amber-700'
            : 'text-slate-400'
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-2 break-words text-xl font-semibold tracking-tight sm:text-2xl ${
          emphasized
            ? 'text-amber-950'
            : 'text-slate-950'
        }`}
      >
        {value}
      </div>

      {detail && (
        <div className="mt-1 text-xs text-slate-500">
          {detail}
        </div>
      )}
    </div>
  );
}

function RemittanceCard({
  amount,
  count,
}) {
  if (amount <= 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          COD remittance
        </div>

        <div className="mt-2 text-xl font-semibold tracking-tight text-emerald-950 sm:text-2xl">
          $0.00
        </div>

        <p className="mt-1 text-sm text-emerald-800">
          No COD cash is currently waiting to be remitted.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
        COD to remit
      </div>

      <div className="mt-2 text-xl font-semibold tracking-tight text-amber-950 sm:text-2xl">
        {money(amount)}
      </div>

      <p className="mt-1 text-sm text-amber-800">
        {count}{' '}
        {count === 1
          ? 'delivered COD order'
          : 'delivered COD orders'}{' '}
        waiting for staff acceptance.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Icons                                                             */
/* ---------------------------------------------------------------- */

function Icon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const PackageIcon = () => (
  <Icon>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Icon>
);

const TruckIcon = () => (
  <Icon>
    <path d="M1 6h13v10H1z" />
    <path d="M14 9h4l3 3v4h-7z" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Icon>
);

const CheckIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  </Icon>
);

const CashIcon = () => (
  <Icon>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </Icon>
);

const MoonIcon = () => (
  <Icon>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Icon>
);

const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

const LogoutIcon = () => (
  <Icon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);

const MenuIcon = () => (
  <Icon>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

const ChevronLeftIcon = () => (
  <Icon>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

const ChevronRightIcon = () => (
  <Icon>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

/* ---------------------------------------------------------------- */
/* Delivery history calendar                                         */
/* ---------------------------------------------------------------- */

/*
 * selected:  "YYYY-MM-DD" or "all"
 * counts:    { "YYYY-MM-DD": number of deliveries that day }
 * todayKey:  "YYYY-MM-DD" for the rider's local today
 *
 * Days that have deliveries show a small amber dot so the rider can
 * see at a glance which dates they delivered on.
 */
function DeliveryCalendar({
  selected,
  onSelect,
  counts,
  todayKey,
}) {
  const anchor = keyToDate(
    selected && selected !== 'all'
      ? selected
      : todayKey
  );

  const [view, setView] = useState({
    year: anchor.getFullYear(),
    month: anchor.getMonth(),
  });

  function shiftMonth(delta) {
    setView((current) => {
      const next = new Date(
        current.year,
        current.month + delta,
        1
      );

      return {
        year: next.getFullYear(),
        month: next.getMonth(),
      };
    });
  }

  function goToday() {
    const today = keyToDate(todayKey);

    setView({
      year: today.getFullYear(),
      month: today.getMonth(),
    });

    onSelect(todayKey);
  }

  const firstWeekday = new Date(
    view.year,
    view.month,
    1
  ).getDay();

  const daysInMonth = new Date(
    view.year,
    view.month + 1,
    0
  ).getDate();

  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${view.year}-${pad(
        view.month + 1
      )}-${pad(day)}`
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        >
          <ChevronLeftIcon />
        </button>

        <div className="text-center text-sm font-semibold text-slate-950">
          {monthLabel(view.year, view.month)}
        </div>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
          >
            {label}
          </div>
        ))}

        {cells.map((key, index) => {
          if (!key) {
            return (
              <div key={`blank-${index}`} />
            );
          }

          const day = Number(
            key.slice(8, 10)
          );

          const isSelected =
            selected === key;

          const isToday = key === todayKey;
          const count = counts[key] || 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${longDate(key)}${
                count
                  ? `, ${count} ${
                      count === 1
                        ? 'delivery'
                        : 'deliveries'
                    }`
                  : ''
              }`}
              aria-pressed={isSelected}
              className={`relative flex min-h-11 flex-col items-center justify-center rounded-xl text-sm font-semibold transition ${
                isSelected
                  ? 'bg-slate-950 text-white'
                  : isToday
                  ? 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{day}</span>

              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                  count > 0
                    ? 'bg-amber-500'
                    : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={goToday}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Today
        </button>

        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition ${
            selected === 'all'
              ? 'border-slate-200 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          All dates
        </button>
      </div>
    </div>
  );
}

export default function DeliveryDashboard() {
  const [user, setUser] = useState(null);

  const [availableOrders, setAvailableOrders] =
    useState([]);

  const [myOrders, setMyOrders] =
    useState([]);

  const [initialError, setInitialError] =
    useState('');

  const [tab, setTab] =
    useState('available');

  const [signingOut, setSigningOut] =
    useState(false);

  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Delivery history date filter: "YYYY-MM-DD" or "all". Defaults to today.
  const [historyDate, setHistoryDate] =
    useState(() => toDateKey(new Date()));

  const scrollRef = useRef(null);

  // Restore the saved theme after mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      if (
        window.localStorage.getItem(
          THEME_KEY
        ) === 'dark'
      ) {
        setDark(true);
      }
    } catch {
      // Storage unavailable — stay on light.
    }
  }, []);

  // Close the phone drawer with the Escape key.
  useEffect(() => {
    if (!menuOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    window.addEventListener(
      'keydown',
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        onKeyDown
      );
  }, [menuOpen]);

  function toggleDark() {
    setDark((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(
          THEME_KEY,
          next ? 'dark' : 'light'
        );
      } catch {
        // Ignore storage errors.
      }

      return next;
    });
  }

  const load = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setInitialError(
        'You must be signed in.'
      );
      return;
    }

    setUser(authUser);

    const [
      available,
      mine,
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq(
          'production_stage',
          'ready_for_fulfillment'
        )
        .is('delivery_user_id', null)
        .neq(
          'payment_method',
          'walkin'
        )
        .order('created_at', {
          ascending: true,
        }),

      supabase
        .from('orders')
        .select('*')
        .eq(
          'delivery_user_id',
          authUser.id
        )
        .order('created_at', {
          ascending: false,
        }),
    ]);

    setAvailableOrders(
      available.data || []
    );

    setMyOrders(
      mine.data || []
    );

    setInitialError(
      available.error?.message ||
        mine.error?.message ||
        ''
    );
  }, []);

  useEffect(() => {
    load();

    const id = setInterval(
      load,
      15000
    );

    return () =>
      clearInterval(id);
  }, [load]);

  const activeOrders = useMemo(
    () =>
      myOrders.filter(
        (order) =>
          getOrderState(order) !==
          'delivered'
      ),
    [myOrders]
  );

  const deliveredOrders = useMemo(
    () =>
      myOrders.filter(
        (order) =>
          getOrderState(order) ===
          'delivered'
      ),
    [myOrders]
  );

  // How many deliveries were completed on each calendar day.
  const deliveredCountsByDate = useMemo(() => {
    const counts = {};

    deliveredOrders.forEach((order) => {
      const key = toDateKey(
        order.delivered_at
      );

      if (key) {
        counts[key] =
          (counts[key] || 0) + 1;
      }
    });

    return counts;
  }, [deliveredOrders]);

  // Delivered orders for the date picked on the calendar.
  const historyOrders = useMemo(() => {
    if (historyDate === 'all') {
      return deliveredOrders;
    }

    return deliveredOrders.filter(
      (order) =>
        toDateKey(order.delivered_at) ===
        historyDate
    );
  }, [deliveredOrders, historyDate]);

  const historyTotal = useMemo(
    () =>
      historyOrders.reduce(
        (sum, order) =>
          sum + Number(order.total || 0),
        0
      ),
    [historyOrders]
  );

  const historyFees = useMemo(
    () =>
      historyOrders.reduce(
        (sum, order) =>
          sum +
          Number(order.delivery_fee || 0),
        0
      ),
    [historyOrders]
  );

  /*
   * IMPORTANT:
   *
   * This is NOT the total of all delivered COD.
   *
   * It only counts COD that:
   * 1. belongs to this rider
   * 2. has already been delivered
   * 3. has NOT yet been accepted by staff
   *
   * When staff accepts the cash and writes
   * cod_remitted_at, this automatically becomes zero.
   */
  const codToRemitOrders = useMemo(
    () =>
      deliveredOrders.filter(
        (order) =>
          isCod(order) &&
          !isCodAlreadyRemitted(order)
      ),
    [deliveredOrders]
  );

  const codToRemitTotal = useMemo(
    () =>
      codToRemitOrders.reduce(
        (sum, order) =>
          sum + getCodAmount(order),
        0
      ),
    [codToRemitOrders]
  );

  const codActiveTotal = useMemo(
    () =>
      activeOrders.reduce(
        (sum, order) => {
          if (!isCod(order)) {
            return sum;
          }

          return (
            sum + getCodAmount(order)
          );
        },
        0
      ),
    [activeOrders]
  );

  async function handleLogout() {
    setSigningOut(true);

    await supabase.auth.signOut();

    window.location.href =
      AFTER_LOGOUT_PATH;
  }

  function scrollTop() {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function selectTab(key) {
    setTab(key);
    setMenuOpen(false);
    scrollTop();
  }

  function goToActive() {
    load();
    selectTab('active');
  }

  function goToAvailable() {
    load();
    selectTab('available');
  }

  // Opening Completed always starts on today.
  function goToCompleted() {
    setHistoryDate(toDateKey(new Date()));
    selectTab('completed');
  }

  const navItems = [
    {
      key: 'available',
      label: 'Available',
      Icon: PackageIcon,
      badgeText: String(
        availableOrders.length
      ),
      badgeCount: availableOrders.length,
    },
    {
      key: 'active',
      label: 'My Deliveries',
      Icon: TruckIcon,
      badgeText: String(
        activeOrders.length
      ),
      badgeCount: activeOrders.length,
    },
    {
      key: 'completed',
      label: 'Completed',
      Icon: CheckIcon,
      badgeText: String(
        deliveredOrders.length
      ),
      badgeCount: 0,
    },
    {
      key: 'remittance',
      label: 'COD Remittance',
      Icon: CashIcon,
      badgeText: money(codToRemitTotal),
      badgeCount:
        codToRemitOrders.length,
    },
  ];

  const currentLabel =
    navItems.find(
      (item) => item.key === tab
    )?.label || 'Delivery';

  const todayKey = toDateKey(new Date());

  const historyLabel =
    historyDate === 'all'
      ? 'All dates'
      : historyDate === todayKey
      ? `Today · ${longDate(historyDate)}`
      : longDate(historyDate);

  /*
   * Responsive behavior:
   *  - Phone  (< 768px):  slide-in drawer opened from the top bar
   *  - Tablet (768-1023): slim icon rail, always visible
   *  - Desktop (>= 1024): full sidebar with labels
   */
  const navClass = (key) =>
    `relative flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition md:justify-center md:px-0 lg:justify-start lg:px-3.5 ${
      tab === key
        ? 'bg-slate-950 text-white'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
    }`;

  const footerBtn =
    'flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:justify-center md:px-0 lg:justify-start lg:px-3.5';

  return (
    // Fixed + high z-index so the dashboard covers the site header
    // and footer from the root layout.
    <div
      className={`fixed inset-0 z-[100] flex bg-slate-50 ${
        dark ? 'rider-dark' : ''
      }`}
    >
      <style>{DARK_CSS}</style>

      {/* Phone backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/40 md:hidden"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}

      {/* Side menu */}
      <aside
        className={`fixed inset-y-0 left-0 z-[120] flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:w-20 md:max-w-none md:translate-x-0 lg:w-64 ${
          menuOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-100 px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] md:px-0 md:py-5 lg:px-5 lg:py-6">
          {/* Phone drawer + desktop: full heading */}
          <div className="md:hidden lg:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Rider
            </div>

            <div className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
              Delivery
            </div>

            {user?.email && (
              <p className="mt-1 truncate text-xs text-slate-400">
                {user.email}
              </p>
            )}
          </div>

          {/* Tablet rail: compact mark */}
          <div
            className="mx-auto hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white md:flex lg:hidden"
            title={user?.email || 'Delivery'}
          >
            D
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              title={item.label}
              onClick={() =>
                item.key === 'available'
                  ? goToAvailable()
                  : item.key === 'active'
                  ? goToActive()
                  : item.key === 'completed'
                  ? goToCompleted()
                  : selectTab(item.key)
              }
              className={navClass(
                item.key
              )}
            >
              <span className="relative">
                <item.Icon />

                {/* Tablet rail: count bubble */}
                {item.badgeCount > 0 && (
                  <span className="absolute -right-2 -top-2 hidden h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white md:flex lg:hidden">
                    {item.key ===
                    'remittance'
                      ? '!'
                      : item.badgeCount}
                  </span>
                )}
              </span>

              <span className="md:hidden lg:inline">
                {item.label}
              </span>

              <span className="ml-auto text-xs opacity-70 md:hidden lg:inline">
                {item.badgeText}
              </span>
            </button>
          ))}
        </nav>

        {/* Bottom: dark mode + logout only */}
        <div className="space-y-1 border-t border-slate-100 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            onClick={toggleDark}
            title={
              dark
                ? 'Light mode'
                : 'Dark mode'
            }
            className={footerBtn}
          >
            {dark ? (
              <SunIcon />
            ) : (
              <MoonIcon />
            )}

            <span className="md:hidden lg:inline">
              {dark
                ? 'Light mode'
                : 'Dark mode'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            title="Log out"
            className={footerBtn}
          >
            <LogoutIcon />

            <span className="md:hidden lg:inline">
              {signingOut
                ? 'Logging out...'
                : 'Log out'}
            </span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone-only bar to open the side menu */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <button
            type="button"
            onClick={() =>
              setMenuOpen(true)
            }
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <MenuIcon />
          </button>

          <span className="text-base font-semibold text-slate-950">
            {currentLabel}
          </span>
        </div>

        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 md:py-6 lg:px-8 lg:py-8">
            {initialError && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <div className="text-sm font-semibold text-red-800">
                  Delivery data could not be loaded
                </div>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {initialError}
                </p>
              </div>
            )}

            {/* Summary: 2 cols phone, 3 cols tablet, 5 cols wide desktop */}
            <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
              <SummaryCard
                label="Available"
                value={
                  availableOrders.length
                }
                detail="Ready for rider acceptance"
              />

              <SummaryCard
                label="Active"
                value={
                  activeOrders.length
                }
                detail="Currently assigned to you"
              />

              <SummaryCard
                label="Completed"
                value={
                  deliveredOrders.length
                }
                detail="Delivered orders"
              />

              <SummaryCard
                label="COD to collect"
                value={money(
                  codActiveTotal
                )}
                detail="Across active COD deliveries"
              />

              <div className="col-span-2 md:col-span-2 xl:col-span-1">
                <RemittanceCard
                  amount={
                    codToRemitTotal
                  }
                  count={
                    codToRemitOrders.length
                  }
                />
              </div>
            </section>

            {/* Available */}
            {tab === 'available' && (
              <section>
                <SectionHeader
                  eyebrow="Fulfillment queue"
                  title="Available deliveries"
                  description="Orders that production has completed and released for delivery acceptance."
                  count={
                    availableOrders.length
                  }
                />

                {availableOrders.length ===
                0 ? (
                  <EmptyState
                    title="No deliveries available"
                    description="There are currently no fulfillment-ready orders waiting for a rider."
                  />
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    {availableOrders.map(
                      (order) => (
                        <AvailableCard
                          key={order.id}
                          order={order}
                          onAccepted={
                            goToActive
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Active */}
            {tab === 'active' && (
              <section>
                <SectionHeader
                  eyebrow="Assigned to you"
                  title="My deliveries"
                  description="Orders currently assigned to your delivery account."
                  count={
                    activeOrders.length
                  }
                />

                {activeOrders.length ===
                0 ? (
                  <EmptyState
                    title="No active deliveries"
                    description="Accept a fulfillment-ready order to see it here."
                  />
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    {activeOrders.map(
                      (order) => (
                        <ActiveDeliveryCard
                          key={order.id}
                          order={order}
                          onChanged={load}
                          onReleased={
                            goToAvailable
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Completed — delivery history with calendar */}
            {tab === 'completed' && (
              <section>
                <SectionHeader
                  eyebrow="Delivery history"
                  title="Completed deliveries"
                  description="Pick a date on the calendar to see what you delivered that day. Today is shown first."
                  count={
                    historyOrders.length
                  }
                />

                <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
                  <DeliveryCalendar
                    selected={historyDate}
                    onSelect={
                      setHistoryDate
                    }
                    counts={
                      deliveredCountsByDate
                    }
                    todayKey={todayKey}
                  />

                  <div className="min-w-0">
                    {/* Selected date + day totals */}
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Showing
                      </div>

                      <div className="mt-1 text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                        {historyLabel}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs text-slate-400">
                            Deliveries
                          </div>

                          <div className="mt-0.5 text-sm font-semibold text-slate-900">
                            {
                              historyOrders.length
                            }
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400">
                            Order total
                          </div>

                          <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                            {money(
                              historyTotal
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400">
                            Delivery fees
                          </div>

                          <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                            {money(
                              historyFees
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {historyOrders.length ===
                    0 ? (
                      <EmptyState
                        title={
                          deliveredOrders.length ===
                          0
                            ? 'No completed deliveries'
                            : historyDate ===
                              todayKey
                            ? 'No deliveries today yet'
                            : 'No deliveries on this date'
                        }
                        description={
                          deliveredOrders.length ===
                          0
                            ? 'Completed deliveries will appear here after they are marked as delivered.'
                            : 'Pick another date on the calendar. Days with an amber dot have deliveries.'
                        }
                      />
                    ) : (
                      <div className="space-y-4">
                        {historyOrders.map(
                          (order) => {
                            const cod =
                              isCod(order);

                            const codAmount =
                              getCodAmount(
                                order
                              );

                            const remitted =
                              isCodAlreadyRemitted(
                                order
                              );

                            return (
                              <article
                                key={order.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                              >
                                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-base font-semibold text-slate-950">
                                        Order #
                                        {
                                          order.id
                                        }
                                      </h3>

                                      <StatusBadge state="delivered" />
                                    </div>

                                    <p className="mt-1 break-all text-sm text-slate-500">
                                      {order.customer_email ||
                                        'No email provided'}
                                    </p>

                                    <div className="mt-4">
                                      <AddressBlock
                                        address={
                                          order.shipping_address
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="shrink-0 md:text-right">
                                    <div className="text-xs text-slate-400">
                                      Delivered
                                    </div>

                                    <div className="mt-1 text-sm font-semibold text-slate-800">
                                      {dateTime(
                                        order.delivered_at
                                      )}
                                    </div>

                                    <div className="mt-3 text-lg font-semibold text-slate-950">
                                      {money(
                                        order.total
                                      )}
                                    </div>

                                    {cod && (
                                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left md:text-right">
                                        <div className="text-xs text-slate-500">
                                          COD
                                        </div>

                                        <div className="mt-1 text-sm font-semibold text-slate-900">
                                          {money(
                                            codAmount
                                          )}
                                        </div>

                                        <div
                                          className={`mt-1 text-xs font-semibold ${
                                            remitted
                                              ? 'text-emerald-600'
                                              : 'text-amber-600'
                                          }`}
                                        >
                                          {remitted
                                            ? 'Remitted and accepted'
                                            : 'Waiting for remittance'}
                                        </div>
                                      </div>
                                    )}

                                    {Number(
                                      order.delivery_fee ||
                                        0
                                    ) > 0 && (
                                      <div className="mt-2 text-xs text-slate-500">
                                        Delivery fee{' '}
                                        {money(
                                          order.delivery_fee
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* COD Remittance */}
            {tab === 'remittance' && (
              <section>
                <SectionHeader
                  eyebrow="Cash turnover"
                  title="COD Remittance"
                  description="Cash collected from customers that still needs to be handed over to staff."
                  count={
                    codToRemitOrders.length
                  }
                />

                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Amount to remit
                  </div>

                  <div className="mt-2 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">
                    {money(
                      codToRemitTotal
                    )}
                  </div>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
                    Give this amount to your staff or admin. Once staff accepts the cash, the amount will automatically return to $0.00.
                  </p>
                </div>

                {codToRemitOrders.length ===
                0 ? (
                  <EmptyState
                    title="Nothing to remit"
                    description="All COD cash collected from your completed deliveries has already been accepted by staff."
                  />
                ) : (
                  <div className="space-y-4">
                    {codToRemitOrders.map(
                      (order) => (
                        <article
                          key={order.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-slate-950">
                                  Order #
                                  {order.id}
                                </h3>

                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                  To remit
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                Delivered{' '}
                                {shortDate(
                                  order.delivered_at
                                )}
                              </p>

                              <p className="mt-2 break-all text-sm text-slate-600">
                                {order.customer_email ||
                                  'Customer'}
                              </p>
                            </div>

                            <div className="sm:text-right">
                              <div className="text-xs text-slate-400">
                                COD collected
                              </div>

                              <div className="mt-1 text-2xl font-semibold text-slate-950">
                                {money(
                                  getCodAmount(
                                    order
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}