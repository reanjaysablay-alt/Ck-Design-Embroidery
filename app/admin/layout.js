import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin, getAdminRole } from '@/lib/admin';
import { getStaffIdentityName } from '@/lib/staffIdentity';
import { getAdminBadgeCounts } from '@/lib/adminCounts';
import AdminSidebar from '@/components/admin/AdminSidebar';
import StaffIdentifyGate from '@/components/admin/StaffIdentifyGate';

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

  // Staff logins can be shared by more than one person — gate on an
  // individual name+PIN before showing anything, so every action they
  // take afterward is attributable to a specific person, not just the
  // shared account. Full admins skip this (there's one business
  // owner, not a shared login).
  if (!isAdmin) {
    const staffName = await getStaffIdentityName();
    if (!staffName) {
      return <StaffIdentifyGate />;
    }
  }

  // Just the first paint — AdminSidebar polls /api/admin/badge-counts
  // itself from here on, so the Orders/Inquiries/Ratings/Messages/Staff
  // badges update live instead of only refreshing on navigation.
  const initialCounts = await getAdminBadgeCounts(isAdmin);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <AdminSidebar role={role} isAdmin={isAdmin} userEmail={user.email} initialCounts={initialCounts} />
      <div className="flex-1 min-w-0 px-4 md:px-10 py-6 md:py-8">{children}</div>
    </div>
  );
}
