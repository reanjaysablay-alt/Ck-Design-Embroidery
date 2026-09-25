'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDateTime } from '@/lib/formatDate';
import { groupConversations } from '@/lib/messages';

// Admin/staff can't use Supabase Realtime for this the way the
// customer-facing MessageThread does — the `messages` RLS policy only
// lets a signed-in user read their own thread, so a staff/admin
// browser session (using the anon key like any other client) can't
// subscribe across every customer's conversation. Only the server
// (service role key, never sent to the browser) can read all of them
// — so this polls a small API route backed by that key, same pattern
// as TopProductsLive on /admin/sales.
const POLL_MS = 4000;

export default function AdminMessagesPanel({ initialMessages, initialSelectedUserId, sendAction, markReadAction }) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // Skip while the tab isn't visible — no point refetching a
      // conversation nobody's looking at.
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/admin/messages');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.messages) setMessages(data.messages);
      } catch {
        // Transient network hiccup — the next poll will retry.
      }
    }

    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const conversations = groupConversations(messages);
  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);
  const selectedMessages = selectedUserId ? messages.filter((m) => m.user_id === selectedUserId) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [selectedMessages.length]);

  // Opening a thread counts as staff having seen the customer's
  // messages in it — also re-fires (harmlessly) each time new
  // messages arrive for the open thread via polling.
  useEffect(() => {
    if (selectedUserId) markReadAction(selectedUserId);
  }, [selectedUserId, markReadAction, selectedMessages.length]);

  function selectConversation(userId) {
    setSelectedUserId(userId);
    // Update the URL for shareability/refresh without a full Next.js
    // navigation — that would re-run the server component and throw
    // away the polled state we've built up client-side.
    window.history.replaceState(null, '', `/admin/messages?user=${userId}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selectedUserId) return;
    setSending(true);
    const formData = new FormData();
    formData.set('userId', selectedUserId);
    formData.set('body', body);
    try {
      const sent = await sendAction(formData);
      setText('');
      if (sent) {
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[75vh]">
      <div className="w-full md:w-80 flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-y-auto">
        {conversations.length === 0 && (
          <p className="text-slate-400 text-sm text-center p-8">No customer messages yet.</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.userId}
            onClick={() => selectConversation(c.userId)}
            className={`w-full text-left block px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
              c.userId === selectedUserId
                ? 'bg-indigo-50 dark:bg-indigo-950'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-900 dark:text-slate-100 text-sm font-medium truncate">
                {c.customerEmail || 'Customer'}
              </span>
              {c.unreadCount > 0 && (
                <span className="flex-shrink-0 bg-indigo-600 text-white text-[10px] font-mono rounded-full w-5 h-5 flex items-center justify-center">
                  {c.unreadCount > 9 ? '9+' : c.unreadCount}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate mt-0.5">
              {c.lastSenderRole === 'staff' ? 'You: ' : ''}
              {c.lastBody}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-mono mt-1">
              {formatDateTime(c.lastAt)}
            </p>
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {!selectedUserId && (
          <div className="h-full flex items-center justify-center text-center px-8">
            <p className="text-slate-400">Select a conversation to view and reply.</p>
          </div>
        )}

        {selectedUserId && (
          <div className="flex flex-col h-full">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-slate-900 dark:text-slate-100 text-sm font-medium truncate">
                {selectedConversation?.customerEmail || 'Customer'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selectedMessages.map((m) => (
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
        )}
      </div>
    </div>
  );
}
