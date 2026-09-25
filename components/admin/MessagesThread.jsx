'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/formatDate';
import { markMessagesReadByStaff } from '@/app/admin/actions';

// Staff/admin side of one customer's thread — read-only history plus
// a reply form that posts through the sendStaffMessage server action
// (see app/admin/actions.js and DeleteProductButton.jsx for the same
// <form action={...}> convention used elsewhere in the dashboard).
export default function MessagesThread({ userId, customerEmail, messages, sendAction }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Opening a thread counts as staff having seen the customer's
  // messages in it.
  useEffect(() => {
    if (userId) markMessagesReadByStaff(userId);
  }, [userId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const formData = new FormData();
    formData.set('userId', userId);
    formData.set('body', body);
    try {
      await sendAction(formData);
      setText('');
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        <p className="text-slate-900 dark:text-slate-100 text-sm font-medium truncate">
          {customerEmail || 'Customer'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_role === 'staff' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                m.sender_role === 'staff'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
              }`}
            >
              {m.sender_role === 'staff' && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-indigo-200 mb-1">
                  {m.sender_name || 'Staff'}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
              <div
                className={`text-[10px] font-mono mt-1.5 ${
                  m.sender_role === 'staff' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {formatDateTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          placeholder="Write a reply…"
          className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-indigo-600 text-white font-medium text-xs px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
