'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/formatDate';

// The customer's side of the messages feature — a simple chat thread
// with the shop. Reads/writes go straight through the browser Supabase
// client under RLS (a customer can only ever touch their own thread —
// see the policies in db/schema.sql), same pattern as
// NotificationsPanel. Subscribes to Realtime so a staff reply appears
// live without a refresh.
export default function MessageThread({ userId, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Mark any unread staff replies as read the moment the thread is
  // open — a customer reading the page counts as reading the replies.
  useEffect(() => {
    if (!userId) return;
    const unreadIds = initialMessages
      .filter((m) => m.sender_role === 'staff' && !m.read_by_customer)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    supabase.from('messages').update({ read_by_customer: true }).in('id', unreadIds);
    // Only runs once per page load — initialMessages doesn't change
    // after mount, this is just marking what was unread on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let mounted = true;

    const channel = supabase
      .channel('messages-thread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mounted) return;
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          if (payload.new.sender_role === 'staff') {
            supabase.from('messages').update({ read_by_customer: true }).eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleSend(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({ user_id: userId, sender_role: 'customer', body })
        .select('*')
        .single();
      if (insertError) throw insertError;
      // The Realtime INSERT event above will also deliver this row —
      // add it now for instant feedback, but guard against the double
      // add when the subscription echo lands right after.
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      setText('');
    } catch (err) {
      setError(err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-canvas2 border border-white/5 rounded-sm flex flex-col h-[65vh]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center px-6">
            <p className="text-thread/50 text-sm">
              Send us a message about an order, a custom design, or anything else — a
              staff member will reply here.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-sm px-4 py-2.5 ${
                m.sender_role === 'customer'
                  ? 'bg-gold/20 border border-gold/30'
                  : 'bg-canvas border border-white/10'
              }`}
            >
              {m.sender_role === 'staff' && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-gold mb-1">
                  {m.sender_name || 'Staff'}
                </div>
              )}
              <p className="text-thread/90 text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
              <div className="text-thread/30 text-[10px] font-mono mt-1.5">
                {formatDateTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-white/10 p-4 flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 bg-canvas border border-white/10 rounded-sm px-3 py-2 text-sm text-thread placeholder:text-thread/30 resize-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-gold text-ink font-medium text-xs uppercase tracking-widest px-5 py-2 rounded-full hover:bg-gold/90 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          Send
        </button>
      </form>
      {error && <p className="text-stitchRed text-xs px-4 pb-3">{error}</p>}
    </div>
  );
}
