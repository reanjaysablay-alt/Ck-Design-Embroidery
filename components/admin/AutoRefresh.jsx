'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Renders nothing — drop it anywhere in an admin page's server-rendered
// tree. router.refresh() re-runs that route's Server Components with
// fresh data and patches the result in, the same mechanism Next.js
// already uses after a <form action={serverAction}> submits — so a new
// order, a new inquiry, a new rating, or another staff member's change
// shows up here on its own, the way the Messages inbox and the sidebar
// badges already poll for the same reason.
//
// Skips while the tab is hidden, and while the person is mid-typing in
// a text field (a customization/delivery fee input, a reply box) so a
// refresh never interrupts something they haven't submitted yet.
export default function AutoRefresh({ intervalMs = 8000 }) {
  const router = useRouter();

  useEffect(() => {
    function tick() {
      if (document.visibilityState !== 'visible') return;
      const active = document.activeElement;
      const isTyping = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
      if (isTyping) return;
      router.refresh();
    }
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
