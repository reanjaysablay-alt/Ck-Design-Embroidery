'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Admin picks which rider gets a ready order. `action` is assignDeliveryUser.
export default function AssignRider({ id, riders, action }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [riderId, setRiderId] = useState('');
  const [error, setError] = useState('');

  function handleAssign() {
    if (!riderId) {
      setError('Choose a rider first.');
      return;
    }

    setError('');

    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', String(id));
      formData.set('deliveryUserId', riderId);

      const result = await action(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (!riders.length) {
    return (
      <p className="mt-4 text-xs text-slate-500">
        No rider accounts yet. Riders can also accept this order themselves
        from the delivery dashboard.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
        Assign rider
      </span>

      <select
        value={riderId}
        onChange={(e) => setRiderId(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800"
      >
        <option value="">Choose a rider…</option>
        {riders.map((r) => (
          <option key={r.id} value={r.id}>
            {r.email}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleAssign}
        disabled={isPending}
        className="text-[10px] uppercase tracking-widest text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded-full px-3 py-1.5 disabled:opacity-50"
      >
        {isPending ? 'Assigning...' : 'Assign'}
      </button>

      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}