'use client';

import { useState, useTransition } from 'react';

export default function SenderAddressCard({ shopName, initialAddress, action }) {
  const [address, setAddress] = useState(initialAddress || '');
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function onSave() {
    setError('');
    setSaved(false);
    start(async () => {
      try {
        await action(address);
        setSaved(true);
      } catch (e) {
        setError(e.message || 'Could not save');
      }
    });
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-[#1c1c1e] ring-1 ring-black/5 dark:ring-white/10 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sender address
          </h2>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Printed in the “From” section of every label.
          </p>
        </div>
        {shopName && (
          <span className="shrink-0 text-[12px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/10 rounded-full px-3 py-1">
            {shopName} · automatic
          </span>
        )}
      </div>

      <textarea
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          setSaved(false);
        }}
        rows={2}
        placeholder="Street, barangay, city, province"
        className="mt-4 w-full resize-none rounded-2xl bg-neutral-100 dark:bg-white/10 px-4 py-3 text-[15px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-[#0071e3]"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={pending}
          className="rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white text-[14px] font-medium px-5 py-2 transition"
        >
          {pending ? 'Saving…' : 'Save address'}
        </button>
        {saved && <span className="text-[13px] text-emerald-600 dark:text-emerald-400">Saved</span>}
        {error && <span className="text-[13px] text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}