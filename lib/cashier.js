import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAdminRole } from '@/lib/admin';
import { getStaffIdentityName } from '@/lib/staffIdentity';

// The one staff member the admin has assigned as cashier, or null.
// Never throws: before the cashier migration has been run (no
// is_cashier column) this simply reports "no cashier" instead of
// breaking every admin page.
export const getCashierProfile = cache(async () => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('staff_profiles')
      .select('id, name')
      .eq('is_cashier', true)
      .eq('approved', true)
      .maybeSingle();
    if (error) {
      console.error('getCashierProfile error:', error.message);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('getCashierProfile error:', err.message);
    return null;
  }
});

// Who is using the dashboard right now, and what are they allowed to
// do? isCashier is true only for a STAFF login whose verified
// (signed-cookie) identity is the assigned cashier. Cached per request.
export const getAccessContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? getAdminRole(user.email) : null;

  if (!role) return { user: null, role: null, isAdmin: false, isCashier: false, staffName: null };
  if (role === 'admin') return { user, role, isAdmin: true, isCashier: false, staffName: null };

  const staffName = await getStaffIdentityName();
  const cashier = staffName ? await getCashierProfile() : null;
  const isCashier = !!(
    cashier &&
    staffName &&
    cashier.name.trim().toLowerCase() === staffName.trim().toLowerCase()
  );
  return { user, role, isAdmin: false, isCashier, staffName };
});

// Cashier screens are payments-only: any other dashboard page sends the
// cashier back to their own.
export async function redirectIfCashier() {
  const ctx = await getAccessContext();
  if (ctx.isCashier) redirect('/admin/cashier');
}
