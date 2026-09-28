'use client';

import Link from 'next/link';

// Minimal top bar for admin/staff accounts — the dashboard is the only
// area they use. No storefront nav, no cart, no customer account
// links. Signing out lives only in the sidebar's own "Log Out" button.
// The badge says "Admin" or "Staff" depending on who's actually
// logged in — staff never see the word "Admin" here.
export default function AdminHeader({ role, siteTitle = 'Stitchhouse' }) {
  const label = role === 'admin' ? 'Admin' : 'Staff';

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center">
        <Link href="/admin" className="font-title italic text-2xl tracking-tight text-thread">
          {siteTitle}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-gold align-middle">
            {label}
          </span>
        </Link>
      </div>
    </header>
  );
}
