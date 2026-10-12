'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext } from '@/lib/cashier';
import { logActivity } from '@/lib/activityLog';

// Cashier (or admin) confirms the cash a rider handed over for a delivered
// COD order and records the payment in ONE database step.
export async function remitCod(formData) {
  const ctx = await getAccessContext();
  if (!ctx.user || !(ctx.isAdmin || ctx.isCashier)) {
    return { error: 'Only the cashier or an admin can record COD remittance.' };
  }

  const orderId = Number(formData.get('orderId'));
  const amount = Number(formData.get('amount'));
  const note = String(formData.get('note') || '').slice(0, 300);
  if (!orderId || !(amount > 0)) return { error: 'Enter a valid amount.' };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('cashier_remit_cod', {
    p_order_id: orderId,
    p_amount_received: amount,
    p_note: note,
    p_recorded_by: ctx.isAdmin ? 'Admin' : ctx.staffName,
    p_recorded_by_email: ctx.user.email,
    p_remitted_by: ctx.user.id,
  });

  if (error) return { error: error.message };

  await logActivity({
    actorEmail: ctx.user.email,
    actorRole: ctx.role,
    action: 'cod_remitted',
    targetType: 'order',
    targetId: orderId,
    details: `Received $${amount.toFixed(2)} from rider`,
  });

  revalidatePath('/admin/cashier');
  revalidatePath('/admin/cod-remittance');
  revalidatePath('/admin/orders');
  return { recordId: data };
}
