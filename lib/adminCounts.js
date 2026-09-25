import { createAdminClient } from '@/lib/supabase/server';

// Everything the admin sidebar's nav badges need, in one round trip.
// `isAdmin` gates the staff-approval count — staff shouldn't see (or
// need) that number since they can't act on it anyway.
export async function getAdminBadgeCounts(isAdmin) {
  const admin = createAdminClient();

  const [{ count: pendingOrders }, { count: unreadInquiries }, { count: unreadRatings }, { count: unreadMessages }] =
    await Promise.all([
      admin.from('orders').select('*', { count: 'exact', head: true }).eq('order_status', 'pending'),
      admin
        .from('contact_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .neq('type', 'rating'),
      admin
        .from('contact_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .eq('type', 'rating'),
      admin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'customer')
        .eq('read_by_staff', false),
    ]);

  let pendingStaffCount = 0;
  if (isAdmin) {
    const { count } = await admin
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false);
    pendingStaffCount = count ?? 0;
  }

  return {
    pendingOrders: pendingOrders ?? 0,
    unreadInquiries: unreadInquiries ?? 0,
    unreadRatings: unreadRatings ?? 0,
    unreadMessages: unreadMessages ?? 0,
    pendingStaffCount,
  };
}
