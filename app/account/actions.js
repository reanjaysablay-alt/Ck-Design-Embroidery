'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';

// Loads the order ONLY if it belongs to the signed-in customer (the
// regular client is subject to row-level security, so someone else's
// order id simply comes back empty), and only while it's actually
// waiting on a proof review. Everything below the ownership check then
// uses the admin client, because customers have no UPDATE permission
// on orders by design.
async function loadOrderAwaitingProof(orderId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order || order.user_id !== user.id) return { error: 'Order not found.' };
  if (['canceled', 'completed', 'picked_up'].includes(order.order_status)) {
    return { error: 'This order is already closed.' };
  }
  if (order.production_stage !== 'proofing_pending' || !order.proof_path) {
    return { error: 'There is no design proof waiting for your approval.' };
  }
  return { order, user };
}

async function emailShopOwner(subject, html) {
  const to = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim();
  if (!to) return;
  await sendMail({ to, subject, html });
}

// Customer approves the digitized design — production can begin.
export async function approveDesign(formData) {
  const orderId = formData.get('orderId');
  const { order, error } = await loadOrderAwaitingProof(orderId);
  if (error) return { error };

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('orders')
    .update({ production_stage: 'design_approved', proof_feedback: null })
    .eq('id', order.id);
  if (updateError) return { error: 'Could not save your approval — please try again.' };

  await emailShopOwner(
    `✅ Design approved — order #${order.id}`,
    `<p>${order.customer_email || 'The customer'} approved the design proof for order #${order.id}.</p><p>It is now <strong>Design Approved</strong> and ready for production.</p>`
  );

  revalidatePath('/account');
  revalidatePath('/admin/orders');
  return { ok: true };
}

// Customer asks for changes. The order stays at Proofing Pending and
// the note is shown to staff on the order card, who upload a new proof.
export async function requestDesignChanges(formData) {
  const orderId = formData.get('orderId');
  const note = formData.get('note')?.toString().trim() || '';
  if (!note) return { error: 'Please describe what you would like changed.' };
  if (note.length > 600) return { error: 'Please keep the note under 600 characters.' };

  const { order, error } = await loadOrderAwaitingProof(orderId);
  if (error) return { error };

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('orders')
    .update({ proof_feedback: note })
    .eq('id', order.id);
  if (updateError) return { error: 'Could not send your request — please try again.' };

  const safeNote = note.replace(/</g, '&lt;');
  await emailShopOwner(
    `✏️ Design changes requested — order #${order.id}`,
    `<p>${order.customer_email || 'The customer'} requested changes to the design proof for order #${order.id}:</p><blockquote>${safeNote}</blockquote><p>Upload a new proof from Admin → Orders.</p>`
  );

  revalidatePath('/account');
  revalidatePath('/admin/orders');
  return { ok: true };
}
