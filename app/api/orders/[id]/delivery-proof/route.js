'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isDeliveryUser } from '@/lib/admin';
import { ALLOWED_FROM, STAGE_TIME_COLUMN } from '@/lib/delivery';

const PROOF_BUCKET = 'delivery-proofs';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Must match the stage staff set in the admin dropdown.
const READY_STAGE = 'ready_for_fulfillment';

// Value written to payment_status once COD cash is collected.
// Set to null to leave payment_status untouched (cashier records it).
const COD_PAID_STATUS = 'paid';

function fail(error) {
  return { ok: false, error };
}

// Returns { user } or { error } so the message reaches the page
// (thrown errors are masked in production builds).
async function requireDelivery() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { error: 'You must be signed in.' };

  if (!isDeliveryUser(user)) {
    console.warn('Delivery access denied for:', user.email);
    return {
      error: `${user.email} is not set up as a delivery account.`,
    };
  }

  return { user };
}

function refresh() {
  revalidatePath('/delivery');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/cod-remittance');
}

function getOrderId(formData) {
  return String(formData.get('orderId') || '').trim();
}

/* ------------------------------------------------------------------ */
/* Accept / release                                                    */
/* ------------------------------------------------------------------ */

export async function acceptDelivery(formData) {
  const auth = await requireDelivery();
  if (auth.error) return fail(auth.error);
  const { user } = auth;

  const orderId = getOrderId(formData);
  if (!orderId) return fail('Missing order ID.');

  const admin = createAdminClient();

  // delivery_user_id IS NULL guards against two riders claiming the same order.
  const { data, error } = await admin
    .from('orders')
    .update({
      delivery_user_id: user.id,
      order_status: 'to_receive',
      delivery_stage: 'accepted',
      delivery_accepted_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('production_stage', READY_STAGE)
    .is('delivery_user_id', null)
    .neq('payment_method', 'walkin')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('acceptDelivery:', error);
    return fail(error.message);
  }

  if (!data) {
    return fail('This delivery is no longer available. Another rider may have taken it.');
  }

  refresh();
  return { ok: true, orderId: data.id };
}

// A rider can only give an order back before picking it up.
export async function releaseDelivery(formData) {
  const auth = await requireDelivery();
  if (auth.error) return fail(auth.error);
  const { user } = auth;

  const orderId = getOrderId(formData);
  if (!orderId) return fail('Missing order ID.');

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .update({
      delivery_user_id: null,
      order_status: 'to_receive',
      delivery_stage: null,
      delivery_accepted_at: null,
    })
    .eq('id', orderId)
    .eq('delivery_user_id', user.id)
    .eq('delivery_stage', 'accepted')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('releaseDelivery:', error);
    return fail(error.message);
  }

  if (!data) return fail('This delivery cannot be released anymore.');

  refresh();
  return { ok: true, orderId: data.id };
}

/* ------------------------------------------------------------------ */
/* Progress: picked_up -> out_for_delivery -> arrived                  */
/* ------------------------------------------------------------------ */

export async function advanceDelivery(formData) {
  const auth = await requireDelivery();
  if (auth.error) return fail(auth.error);
  const { user } = auth;

  const orderId = getOrderId(formData);
  const to = String(formData.get('to') || '');

  if (!orderId) return fail('Missing order ID.');

  const allowedFrom = ALLOWED_FROM[to];
  if (!allowedFrom) return fail('Invalid delivery step.');

  const admin = createAdminClient();

  const patch = {
    delivery_stage: to,
    [STAGE_TIME_COLUMN[to]]: new Date().toISOString(),
  };

  if (to === 'out_for_delivery') patch.delivery_failed_reason = null;

  const { data, error } = await admin
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .eq('delivery_user_id', user.id)
    .in('delivery_stage', allowedFrom)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('advanceDelivery:', error);
    return fail(error.message);
  }

  if (!data) return fail('This step is not available for the order.');

  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Complete with proof of delivery                                     */
/* ------------------------------------------------------------------ */

export async function completeDelivery(formData) {
  const auth = await requireDelivery();
  if (auth.error) return fail(auth.error);
  const { user } = auth;

  const orderId = getOrderId(formData);
  const recipientName = String(formData.get('recipientName') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const photo = formData.get('photo');

  if (!orderId) return fail('Missing order ID.');
  if (!recipientName) return fail('Enter the name of the person who received the order.');

  if (!photo || typeof photo.arrayBuffer !== 'function' || !photo.size) {
    return fail('A proof-of-delivery photo is required.');
  }
  if (photo.size > MAX_PHOTO_BYTES) return fail('The photo is too large (max 5 MB).');

  const admin = createAdminClient();

  // The orders table stores the amount in `total` (not total_amount).
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, user_id, payment_method, cod_amount, total, delivery_stage, delivery_user_id')
    .eq('id', orderId)
    .eq('delivery_user_id', user.id)
    .maybeSingle();

  if (orderError) {
    console.error('completeDelivery:', orderError);
    return fail(orderError.message);
  }

  if (!order) return fail('Order not found.');

  if (!['out_for_delivery', 'arrived'].includes(order.delivery_stage)) {
    return fail('This order is not ready to be completed.');
  }

  const patch = {
    delivery_stage: 'delivered',
    order_status: 'completed',
    production_stage: 'completed',
    delivered_at: new Date().toISOString(),
    delivery_recipient_name: recipientName,
    delivery_notes: notes || null,
  };

  if (order.payment_method === 'cod') {
    const due = Number(order.cod_amount || order.total || 0);
    const collected = Number(formData.get('codCollected'));

    if (!Number.isFinite(collected) || collected < due) {
      return fail(`Collected cash must be at least ${due.toFixed(2)}.`);
    }

    // The amount the rider must remit (change goes back to the customer).
    patch.cod_amount = due;
    patch.cod_collected_amount = collected;
    patch.cod_change = Math.round((collected - due) * 100) / 100;
    if (COD_PAID_STATUS) patch.payment_status = COD_PAID_STATUS;
  }

  const path = `${order.id}/${Date.now()}.jpg`;
  const bytes = Buffer.from(await photo.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(PROOF_BUCKET)
    .upload(path, bytes, { contentType: photo.type || 'image/jpeg', upsert: false });

  if (uploadError) {
    console.error('completeDelivery upload:', uploadError);
    return fail(`Photo upload failed: ${uploadError.message}`);
  }

  patch.delivery_proof_path = path;

  const { data, error } = await admin
    .from('orders')
    .update(patch)
    .eq('id', order.id)
    .eq('delivery_user_id', user.id)
    .in('delivery_stage', ['out_for_delivery', 'arrived'])
    .select('id')
    .maybeSingle();

  if (error || !data) {
    await admin.storage.from(PROOF_BUCKET).remove([path]);
    if (error) console.error('completeDelivery update:', error);
    return fail(error?.message || 'Could not complete this delivery.');
  }

  // Tell the customer, with a link to the proof photo (shown in their
  // notifications bell). Not fatal if it fails.
  if (order.user_id) {
    const { error: notifyError } = await admin.from('notifications').insert({
      user_id: order.user_id,
      order_id: order.id,
      title: 'Your order was delivered',
      body: `Order #${order.id} was delivered and received by ${recipientName}.`,
    });

    if (notifyError) console.error('completeDelivery notify:', notifyError);
  }

  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Failed delivery                                                     */
/* ------------------------------------------------------------------ */

export async function failDelivery(formData) {
  const auth = await requireDelivery();
  if (auth.error) return fail(auth.error);
  const { user } = auth;

  const orderId = getOrderId(formData);
  const reason = String(formData.get('reason') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!orderId) return fail('Missing order ID.');
  if (!reason) return fail('Select a reason.');

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .update({
      delivery_stage: 'failed',
      delivery_failed_reason: reason,
      delivery_notes: notes || null,
    })
    .eq('id', orderId)
    .eq('delivery_user_id', user.id)
    .in('delivery_stage', ['picked_up', 'out_for_delivery', 'arrived'])
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('failDelivery:', error);
    return fail(error.message);
  }

  if (!data) return fail('This delivery cannot be marked as failed.');

  refresh();
  return { ok: true };
}