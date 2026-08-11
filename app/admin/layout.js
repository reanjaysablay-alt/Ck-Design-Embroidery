import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin, getAdminRole } from '@/lib/admin';
import AdminTopBar from '@/components/admin/AdminTopBar';

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
      <AdminTopBar userEmail={user.email} role={role} isAdmin={isAdmin} />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">{children}</div>
    </div>
  );
}

