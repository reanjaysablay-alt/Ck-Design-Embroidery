'use client';

import { useRef, useState, useTransition } from 'react';
import { addDeliveryRider, removeDeliveryRider } from '@/app/admin/delivery-actions';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400';

export default function DeliveryRiderForm() {
  const formRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setError('');
    setMessage('');

    startTransition(async () => {
      const result = await addDeliveryRider(formData);

      if (!result?.ok) {
        setError(result?.error || 'Unable to add the rider.');
        return;
      }

      setMessage(result.message || 'Rider added.');
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Rider account email
          </label>
          <input name="email" type="email" required placeholder="rider@example.com" className={inputClass} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <input name="displayName" required placeholder="Juan Dela Cruz" className={inputClass} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Phone (optional)</label>
          <input name="phone" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Vehicle</label>
            <input name="vehicleType" placeholder="Motorcycle" className={inputClass} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Plate</label>
            <input name="vehiclePlate" className={inputClass} />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? 'Adding...' : 'Add delivery rider'}
      </button>

      <p className="text-xs text-slate-400">
        The rider must already have an account. After adding, they log in and are taken to the delivery dashboard.
      </p>
    </form>
  );
}

export function RemoveRiderButton({ userId, name }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleClick() {
    if (!window.confirm(`Remove ${name} as a delivery rider?`)) return;

    const formData = new FormData();
    formData.set('userId', userId);

    setError('');

    startTransition(async () => {
      const result = await removeDeliveryRider(formData);

      if (!result?.ok) setError(result?.error || 'Unable to remove.');
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {isPending ? 'Removing...' : 'Remove'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}