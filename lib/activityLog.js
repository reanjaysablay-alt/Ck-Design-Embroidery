import { createAdminClient } from '@/lib/supabase/server';

// Records one entry in the admin activity log — used so a full admin
// can monitor what staff accounts have been doing (see /admin/staff).
// Never throws: logging is a nice-to-have audit trail, not something
// that should ever block the actual order/inquiry action that already
// happened.
export async function logActivity({ actorEmail, actorRole, action, targetType, targetId, details }) {
  try {
    const admin = createAdminClient();
    await admin.from('admin_activity_log').insert({
      actor_email: actorEmail,
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
