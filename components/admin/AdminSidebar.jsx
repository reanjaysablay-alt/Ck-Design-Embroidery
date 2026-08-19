'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  orders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h2l1.6 9.6a2 2 0 002 1.9h8.8a2 2 0 002-1.7L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  inquiries: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-4-1L3 20l1-5.5a8.5 8.5 0 1117-3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ratings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2-4.8-4.3 6.4-.6z" strokeLinejoin="round" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
      <path d="M12 13v8" />
    </svg>
  ),
  staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c1.2-3.3 3.7-5 6.5-5s5.3 1.7 6.5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4.2a3.2 3.2 0 010 6.2M18.5 20a6.5 6.5 0 00-3.3-5.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function NavItem({ href, icon, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
      {label}
    </Link>
  );
}

function NavLinks({ isAdmin, pathname, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 flex-1">
      <p className="px-4 text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Menu</p>
      <NavItem href="/admin" icon={ICONS.dashboard} label="Dashboard" active={pathname === '/admin'} onClick={onNavigate} />
      <NavItem href="/admin/orders" icon={ICONS.orders} label="Orders" active={pathname === '/admin/orders'} onClick={onNavigate} />
      <NavItem href="/admin/orders/history" icon={ICONS.history} label="Order History" active={pathname === '/admin/orders/history'} onClick={onNavigate} />
      <NavItem href="/admin/inquiries" icon={ICONS.inquiries} label="Inquiries" active={pathname === '/admin/inquiries'} onClick={onNavigate} />
      <NavItem href="/admin/ratings" icon={ICONS.ratings} label="Ratings" active={pathname === '/admin/ratings'} onClick={onNavigate} />
      {isAdmin && (
        <>
          <p className="px-4 text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-4 mb-1">Manage</p>
          <NavItem href="/admin/products" icon={ICONS.products} label="Products" active={pathname.startsWith('/admin/products')} onClick={onNavigate} />
          <NavItem href="/admin/staff" icon={ICONS.staff} label="Staff" active={pathname === '/admin/staff'} onClick={onNavigate} />
          <NavItem href="/admin/settings" icon={ICONS.settings} label="Settings" active={pathname === '/admin/settings'} onClick={onNavigate} />
        </>
      )}
    </nav>
  );
}

export default function AdminSidebar({ role, isAdmin, userEmail }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Dark mode toggles a `dark` class on <html>. Tailwind's dark:
  // variants only exist on admin components, so this has zero effect
  // on the customer-facing storefront — it's naturally scoped without
  // any extra wiring. Preference persists across admin visits.
  useEffect(() => {
    const stored = localStorage.getItem('admin-dark-mode') === 'true';
    setDark(stored);
    document.documentElement.classList.toggle('dark', stored);
  }, []);

  function toggleDark() {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem('admin-dark-mode', String(next));
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const Brand = (
    <Link href="/admin" className="flex items-center gap-2 px-2" onClick={() => setMobileOpen(false)}>
      <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-display italic text-sm flex-shrink-0">
        CK
      </span>
      <span className="font-display text-lg text-slate-900 dark:text-slate-100 leading-tight">
        Admin
        <span className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 leading-tight">
          {role}
        </span>
      </span>
    </Link>
  );

  const DarkModeToggle = (
    <button
      onClick={toggleDark}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      <span className="flex items-center gap-3">
        <span className="text-slate-400 dark:text-slate-500">{dark ? ICONS.moon : ICONS.sun}</span>
        Dark Mode
      </span>
      <span className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${dark ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            dark ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  );

  const SignOut = (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
    >
      <span className="text-slate-400 dark:text-slate-500">{ICONS.logout}</span>
      Log Out
    </button>
  );

  return (
    <>
      {/* Mobile top bar — replaces the full sidebar below md, opens a
          slide-down panel with the same nav instead of squeezing a
          fixed-width column onto a phone screen. */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 h-14">
        {Brand}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? ICONS.close : ICONS.menu}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4">
          <NavLinks isAdmin={isAdmin} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-1">
            <p className="text-slate-400 text-xs font-mono px-4 mb-2 truncate">{userEmail}</p>
            {DarkModeToggle}
            {SignOut}
          </div>
        </div>
      )}

      {/* Desktop sidebar — unchanged fixed column. */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen flex-col py-6 px-4">
        <div className="mb-8">{Brand}</div>
        <NavLinks isAdmin={isAdmin} pathname={pathname} />
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-1">
          <p className="text-slate-400 text-xs font-mono px-4 mb-2 truncate">{userEmail}</p>
          {DarkModeToggle}
          {SignOut}
        </div>
      </aside>
    </>
  );
}
