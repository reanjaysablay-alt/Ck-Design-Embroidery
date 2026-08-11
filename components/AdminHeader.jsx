'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Minimal top bar for admin/staff accounts browsing the storefront
// pages — no cart, no customer account links, just a profile icon with
// a link back to the dashboard and sign out. Matches the icon style
// used on the customer header and the admin dashboard's own top bar.
export default function AdminHeader({ user, siteTitle = 'Stitchhouse' }) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/admin" className="font-title italic text-2xl tracking-tight text-thread">
          {siteTitle}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-gold align-middle">
            Admin
          </span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center justify-center text-thread hover:text-gold transition-colors"
            aria-label="Account"
            aria-expanded={profileOpen}
            title={user.email}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="3.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {profileOpen && (
            <>
              <button
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setProfileOpen(false)}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div className="absolute right-0 top-full mt-3 w-56 bg-canvas2 border border-white/10 rounded-sm shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-thread text-sm truncate">{user.email}</p>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="block px-4 py-2.5 text-sm text-thread/80 hover:text-gold hover:bg-white/5 transition-colors"
                >
                  Admin dashboard
                </Link>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-stitchRed/90 hover:bg-white/5 transition-colors border-t border-white/10"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
