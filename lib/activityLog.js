import { createAdminClient } from '@/lib/supabase/server';
import { getStaffIdentityName } from '@/lib/staffIdentity';

// Records one entry in the admin activity log — used so a full admin
// can monitor what staff accounts have been doing (see /admin/staff).
// Automatically attaches the individual staff member's name (from the
// name+PIN identity gate — see StaffIdentifyGate/staffIdentity.js) if
// one is set for the current session, so shared staff logins still
// show who specifically did what. Full admins never set this cookie
// (they skip the gate), so actorName is simply null for them.
// Never throws: logging is a nice-to-have audit trail, not something
// that should ever block the actual order/inquiry action that already
// happened.
export async function logActivity({ actorEmail, actorRole, action, targetType, targetId, details }) {
  try {
    const admin = createAdminClient();
    const actorName = actorRole === 'staff' ? await getStaffIdentityName() : null;
    await admin.from('admin_activity_log').insert({
      actor_email: actorEmail,
      actor_name: actorName,
      actor_role: actorRole,
      action,
      target_type: targetType || null,
      target_id: targetId != null ? String(targetId) : null,
      details: details || null,
    });
  } catch (err) {
    console.error('Activity log insert failed:', err.message);
  }
}
