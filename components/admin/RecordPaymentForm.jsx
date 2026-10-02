'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PAYMENT_MODES } from '@/lib/receipt';

// Cashier-side: record one payment. COD is always cash; walk-in lets the
// cashier choose how the customer paid. If the amount differs from the
// order total a note is required (the server enforces this too). On
// success the cashier is taken to the printable receipt.
export default function RecordPaymentForm({ orderId, total, isCod, action }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(Number(total).toFixed(2));
  const [mode, setMode] = useState('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const differs = Math.abs(Number(amount) - Number(total)) > 0.009;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!window.confirm(`Record $${Number(amount || 0).toFixed(2)} as received for order #${orderId}? This cannot be undone.`)) {
      return;
    }
    const formData = new FormData();
    formData.set('orderId', String(orderId));
    formData.set('amount', amount);
    formData.set('mode', isCod ? 'cash' : mode);
    formData.set('note', note);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
        } else if (result?.recordId) {
          router.push(`/admin/cashier/receipt/${result.recordId}`);
        }
      } catch {
        setError('Something went wrong — please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 pt-2 border-t border-slate-100">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-500">
          <span className="block uppercase tracking-wider text-[9px] text-slate-400 mb-0.5">Amount received</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800"
          />
        </label>

        {isCod ? (
          <div className="text-xs text-slate-500">
            <span className="block uppercase tracking-wider text-[9px] text-slate-400 mb-0.5">Paid by</span>
            <span className="inline-block py-1 text-xs text-slate-700">Cash</span>
          </div>
        ) : (
          <label className="text-xs text-slate-500">
            <span className="block uppercase tracking-wider text-[9px] text-slate-400 mb-0.5">Paid by</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-xs text-slate-500 flex-1 min-w-[9rem]">
          <span className="block uppercase tracking-wider text-[9px] text-slate-400 mb-0.5">
            Note {differs ? '(required — differs)' : '(optional)'}
          </span>
          <input
            type="text"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder={differs ? 'Why does the amount differ?' : 'Reference no., remarks…'}
            className={`w-full bg-slate-50 border rounded-md px-2 py-1 text-xs text-slate-800 ${
              differs && !note ? 'border-amber-400' : 'border-slate-200'
            }`}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 text-white font-medium text-[11px] px-4 py-1.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Recording…' : 'Record payment'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </form>
  );
}
