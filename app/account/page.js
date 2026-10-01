import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import AccountOrderCard from '@/components/AccountOrderCard';
import ProductionStageTracker from '@/components/ProductionStageTracker';
import { getDesignDownloadUrl } from '@/lib/upload';
import AutoRefresh from '@/components/admin/AutoRefresh';

export const metadata = { title: 'My Purchases — Stitchhouse' };

// Always compute fresh from the database — a customer checking their
// order status right after staff updates it should never see a
// cached/stale snapshot.
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/account');

  // Admin accounts use the admin dashboard only — they don't have a
  // customer account view.
  if (isAdminEmail(user.email)) redirect('/admin');

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  const activeOrders = orders?.filter((o) => ['pending', 'to_ship', 'to_receive', 'preparing', 'ready_for_pickup'].includes(o.order_status)) || [];
  // Short-lived signed links for any design proofs waiting on this
  // customer. Only orders already returned for THIS user (row-level
  // security) are signed, so no one can reach another customer's proof.
  const proofUrls = {};
  await Promise.all(
    activeOrders
      .filter((o) => o.proof_path && o.production_stage === 'proofing_pending')
      .map(async (o) => {
        try {
          proofUrls[o.id] = await getDesignDownloadUrl(o.proof_path, 60 * 60);
        } catch (err) {
          console.error('Could not sign proof URL:', err.message);
        }
      })
  );

  const historyOrders = orders?.filter((o) => ['completed', 'canceled', 'picked_up'].includes(o.order_status)) || [];

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16">
      {/* Keeps the order tracker live — when staff moves an order to the next stage it updates here on its own. */}
      <AutoRefresh intervalMs={8000} />
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">My Purchases</p>

      <h2 id="orders" className="text-xs uppercase tracking-widest text-gold mb-4 scroll-mt-24">
        Order Tracking
      </h2>

      {activeOrders.length === 0 && (
        <div className="bg-canvas2 border border-white/5 rounded-sm p-6 mb-14">
          <ProductionStageTracker idle />
        </div>
      )}

      {activeOrders.length > 0 && (
        <div className="space-y-6 mb-14">
          {activeOrders.map((order) => (
            <AccountOrderCard key={order.id} order={order} proofUrl={proofUrls[order.id]} />
          ))}
        </div>
      )}

      <h2 className="text-xs uppercase tracking-widest text-gold mb-4">
        Order History
      </h2>
      <p className="text-thread/50 mb-8">Completed and canceled orders</p>

      {historyOrders.length === 0 && (
        <p className="text-thread/60">No order history yet.</p>
      )}

      {historyOrders.length > 0 && (
        <div className="space-y-6">
          {historyOrders.map((order) => (
            <AccountOrderCard key={order.id} order={order} showTracker={false} />
          ))}
        </div>
      )}
    </div>
  );
}
