import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext } from '@/lib/cashier';
import { assignRiderToOrder } from '@/app/admin/rider-assign-actions';
import AssignRider from './AssignRider';

// One query per page load, shared by every order card.
const getActiveRiders = cache(async () => {
  const admin = createAdminClient();
  const { data } = await admin
    .from('delivery_profiles')
    .select('user_id, display_name')
    .eq('active', true)
    .order('display_name', { ascending: true });
  return (data || []).map((r) => ({ id: r.user_id, name: r.display_name }));
});

const STARTED = ['picked_up', 'out_for_delivery', 'arrived'];
const STAGE_LABEL = {
  picked_up: 'picked up the order',
  out_for_delivery: 'is on the way',
  arrived: 'has arrived',
};

// Shown on an order card for admin AND staff once the order is Ready for
// Fulfillment. Before the rider picks it up the rider can be chosen or
// changed; after that it is read-only.
export default async function RiderAssignPanel({ order }) {
  const ctx = await getAccessContext();
  if (!ctx.user || !ctx.role || ctx.isCashier) return null;

  const riders = await getActiveRiders();

  if (STARTED.includes(order.delivery_stage)) {
    const name = riders.find((r) => r.id === order.delivery_user_id)?.name || 'The rider';
    return (
      <p className="mt-4 text-sm text-slate-500">
        {name} {STAGE_LABEL[order.delivery_stage]}. The rider can no longer be changed.
      </p>
    );
  }

  return (
    <AssignRider
      id={order.id}
      riders={riders}
      action={assignRiderToOrder}
      currentId={order.delivery_user_id}
    />
  );
}
