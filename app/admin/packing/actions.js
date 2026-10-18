'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { assignDeliveryUser } from '@/app/admin/actions';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user;
}

function refresh() {
  revalidatePath('/admin/packing');
  revalidatePath('/admin/orders');
}

// Mark one or many orders as label-printed (single label or "Print all").
export async function markLabelsPrinted(ids) {
  await requireUser();
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!list.length) return;

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('orders')
    .select('id, label_print_count')
    .in('id', list);
  if (error) throw new Error(error.message);

  const now = new Date().toISOString();
  for (const r of rows || []) {
    const { error: upErr } = await admin
      .from('orders')
      .update({ label_printed_at: now, label_print_count: (r.label_print_count || 0) + 1 })
      .eq('id', r.id);
    if (upErr) throw new Error(upErr.message);
  }
  refresh();
}

// Server-side gate: a rider can NOT be assigned until the label is printed,
// even if someone calls the action directly. Forwards to your existing
// assignDeliveryUser with the exact same arguments.
export async function assignRiderChecked(...args) {
  await requireUser();

  const first = args[0];
  let orderId = first;
  if (typeof FormData !== 'undefined' && first instanceof FormData) {
    orderId = first.get('id') || first.get('orderId') || first.get('order_id');
  } else if (first && typeof first === 'object') {
    orderId = first.id || first.orderId || first.order_id;
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('label_printed_at')
    .eq('id', orderId)
    .single();

  if (!order?.label_printed_at) {
    throw new Error('Print the shipping label before assigning a rider.');
  }

  const result = await assignDeliveryUser(...args);
  refresh();
  return result;
}

// Saves the "From" address printed on every shipping label.
export async function saveSenderAddress(address) {
  await requireUser();
  const value = String(address || '').trim();
  const admin = createAdminClient();
  const { error } = await admin
    .from('shop_settings')
    .upsert({ key: 'sender_address', value }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/packing');
  revalidatePath('/admin/packing/print-all');
}
