'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminTopBar({ userEmail, role, isAdmin }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const navItems = [
    ...(isAdmin ? [{ href: '/admin/products', label: 'Products' }] : []),
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/inquiries', label: 'Inquiries' },
    ...(isAdmin ? [{ href: '/admin/settings', label: 'Settings' }] : []),
  ];

  return (
    <div className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-display italic text-lg text-thread flex items-center gap-2">
          Admin
          <span
            className={`font-mono text-[10px] uppercase tracking-widest border rounded-sm px-1.5 py-0.5 align-middle ${
              isAdmin ? 'border-gold text-gold' : 'border-white/20 text-thread/50'
            }`}
          >
            {role}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Profile icon — email, back to site, sign out */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setOpen(false);
              }}
              className="flex items-center justify-center text-thread hover:text-gold transition-colors"
              aria-label="Account"
              aria-expanded={profileOpen}
              title={userEmail}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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
                    <p className="text-thread text-sm truncate">{userEmail}</p>
                    <p className="text-thread/40 text-xs uppercase tracking-widest mt-0.5">{role}</p>
                  </div>
                  <Link
                    href="/"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm text-thread/80 hover:text-gold hover:bg-white/5 transition-colors"
                  >
                    View site
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

          {/* Hamburger — admin nav links */}
          <button
            className="flex items-center justify-center text-thread hover:text-gold transition-colors"
            onClick={() => {
              setOpen(!open);
              setProfileOpen(false);
            }}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-5 py-4 flex flex-col gap-4 font-body text-sm uppercase tracking-widest max-w-6xl mx-auto md:px-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-thread/80 hover:text-gold"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
