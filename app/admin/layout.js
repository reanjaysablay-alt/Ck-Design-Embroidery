import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin, getAdminRole } from '@/lib/admin';

export const metadata = { title: 'Admin — Stitchhouse' };

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/admin');
  if (!canAccessAdmin(user.email)) redirect('/');

  const role = getAdminRole(user.email); // 'admin' | 'staff'
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center gap-8">
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
          <nav className="flex gap-6 text-sm uppercase tracking-widest">
            {isAdmin && (
              <Link href="/admin/products" className="text-thread/70 hover:text-gold">Products</Link>
            )}
            <Link href="/admin/orders" className="text-thread/70 hover:text-gold">Orders</Link>
            <Link href="/admin/orders/history" className="text-thread/70 hover:text-gold">History</Link>
            <Link href="/admin/inquiries" className="text-thread/70 hover:text-gold">Inquiries</Link>
            <Link href="/admin/ratings" className="text-thread/70 hover:text-gold">Ratings</Link>
            {isAdmin && (
              <Link href="/admin/settings" className="text-thread/70 hover:text-gold">Settings</Link>
            )}
            {isAdmin && (
              <Link href="/admin/staff" className="text-thread/70 hover:text-gold">Staff</Link>
            )}
          </nav>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">{children}</div>
    </div>
  );
}

