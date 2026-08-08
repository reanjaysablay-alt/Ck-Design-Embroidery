import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import AdminSignOutButton from '@/components/admin/AdminSignOutButton';

export const metadata = { title: 'Admin' };

const NAV = [
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/inquiries', label: 'Inquiries' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/admin');
  if (!isAdminEmail(user.email)) redirect('/');

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center gap-6">
          <Link href="/admin" className="font-semibold text-black">
            Admin
          </Link>
          <nav className="flex items-center gap-5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-black/60 hover:text-black transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <AdminSignOutButton />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">{children}</div>
    </div>
  );
}

