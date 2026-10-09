'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptDelivery } from '@/app/delivery/actions';
import { money, codDue, destinationQuery, googleMapsUrl, formatDateTime } from '@/lib/delivery';

export default function AvailableCard({ order, onAccepted }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const isCod = order.payment_method === 'cod';
  const query = destinationQuery(order);

  function handleAccept() {
    setMessage('');

    const formData = new FormData();
    formData.set('orderId', String(order.id));

    startTransition(async () => {
      const result = await acceptDelivery(formData);

      if (!result?.ok) {
        setMessage(result?.error || 'Unable to accept this delivery.');
        router.refresh();
        return;
      }

      router.refresh();
      onAccepted?.();
    });
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Order #{order.id}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Ready since {formatDateTime(order.created_at)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {isCod ? 'Collect' : 'Order total'}
          </p>
          <p className="text-xl font-semibold text-slate-900">
            {money(isCod ? codDue(order) : order.total_amount)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
        <span className="mt-0.5 text-lg" aria-hidden="true">📍</span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Drop-off</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">
            {order.shipping_address || 'No address provided'}
          </p>
          {query && (
            <a
              href={googleMapsUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-blue-600"
            >
              Preview route
            </a>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isCod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {isCod ? 'Cash on Delivery' : 'Paid'}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAccept}
        disabled={isPending}
        className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Accepting...' : 'Accept Delivery'}
      </button>

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
    </article>
  );
}
