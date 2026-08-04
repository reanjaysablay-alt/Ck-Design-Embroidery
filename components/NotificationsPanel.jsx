'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Notification list on the customer /account page. Reads the user's own
// notifications via RLS, marks them as read, and subscribes to Supabase
// Realtime so a new notification appears live the moment an admin
// accepts or declines an order.
export default function NotificationsPanel({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mounted && data) setNotifications(data);
      if (mounted) setLoading(false);
    }
    load();

    const channel = supabase
      .channel('notifications-panel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (mounted) setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const supabase = createClient();
    const ids = unread.map((n) => n.id);
    await supabase.from('notifications').update({ read: true }).in('id', ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (loading) {
    return <p className="text-thread/50 text-sm">Loading notifications…</p>;
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-canvas2 border border-white/5 rounded-sm p-8 text-center">
        <p className="text-thread/60">No notifications yet.</p>
        <p className="text-thread/40 text-sm mt-2">
          You'll be notified here when an order is accepted or declined.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={markAllRead}
          className="text-gold text-xs uppercase tracking-widest hover:underline"
        >
          Mark all as read
        </button>
      </div>
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`rounded-sm border p-4 ${
            n.read ? 'bg-canvas2 border-white/5' : 'bg-canvas2 border-gold/40'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="font-display text-thread">{n.title}</div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-gold mt-2 flex-shrink-0" />}
          </div>
          <p className="text-thread/70 text-sm mt-1 leading-relaxed">{n.body}</p>
          <div className="text-thread/40 text-xs font-mono mt-2">
            {new Date(n.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

