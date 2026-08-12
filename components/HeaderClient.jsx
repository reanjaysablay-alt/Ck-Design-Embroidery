'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { createClient } from '@/lib/supabase/client';
import NotificationsBell from './NotificationsBell';
import logo from '@/logo/ck-logo-transparent.png';

const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/account#orders', label: 'Track Order' },
  { href: '/services', label: 'For Your Business' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function HeaderClient({ user, siteTitle = 'Stitchhouse' }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  // Opening a dropdown/panel waits 1 second, then fades in (see
  // .animate-dropdown-fade-in in globals.css). Closing stays instant —
  // a delay there would make the UI feel stuck when dismissing.
  function toggleHamburger() {
    if (open) {
      setOpen(false);
      return;
    }
    setProfileOpen(false);
    setTimeout(() => setOpen(true), 1000);
  }

  function toggleProfile() {
    if (profileOpen) {
      setProfileOpen(false);
      return;
    }
    setOpen(false);
    setTimeout(() => setProfileOpen(true), 1000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const displayName = user?.user_metadata?.nickname || user?.email;

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={logo}
            alt="CK Design Embroidery logo"
            width={32}
            height={32}
            className="h-7 w-auto object-contain"
            priority
          />
          <span className="font-title italic text-lg md:text-2xl tracking-tight text-thread">
            {siteTitle}
          </span>
        </Link>

        {/* Bell, cart, profile, and the hamburger all live in ONE flex row
            with a single consistent gap-4, visible at every screen size.
            The hamburger panel below holds page navigation only — account
            actions (My Account/Settings/Log out) live in the profile
            dropdown instead, not duplicated here. */}
        <div className="flex items-center gap-4">
          {user && (
            <span className="flex">
              <NotificationsBell userId={user.id} />
            </span>
          )}

          {user && (
            <Link
              href="/cart"
              className="flex relative items-center justify-center text-thread hover:text-gold transition-colors"
              aria-label={`Cart, ${count} items`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 6h2l1.6 9.6a2 2 0 002 1.9h8.8a2 2 0 002-1.7L21 8H6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9.5" cy="21" r="1.3" fill="currentColor" stroke="none"/>
                <circle cx="17.5" cy="21" r="1.3" fill="currentColor" stroke="none"/>
              </svg>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-stitchRed text-thread text-[11px] font-mono rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={toggleProfile}
                className="flex items-center justify-center text-thread hover:text-gold transition-colors"
                aria-label="My profile"
                aria-expanded={profileOpen}
                title={displayName}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="3.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {profileOpen && (
                <>
                  {/* Click-outside backdrop */}
                  <button
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileOpen(false)}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <div className="absolute right-0 top-full mt-3 w-56 bg-canvas2 border border-white/10 rounded-sm shadow-xl z-50 overflow-hidden animate-dropdown-fade-in">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-thread text-sm truncate">{displayName}</p>
                      <p className="text-thread/40 text-xs truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-thread/80 hover:text-gold hover:bg-white/5 transition-colors"
                    >
                      My Account
                    </Link>
                    <Link
                      href="/account/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-thread/80 hover:text-gold hover:bg-white/5 transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-stitchRed/90 hover:bg-white/5 transition-colors border-t border-white/10"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden md:inline-block text-thread/80 hover:text-gold text-sm uppercase tracking-widest">
              Log in
            </Link>
          )}

          {!user && (
            <Link href="/login" className="md:hidden text-thread/80 hover:text-gold text-sm uppercase tracking-widest">
              Log in
            </Link>
          )}

          {user && (
            <button
              className="flex items-center justify-center text-thread hover:text-gold transition-colors"
              onClick={toggleHamburger}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && user && (
        <nav className="border-t border-white/10 px-5 py-4 flex flex-col gap-4 font-body text-sm uppercase tracking-widest animate-dropdown-fade-in">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-thread/80 hover:text-gold" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/quote" className="text-gold" onClick={() => setOpen(false)}>
            Get a Quote
          </Link>
        </nav>
      )}
    </header>
  );
}
