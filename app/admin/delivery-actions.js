'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, getStaffEmailList } from '@/lib/admin';

async function requireFullAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: 'Only a full admin can manage delivery riders.' };
  }

  return { ok: true, user };
}

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });

  if (error) throw new Error(error.message);

  return (
    (data?.users || []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    ) || null
  );
}

export async function addDeliveryRider(formData) {
  try {
    const auth = await requireFullAdmin();
    if (!auth.ok) return auth;

    const email = String(formData.get('email') || '').trim().toLowerCase();
    const displayName = String(formData.get('displayName') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const vehicleType = String(formData.get('vehicleType') || '').trim();
    const vehiclePlate = String(formData.get('vehiclePlate') || '').trim();

    if (!email) return { ok: false, error: 'Enter the rider\'s email.' };
    if (!displayName) return { ok: false, error: 'Enter the rider\'s name.' };

    if (isAdminEmail(email) || getStaffEmailList().includes(email)) {
      return {
        ok: false,
        error: 'That email belongs to an admin or staff account. Use a separate rider account.',
      };
    }

    const admin = createAdminClient();
    const rider = await findUserByEmail(admin, email);

    if (!rider) {
      return {
        ok: false,
        error: 'No account found for that email. Ask the rider to sign up first, then add them here.',
      };
    }

    // 1. Role in auth metadata
    const { error: metaError } = await admin.auth.admin.updateUserById(rider.id, {
      app_metadata: { role: 'delivery' },
    });

    if (metaError) return { ok: false, error: metaError.message };

    // 2. Role in profiles
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: rider.id,
        email,
        role: 'delivery',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) return { ok: false, error: profileError.message };

    // 3. Rider details
    const { error: deliveryError } = await admin.from('delivery_profiles').upsert(
      {
        user_id: rider.id,
        display_name: displayName,
        phone: phone || null,
        vehicle_type: vehicleType || null,
        vehicle_plate: vehiclePlate || null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (deliveryError) return { ok: false, error: deliveryError.message };

    revalidatePath('/admin/staff');

    return { ok: true, message: `${displayName} is now a delivery rider.` };
  } catch (err) {
    return { ok: false, error: err?.message || 'Unable to add the rider.' };
  }
}

export async function removeDeliveryRider(formData) {
  try {
    const auth = await requireFullAdmin();
    if (!auth.ok) return auth;

    const userId = String(formData.get('userId') || '').trim();

    if (!userId) return { ok: false, error: 'Missing rider.' };

    const admin = createAdminClient();

    const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: null },
    });

    if (metaError) return { ok: false, error: metaError.message };

    await admin
      .from('profiles')
      .update({ role: 'customer', updated_at: new Date().toISOString() })
      .eq('id', userId);

    // Keep the row (past orders still point at this rider); just deactivate.
    const { error: deliveryError } = await admin
      .from('delivery_profiles')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (deliveryError) return { ok: false, error: deliveryError.message };

    revalidatePath('/admin/staff');

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Unable to remove the rider.' };
  }
}