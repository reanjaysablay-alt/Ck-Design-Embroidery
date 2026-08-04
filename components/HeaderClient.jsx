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
  { href: '/services', label: 'For Your Business' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function HeaderClient({ user, siteTitle = 'Stitchhouse' }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

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
          <span className="font-display italic text-lg md:text-2xl tracking-tight text-thread">
            {siteTitle}
          </span>
        </Link>

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

        <div className="flex items-center gap-4">
          <Link
            href="/quote"
            className="hidden md:inline-block text-sm font-body uppercase tracking-widest border border-gold text-gold px-4 py-2 rounded-sm hover:bg-gold hover:text-ink transition-colors"
          >
            Get a Quote
          </Link>

          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/account" className="text-thread/80 hover:text-gold text-sm" title={user.email}>
                {user.user_metadata?.nickname || user.email}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-thread/50 hover:text-stitchRed text-xs uppercase tracking-widest"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="hidden md:inline-block text-thread/80 hover:text-gold text-sm uppercase tracking-widest">
              Log in
            </Link>
          )}

          {user && <NotificationsBell userId={user.id} />}

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
          <button
            className="md:hidden text-thread"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-white/10 px-5 py-4 flex flex-col gap-4 font-body text-sm uppercase tracking-widest">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-thread/80" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/quote" className="text-gold" onClick={() => setOpen(false)}>
            Get a Quote
          </Link>
          {user ? (
            <button onClick={handleSignOut} className="text-left text-thread/60">
              Sign out ({user.user_metadata?.nickname || user.email})
            </button>
          ) : (
            <Link href="/login" className="text-thread/80" onClick={() => setOpen(false)}>
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
