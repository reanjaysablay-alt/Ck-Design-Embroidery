'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MarkInquiryReadButton({ id }) {
  const router = useRouter();

  async function handleMarkRead() {
    const res = await fetch('/api/admin/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleMarkRead}
      className="text-gold text-xs uppercase tracking-widest hover:underline"
    >
      Mark as read
    </button>
  );
}

export function DeleteInquiryButton({ id }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Delete this inquiry?')) return;
    const res = await fetch('/api/admin/inquiries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-stitchRed text-xs uppercase tracking-widest hover:underline"
    >
      Delete
    </button>
  );
}

export function ReplyForm({ id, existingReply }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(existingReply) === false);
  const [text, setText] = useState(existingReply || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reply: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send reply');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-gold text-xs uppercase tracking-widest hover:underline"
      >
        Edit reply
      </button>
    );
  }

  return (
    <form onSubmit={handleSend} className="mt-2 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Write a reply — this gets emailed to the customer."
        className="w-full bg-canvas border border-white/10 rounded-sm px-3 py-2 text-sm text-thread placeholder:text-thread/30"
      />
      {error && <p className="text-stitchRed text-xs">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-gold text-ink font-body uppercase tracking-widest text-xs px-4 py-2 rounded-sm hover:bg-thread transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending…' : existingReply ? 'Update reply' : 'Send reply'}
        </button>
        {existingReply && (
          <button
            type="button"
            onClick={() => {
              setText(existingReply);
              setOpen(false);
              setError('');
            }}
            className="text-thread/50 text-xs uppercase tracking-widest hover:text-thread"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
