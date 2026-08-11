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
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const router = useRouter();

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

{/* Desktop nav + right controls only shown to signed-in users.
            Signed-out visitors see just the logo and a Log in button. */}
        {user && (
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-body text-sm uppercase tracking-widest">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-thread/80 hover:text-gold transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {user && (
            <Link
              href="/quote"
              className="hidden md:inline-block text-sm font-body uppercase tracking-widest border border-gold text-gold px-4 py-2 rounded-sm hover:bg-gold hover:text-ink transition-colors"
            >
              Get a Quote
            </Link>
          )}

          {user ? (
            <div className="hidden md:block relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center text-thread hover:text-gold transition-colors"
                aria-label="My profile"
                aria-expanded={profileOpen}
                title={displayName}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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
                  <div className="absolute right-0 top-full mt-3 w-56 bg-canvas2 border border-white/10 rounded-sm shadow-xl z-50 overflow-hidden">
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
            <Link href="/login" className="text-thread/80 hover:text-gold text-sm uppercase tracking-widest">
              Log in
            </Link>
          )}

          {user && <NotificationsBell userId={user.id} />}

          {user && (
            <Link
              href="/account/settings"
              className="hidden md:inline-flex text-thread hover:text-gold transition-colors"
              aria-label="Account settings"
              title="Settings"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}

          {user && (
            <Link href="/cart" className="relative text-thread hover:text-gold transition-colors" aria-label={`Cart, ${count} items`}>
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
          {user && (
            <button
              className="md:hidden text-thread"
              onClick={() => {
                setOpen(!open);
                setMobileProfileOpen(false);
              }}
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
        <nav className="md:hidden border-t border-white/10 px-5 py-4 flex flex-col gap-4 font-body text-sm uppercase tracking-widest">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-thread/80" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/quote" className="text-gold" onClick={() => setOpen(false)}>
            Get a Quote
          </Link>
          <Link href="/account/settings" className="text-thread/60" onClick={() => setOpen(false)}>
            Settings
          </Link>

          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
              className="w-full flex items-center gap-2 text-thread/80"
              aria-expanded={mobileProfileOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="3.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              My Profile
            </button>

            {mobileProfileOpen && (
              <div className="mt-3 pl-7 flex flex-col gap-3">
                <p className="text-thread/40 text-xs normal-case tracking-normal truncate">{displayName}</p>
                <Link
                  href="/account"
                  className="text-thread/70 normal-case tracking-normal"
                  onClick={() => setOpen(false)}
                >
                  My Account
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-left text-stitchRed/90 normal-case tracking-normal"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
