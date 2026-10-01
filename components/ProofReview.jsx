'use client';

import { useState, useTransition } from 'react';
import { approveDesign, requestDesignChanges } from '@/app/account/actions';

// Customer-facing proof review: shows the digitized design the shop
// prepared and lets the customer approve it or ask for changes.
export default function ProofReview({ orderId, proofUrl, proofName, feedback }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(!!feedback);

  const isImage = /\.(jpe?g|png|gif|webp|svg)$/i.test(proofName || '');

  function run(action, extra = {}) {
    setError('');
    const formData = new FormData();
    formData.set('orderId', String(orderId));
    Object.entries(extra).forEach(([k, v]) => formData.set(k, v));
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) setError(result.error);
        else if (action === requestDesignChanges) {
          setSent(true);
          setChanging(false);
        }
      } catch {
        setError('Something went wrong — please try again.');
      }
    });
  }

  return (
    <div className="mt-4 border border-gold/40 bg-gold/5 rounded-sm p-4">
      <p className="text-gold text-sm font-medium mb-2">Your design proof is ready</p>

      {proofUrl ? (
        <div className="mb-3">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofUrl}
              alt="Embroidery design proof"
              className="max-h-72 w-auto rounded-sm border border-white/10 bg-white/5"
            />
          )}
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-gold underline mt-2"
          >
            {isImage ? 'Open full size' : `View proof${proofName ? ` (${proofName})` : ''}`}
          </a>
        </div>
      ) : (
        <p className="text-thread/50 text-sm mb-3">The proof preview is unavailable right now — please refresh.</p>
      )}

      {sent && (
        <p className="text-thread/60 text-sm mb-3">
          Change request sent — we&apos;ll upload a new proof soon.
          {feedback ? <span className="block text-thread/40 mt-1">Your note: {feedback}</span> : null}
        </p>
      )}

      {!changing && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(approveDesign)}
            className="bg-gold text-canvas text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Approve design'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setChanging(true)}
            className="border border-white/25 text-thread/80 text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm disabled:opacity-50"
          >
            Request changes
          </button>
        </div>
      )}

      {changing && (
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="What would you like changed?"
            className="w-full bg-canvas border border-white/15 rounded-sm px-3 py-2 text-sm text-thread"
          />
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(requestDesignChanges, { note })}
              className="bg-gold text-canvas text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm disabled:opacity-50"
            >
              {pending ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setChanging(false)}
              className="text-thread/60 text-xs uppercase tracking-widest px-3 py-2.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-stitchRed text-sm mt-2">{error}</p>}
    </div>
  );
}
