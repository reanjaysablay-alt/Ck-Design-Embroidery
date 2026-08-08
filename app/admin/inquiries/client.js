'use client';

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
      className="text-black text-xs uppercase tracking-widest hover:underline"
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
      className="text-red-600 text-xs uppercase tracking-widest hover:underline"
    >
      Delete
    </button>
  );
}
