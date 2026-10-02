'use client';

import { useState, useTransition } from 'react';

// Admin-only: pick THE cashier from the approved staff members. Only one
// person can be cashier at a time — choosing someone new replaces the
// previous cashier.
export default function CashierAssignForm({ profiles, currentId, action }) {
  const [selected, setSelected] = useState(currentId ? String(currentId) : '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const unchanged = String(currentId || '') === selected;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (!selected) {
      setError('Choose one staff member to assign as cashier.');
      return;
    }
    const chosen = profiles.find((p) => String(p.id) === selected);
    const message = currentId
      ? `Make ${chosen?.name} the cashier? The current cashier will lose cashier access.`
      : `Assign ${chosen?.name} as the cashier?`;
    if (!window.confirm(message)) return;

    const formData = new FormData();
    formData.set('profileId', selected);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) setError(result.error);
        else setSaved(true);
      } catch {
        setError('Something went wrong — please try again.');
      }
    });
  }

  if (profiles.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        No approved staff members yet. Approve someone under &ldquo;Pending Approval&rdquo; below, then
        come back to assign the cashier.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-3">
        {profiles.map((p) => {
          const isSelected = String(p.id) === selected;
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 border rounded-2xl px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="cashier"
                value={p.id}
                checked={isSelected}
                onChange={() => {
                  setSelected(String(p.id));
                  setSaved(false);
                }}
                className="accent-indigo-600"
              />
              <span className="text-slate-900 font-medium">{p.name}</span>
              {p.id === currentId && (
                <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">
                  Current cashier
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
          {pending ? 'Saving…' : currentId ? 'Change cashier' : 'Assign cashier'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Cashier assigned.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
