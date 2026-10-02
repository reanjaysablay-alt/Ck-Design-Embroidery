import { createAdminClient } from '@/lib/supabase/server';

// Everything the admin sidebar's nav badges need, in one round trip.
// `isAdmin` gates the staff-approval count — staff shouldn't see (or
// need) that number since they can't act on it anyway.
export async function getAdminBadgeCounts(isAdmin) {
  const admin = createAdminClient();

  const [
    { count: pendingOrders },
    { count: unreadInquiries },
    { count: unreadRatings },
    { count: unreadMessages },
    { count: codToRecord },
    { count: walkinToRecord },
  ] =
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
      // Cashier queue: COD cash the delivery staff handed over, and
      // accepted walk-in orders still unpaid. (Both queries quietly
      // return 0 until the cashier migration has been run.)
      admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', 'cod')
        .neq('payment_status', 'paid')
        .neq('order_status', 'canceled')
        .not('cod_collected_at', 'is', null),
      admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', 'walkin')
        .neq('payment_status', 'paid')
        .not('order_status', 'in', '(pending,canceled)'),
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
    cashierQueue: (codToRecord ?? 0) + (walkinToRecord ?? 0),
  };
}
