'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Customer design-proof actions used by components/ProofReview.jsx.
// Both return { error } on a problem (never throw, so the message
// reaches the page in production) and { ok: true } on success.

async function loadOwnOrder(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Please sign in.' };

  const orderId = String(formData.get('orderId') || '').trim();

  if (!orderId) return { error: 'Missing order.' };

  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from('orders')
    .select('id, user_id, order_status, production_stage, proof_path')
    .eq('id', orderId)
    .maybeSingle();

  if (error) return { error: error.message };

  // Only the customer who owns the order can respond to its proof.
  if (!order || order.user_id !== user.id) {
    return { error: 'Order not found.' };
  }

  if (!order.proof_path) {
    return { error: 'There is no design proof to review yet.' };
  }

  if (['canceled', 'completed', 'picked_up'].includes(order.order_status)) {
    return { error: 'This order is already closed.' };
  }

  return { admin, order };
}

export async function approveDesign(formData) {
  try {
    const result = await loadOwnOrder(formData);

    if (result.error) return { error: result.error };

    const { admin, order } = result;

    const { error } = await admin
      .from('orders')
      .update({
        production_stage: 'design_approved',
        proof_feedback: null,
      })
      .eq('id', order.id)
      .eq('user_id', order.user_id);

    if (error) return { error: error.message };

    revalidatePath('/account');
    revalidatePath('/admin/orders');

    return { ok: true };
  } catch (err) {
    return { error: err?.message || 'Could not approve the design.' };
  }
}

export async function requestDesignChanges(formData) {
  try {
    const note = String(formData.get('note') || '').trim().slice(0, 600);

    if (!note) return { error: 'Tell us what you would like changed.' };

    const result = await loadOwnOrder(formData);

    if (result.error) return { error: result.error };

    const { admin, order } = result;

    const { error } = await admin
      .from('orders')
      .update({
        production_stage: 'proofing_pending',
        proof_feedback: note,
      })
      .eq('id', order.id)
      .eq('user_id', order.user_id);

    if (error) return { error: error.message };

    revalidatePath('/account');
    revalidatePath('/admin/orders');

    return { ok: true };
  } catch (err) {
    return { error: err?.message || 'Could not send your request.' };
  }
}