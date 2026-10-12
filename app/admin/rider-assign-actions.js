'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext } from '@/lib/cashier';
import { logActivity } from '@/lib/activityLog';

// Admin AND staff can choose the rider for an order that is Ready for
// Fulfillment. Reassigning is only allowed until the rider picks the order
// up, so the goods and the cash never change hands mid-delivery.
export async function assignRiderToOrder(formData) {
  const ctx = await getAccessContext();
  if (!ctx.user || !ctx.role) return { error: 'Not allowed.' };
  // The cashier handles money only — keep rider assignment separate.
  if (ctx.isCashier) return { error: 'The cashier cannot assign riders.' };

  const orderId = Number(formData.get('id'));
  const riderUserId = String(formData.get('deliveryUserId') || '');
  if (!orderId || !riderUserId) return { error: 'Choose a rider first.' };

  const admin = createAdminClient();

  const { data: rider } = await admin
    .from('delivery_profiles')
    .select('user_id, display_name, active')
    .eq('user_id', riderUserId)
    .maybeSingle();
  if (!rider || !rider.active) return { error: 'That rider is not active.' };

  const { data: order } = await admin
    .from('orders')
    .select('id, order_status, payment_method, production_stage, delivery_stage, delivery_user_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { error: 'Order not found.' };
  if (order.payment_method === 'walkin') return { error: 'Walk-in orders are picked up in the shop.' };
  if (['completed', 'canceled'].includes(order.order_status)) {
    return { error: 'This order is already closed.' };
  }
  if (order.production_stage !== 'ready_for_fulfillment') {
    return { error: 'The order must be Ready for Fulfillment first.' };
  }
  if (!['accepted', 'failed', null].includes(order.delivery_stage)) {
    return { error: 'The rider already started this delivery, so it cannot be reassigned.' };
  }

  // Guarded update: only succeeds if the stage has not changed since we read it.
  let q = admin
    .from('orders')
    .update({
      delivery_user_id: riderUserId,
      // Assigning must NOT accept the delivery for the rider. The order
      // shows up in their account as "New assignment" (no stage yet) and
      // only becomes 'accepted' when the rider taps Accept.
      delivery_stage: null,
      delivery_accepted_at: null,
      delivery_failed_reason: null,
    })
    .eq('id', orderId);
  q = order.delivery_stage === null ? q.is('delivery_stage', null) : q.eq('delivery_stage', order.delivery_stage);
  const { data: updated, error } = await q.select('id');

  if (error) return { error: error.message };
  if (!updated?.length) return { error: 'The order changed — refresh and try again.' };

  await logActivity({
    actorEmail: ctx.user.email,
    actorRole: ctx.role,
    action: 'rider_assigned',
    targetType: 'order',
    targetId: orderId,
    details: `Assigned to rider ${rider.display_name}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/delivery');
  return { ok: true };
}
