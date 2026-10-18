'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, getStaffEmailList } from '@/lib/admin';
import { logActivity } from '@/lib/activityLog';

function getDeliveryEnvEmails() {
  return (process.env.DELIVERY_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Permanently deletes a STAFF login or a DELIVERY (rider) login.
// Full admins only. Customers and admins can never be deleted here.
//   formData: userId (Supabase auth user id), kind ('staff' | 'delivery')
export async function deleteAccount(formData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return { error: 'Only a full admin can delete accounts.' };
    }

    const userId = String(formData.get('userId') || '').trim();
    const kind = String(formData.get('kind') || '').trim();

    if (!userId) return { error: 'Missing account.' };
    if (kind !== 'staff' && kind !== 'delivery') return { error: 'Unknown account type.' };
    if (userId === user.id) return { error: "You can't delete your own account." };

    const admin = createAdminClient();
    const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
    const target = data?.user;
    if (lookupError || !target) return { error: 'Account not found.' };

    const email = (target.email || '').toLowerCase();
    if (isAdminEmail(email)) return { error: 'Admin accounts cannot be deleted here.' };

    const deliveryEnv = getDeliveryEnvEmails();
    const isDelivery = target.app_metadata?.role === 'delivery' || deliveryEnv.includes(email);
    const isStaff = getStaffEmailList().includes(email);

    if (kind === 'delivery' && !isDelivery) return { error: 'That is not a delivery account.' };
    if (kind === 'staff' && !isStaff) return { error: 'That is not a staff account.' };

    // Don't strand orders mid-delivery.
    if (kind === 'delivery') {
      const { count } = await admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('delivery_user_id', userId)
        .in('order_status', ['to_ship', 'to_receive']);
      if (count > 0) {
        return {
          error: `This rider still has ${count} active order${count === 1 ? '' : 's'}. Reassign or complete ${count === 1 ? 'it' : 'them'} first.`,
        };
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) return { error: deleteError.message };

    // Normally removed automatically (ON DELETE CASCADE); belt and braces.
    await admin.from('delivery_profiles').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    await logActivity({
      actorEmail: user.email,
      actorRole: 'admin',
      action: 'account.delete',
      targetType: 'user',
      targetId: userId,
      details: `Deleted ${kind} account ${email}`,
    });

    revalidatePath('/admin/staff');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/packing');

    const listedIn =
      kind === 'staff' ? 'STAFF_EMAILS' : deliveryEnv.includes(email) ? 'DELIVERY_EMAILS' : null;

    return {
      ok: true,
      note: listedIn
        ? `${email} was deleted, but its address is still in ${listedIn}. Remove it from that environment variable (Vercel → Settings → Environment Variables) and redeploy, otherwise they get access again if they sign up with that email.`
        : null,
    };
  } catch (err) {
    return { error: err?.message || 'Could not delete the account.' };
  }
}
