import { getAdminRole } from '@/lib/admin';

// Records one staff/admin action for the admin-only Staff Activity page.
// Takes the already-created admin (service-role) client and the actor
// user object from requireStaffOrAdmin()/requireAdmin(). Never throws —
// a logging failure should never block the action that already
// succeeded, same reasoning as the notification inserts elsewhere.
export async function logActivity(admin, actor, { action, targetType, targetId, detail }) {
  try {
    await admin.from('staff_activity_log').insert({
      actor_email: actor.email,
      actor_role: getAdminRole(actor.email),
      action,
      target_type: targetType,
      target_id: targetId,
      detail: detail || null,
    });
  } catch (err) {
    console.error('Activity log insert failed:', err.message);
  }
}
