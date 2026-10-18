'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

// ids = one or many order ids. After the print dialog closes they are
// marked as printed, which unlocks rider assignment.
export default function PrintLabelControls({ ids, action, label = 'Print label' }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function onPrint() {
    setError('');
    window.print();
    start(async () => {
      try {
        await action(ids);
        setDone(true);
      } catch (e) {
        setError(e.message || 'Could not mark as printed');
      }
    });
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-3 mb-6">
      <button
        onClick={onPrint}
        disabled={pending || done}
        className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? 'Saving…' : label}
      </button>
      <Link href="/admin/packing" className="text-sm text-slate-500 hover:text-indigo-600">
        ← Back to Packing
      </Link>
      {done && (
        <span className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
          Marked as printed — you can now assign a rider
        </span>
      )}
      {error && (
        <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">
          {error}
        </span>
      )}
    </div>
  );
}