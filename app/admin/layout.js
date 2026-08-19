import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin, getAdminRole } from '@/lib/admin';
import AdminSidebar from '@/components/admin/AdminSidebar';

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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <AdminSidebar role={role} isAdmin={isAdmin} userEmail={user.email} />
      <div className="flex-1 min-w-0 px-4 md:px-10 py-6 md:py-8">{children}</div>
    </div>
  );
}
