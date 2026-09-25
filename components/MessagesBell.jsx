'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Chat-bubble icon in the customer header, next to the notifications
// bell. Just an unread-count badge linking to /account/messages — the
// actual thread lives on that page, this is purely a "you have a
// reply" indicator. Same Realtime pattern as NotificationsBell.
export default function MessagesBell({ userId }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let mounted = true;

    async function loadUnread() {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_role', 'staff')
        .eq('read_by_customer', false);
      if (mounted) setUnread(count || 0);
    }
    loadUnread();

    const channel = supabase
      .channel('messages-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` },
        () => {
          if (mounted) loadUnread();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href="/account/messages"
      className="relative flex items-center justify-center text-thread hover:text-gold transition-colors"
      aria-label={`Messages, ${unread} unread`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path
          d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-4-1L3 20l1-5.5a8.5 8.5 0 1117-3z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-2 -right-2 bg-stitchRed text-thread text-[11px] font-mono rounded-full w-5 h-5 flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
