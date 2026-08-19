'use client';

import Link from 'next/link';
import { useState } from 'react';
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
};

function NavItem({ href, icon, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
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
        </>
      )}
    </nav>
  );
}

export default function AdminSidebar({ role, isAdmin, userEmail }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <span className="font-display text-lg text-slate-900 leading-tight">
        Admin
        <span className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 leading-tight">
          {role}
        </span>
      </span>
    </Link>
  );

  const SignOut = (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
    >
      <span className="text-slate-400">{ICONS.logout}</span>
      Log Out
    </button>
  );

  return (
    <>
      {/* Mobile top bar — replaces the full sidebar below md, opens a
          slide-down panel with the same nav instead of squeezing a
          fixed-width column onto a phone screen. */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14">
        {Brand}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-500 hover:text-slate-800"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? ICONS.close : ICONS.menu}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4">
          <NavLinks isAdmin={isAdmin} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-slate-400 text-xs font-mono px-4 mb-2 truncate">{userEmail}</p>
            {SignOut}
          </div>
        </div>
      )}

      {/* Desktop sidebar — unchanged fixed column. */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white border-r border-slate-200 min-h-screen flex-col py-6 px-4">
        <div className="mb-8">{Brand}</div>
        <NavLinks isAdmin={isAdmin} pathname={pathname} />
        <div className="border-t border-slate-200 pt-4 mt-4">
          <p className="text-slate-400 text-xs font-mono px-4 mb-2 truncate">{userEmail}</p>
          {SignOut}
        </div>
      </aside>
    </>
  );
}
