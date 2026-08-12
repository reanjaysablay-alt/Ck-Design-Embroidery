'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Bell icon in the customer header. Opens a dropdown of the user's
// recent notifications — notifications only, no account/profile info,
// that lives in the separate profile menu instead. Subscribes to
// Supabase Realtime so it updates immediately when an admin
// accepts/declines an order.
export default function NotificationsBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (mounted && data) setNotifications(data);
      if (mounted) setLoading(false);
    }
    load();

    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mounted) return;
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new, ...prev].slice(0, 10));
          } else {
            load();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAllRead() {
    const unreadOnes = notifications.filter((n) => !n.read);
    if (unreadOnes.length === 0) return;
    const supabase = createClient();
    const ids = unreadOnes.map((n) => n.id);
    await supabase.from('notifications').update({ read: true }).in('id', ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center text-thread hover:text-gold transition-colors"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-stitchRed text-thread text-[11px] font-mono rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-full mt-3 w-80 max-w-[90vw] bg-canvas2 border border-white/10 rounded-sm shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-thread text-sm uppercase tracking-widest">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-gold text-xs uppercase tracking-widest hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <p className="text-thread/50 text-sm px-4 py-6 text-center">Loading…</p>
              )}

              {!loading && notifications.length === 0 && (
                <p className="text-thread/50 text-sm px-4 py-6 text-center">No notifications yet.</p>
              )}

              {!loading &&
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-white/5 last:border-b-0 ${
                      n.read ? '' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-thread text-sm">{n.title}</div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-gold mt-1.5 flex-shrink-0" />}
                    </div>
                    <p className="text-thread/60 text-xs mt-1 leading-relaxed">{n.body}</p>
                    <div className="text-thread/30 text-[10px] font-mono mt-1.5">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>

            <Link
              href="/account#orders"
              onClick={() => setOpen(false)}
              className="block text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gold hover:bg-white/5 transition-colors border-t border-white/10"
            >
              View orders
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
