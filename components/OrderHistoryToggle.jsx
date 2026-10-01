'use client';

import { useState } from 'react';

// Collapsible wrapper for the Order History list on My Purchases. The
// order cards themselves are still rendered on the server and passed in
// as children — this only controls whether they're shown, so a long
// history doesn't push everything else down the page. Starts collapsed.
export default function OrderHistoryToggle({ count, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 border border-white/15 text-thread/80 hover:text-gold hover:border-gold/50 text-xs uppercase tracking-widest px-4 py-2.5 rounded-sm transition-colors"
      >
        {open ? 'Hide history' : `Show history (${count})`}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && <div className="space-y-6 mt-6">{children}</div>}
    </div>
  );
}
