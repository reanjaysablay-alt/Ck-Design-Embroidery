'use client';

import { useRef, useState, useTransition } from 'react';

// Staff-side: upload the digitized embroidery proof for the customer
// to review, and see where the review stands.
export default function ProofUpload({ id, action, proofUrl, proofName, stage, feedback }) {
  const fileRef = useRef(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose a proof file first.');
      return;
    }
    const formData = new FormData();
    formData.set('id', String(id));
    formData.set('file', file);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) setError(result.error);
        else if (fileRef.current) fileRef.current.value = '';
      } catch {
        setError('Upload failed — please try again.');
      }
    });
  }

  let status = 'No proof uploaded yet.';
  if (proofName && stage === 'proofing_pending') {
    status = feedback ? 'Customer requested changes — upload a revised proof.' : 'Proof sent — waiting for the customer to approve.';
  } else if (proofName) {
    status = 'Proof approved by the customer.';
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-slate-400">Design proof</span>
        <span className="text-sm text-slate-600">{status}</span>
        {proofUrl && (
          <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 underline">
            View current proof
          </a>
        )}
      </div>

      {feedback && stage === 'proofing_pending' && (
        <p className="mt-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          Customer note: {feedback}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mt-3">
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.svg"
          className="text-sm text-slate-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-[10px] uppercase tracking-widest text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-full px-3 py-1.5 disabled:opacity-50"
        >
          {pending ? 'Uploading…' : proofName ? 'Upload new proof' : 'Upload proof'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    </div>
  );
}
