'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Small "Delete" button with a confirm prompt. `action` is a server
// action taking FormData; `fields` become its form fields.
export default function DeleteAccountButton({ action, fields, confirmText, label = 'Delete' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function onClick() {
    if (!window.confirm(confirmText || 'Delete this account? This cannot be undone.')) return;
    setError('');

    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields || {})) {
        formData.set(key, String(value));
      }

      try {
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (result?.note) window.alert(result.note);
        router.refresh();
      } catch (err) {
        setError(err?.message || 'Could not delete.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 border border-red-200 bg-red-50 rounded-full px-3 py-1.5 disabled:opacity-50"
      >
        {pending ? 'Deleting...' : label}
      </button>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  );
}
