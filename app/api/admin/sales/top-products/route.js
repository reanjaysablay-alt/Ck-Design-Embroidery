import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { SALE_STATUSES, computeTopProducts } from '@/lib/salesStats';

// Sales is admin-only now — staff no longer see this page, so this
// endpoint (which powers it) is locked down the same way.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    throw new Error('Not authorized');
  }
  return user;
}

// Polled every few seconds by TopProductsLive on /admin/sales so the
// ranking updates shortly after a new sale completes. Deliberately a
// polled endpoint rather than a browser Supabase Realtime subscription:
// orders' RLS policy only lets a signed-in user read their own rows,
// so a staff/admin browser session (using the anon key, same as every
// other client component) can't subscribe to other customers' order
// changes directly — only the server-side admin client (service role
// key, never sent to the browser) can read across all orders. This
// route is that narrow, read-only bridge: it re-runs the same
// aggregation the Sales page does on load, nothing else.
export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { data: orders } = await admin
      .from('orders')
      .select('items')
      .in('order_status', SALE_STATUSES);

    return NextResponse.json({ topProducts: computeTopProducts(orders || []) });
  } catch (err) {
    if (err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
