import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const metadata = { title: 'Admin — Stitchhouse' };

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/admin');
  if (!isAdminEmail(user.email)) redirect('/');

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center gap-8">
          <Link href="/admin" className="font-display italic text-lg text-thread">
            Admin
          </Link>
          <nav className="flex gap-6 text-sm uppercase tracking-widest">
            <Link href="/admin/products" className="text-thread/70 hover:text-gold">Products</Link>
            <Link href="/admin/orders" className="text-thread/70 hover:text-gold">Orders</Link>
            <Link href="/admin/inquiries" className="text-thread/70 hover:text-gold">Inquiries</Link>
            <Link href="/admin/settings" className="text-thread/70 hover:text-gold">Settings</Link>
          </nav>
          <Link href="/" className="ml-auto text-thread/40 text-xs hover:text-thread">
            ← Back to site
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">{children}</div>
    </div>
  );
}

