'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Minimal top bar for admin accounts — the admin dashboard is the only
// area an admin uses. No storefront nav, no cart, no customer account
// links.
export default function AdminHeader({ user, siteTitle = 'Stitchhouse' }) {
  const router = useRouter();

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

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-thread/50 text-xs font-mono">
            {user.email}
          </span>
          <Link
            href="/"
            className="text-thread/70 hover:text-gold text-xs uppercase tracking-widest"
          >
            View site
          </Link>
          <button
            onClick={handleSignOut}
            className="text-thread/50 hover:text-stitchRed text-xs uppercase tracking-widest"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

