'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

<<<<<<< HEAD
// Admin picks which rider gets a ready order — same look and flow as the
// cashier assignment: choose one rider from a card list, confirm, assign.
// `action` is assignDeliveryUser. `currentId` (optional) is the rider the
// order is already assigned to. Props are unchanged, so no other file
// needs to change.
export default function AssignRider({ id: idProp, orderId, riders: ridersProp, action, currentId }) {
  const id = idProp ?? orderId;
  const riders = Array.isArray(ridersProp) ? ridersProp : [];
  const router = useRouter();
  const [selected, setSelected] = useState(currentId ? String(currentId) : '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const unchanged = String(currentId || '') === selected;
  const label = (r) => r.name || r.display_name || r.displayName || r.email;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!selected) {
      setError('Choose one rider to assign to this order.');
      return;
    }

    const chosen = riders.find((r) => String(r.id) === selected);
    const message = currentId
      ? `Assign this order to ${label(chosen)}? The current rider will lose this order.`
      : `Assign this order to ${label(chosen)}?`;
    if (!window.confirm(message)) return;

    const formData = new FormData();
    formData.set('id', String(id));
    formData.set('deliveryUserId', selected);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError('Something went wrong — please try again.');
      }
=======
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
>>>>>>> a1bbbf0 (Fix)
    });
  }

  if (!riders.length) {
    return (
<<<<<<< HEAD
      <p className="mt-4 text-sm text-slate-500">
        No rider accounts yet. Add a rider under Delivery Riders, then come back to assign this
        order. Riders can also accept it themselves from the delivery dashboard.
=======
      <p className="mt-4 text-xs text-slate-500">
        No rider accounts yet. Riders can also accept this order themselves
        from the delivery dashboard.
>>>>>>> a1bbbf0 (Fix)
      </p>
    );
  }

  return (
<<<<<<< HEAD
    <form onSubmit={handleSubmit} className="mt-4">
      <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">
        Assign rider
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {riders.map((r) => {
          const isSelected = String(r.id) === selected;
          return (
            <label
              key={r.id}
              className={`flex items-center gap-3 border rounded-2xl px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name={`rider-${id}`}
                value={r.id}
                checked={isSelected}
                onChange={() => {
                  setSelected(String(r.id));
                  setSaved(false);
                }}
                className="accent-indigo-600"
              />
              <span className="text-slate-900 font-medium">{label(r)}</span>
              {String(r.id) === String(currentId || '') && (
                <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">
                  Current rider
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          type="submit"
          disabled={pending || unchanged}
          className="bg-indigo-600 text-white font-medium text-sm px-5 py-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {pending ? 'Saving…' : currentId ? 'Change rider' : 'Assign rider'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Rider assigned.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
=======
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
>>>>>>> a1bbbf0 (Fix)
