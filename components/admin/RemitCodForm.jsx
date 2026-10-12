'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Cashier-side: confirm the cash a rider handed over for ONE delivered COD
// order and record the payment in a single step. The note becomes required
// when the amount differs from what the order total says (the database
// enforces this too). On success the cashier goes to the printable receipt.
export default function RemitCodForm({ orderId, total, riderName, collected, change, action }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(Number(total).toFixed(2));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const differs = Math.abs(Number(amount) - Number(total)) > 0.009;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (differs && !note.trim()) {
      setError('Add a note explaining why the amount differs from the order total.');
      return;
    }
    if (
      !window.confirm(
        `Confirm you received $${Number(amount || 0).toFixed(2)} from ${riderName || 'the rider'} for order #${orderId}? This records the payment and cannot be undone.`
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set('orderId', String(orderId));
    formData.set('amount', amount);
    formData.set('note', note);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) setError(result.error);
        else if (result?.recordId) router.push(`/admin/cashier/receipt/${result.recordId}`);
      } catch {
        setError('Something went wrong — please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-100">
      <div className="text-xs text-slate-500 mb-2">
        Rider: <span className="text-slate-800 font-medium">{riderName || 'Unknown'}</span>
        {collected != null && (
          <>
            {' · '}Customer paid ${Number(collected).toFixed(2)}
            {change > 0 && <> · change given ${Number(change).toFixed(2)}</>}
          </>
        )}
        {' · '}Rider should hand over{' '}
        <span className="text-slate-800 font-medium">${Number(total).toFixed(2)}</span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-500">
          <span className="block uppercase tracking-wider text-[9px] text-slate-400 mb-0.5">
            Cash received from rider
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800"
          />
        </label>

        <label className="text-xs text-slate-500 flex-1 min-w-[9rem]">
          <span className="block uppercase tracking-wider text-[9px] text-slate-400 mb-0.5">
            Note {differs ? '(required — differs)' : '(optional)'}
          </span>
          <input
            type="text"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="bg-emerald-600 text-white font-medium text-xs px-5 py-2 rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Recording…' : 'Received cash & record payment'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </form>
  );
}
