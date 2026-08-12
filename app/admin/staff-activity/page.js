import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export const metadata = { title: 'Staff Activity — Stitchhouse Admin' };

export const dynamic = 'force-dynamic';

const ACTION_LABELS = {
  accepted_order: 'Accepted order',
  marked_shipped: 'Marked shipped',
  marked_completed: 'Marked completed',
  canceled_order: 'Canceled order',
  set_customization_fee: 'Updated customization fee',
  replied_to_inquiry: 'Replied to inquiry',
};

// Admin-only — this page exists specifically to let a full admin
// monitor staff, so staff themselves shouldn't have access to it.
export default async function StaffActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const admin = createAdminClient();
  const { data: entries } = await admin
    .from('staff_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-2">Staff Activity</h1>
      <p className="text-thread/50 text-sm mb-8">
        Who did what — order and inquiry actions taken by staff and admins. Most recent first.
      </p>

      <div className="space-y-2">
        {entries?.map((entry) => (
          <div
            key={entry.id}
            className="bg-canvas2 border border-white/5 rounded-sm p-4 flex items-start justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-thread font-medium">{entry.actor_email}</span>
                <RoleBadge role={entry.actor_role} />
              </div>
              <div className="text-thread/70 text-sm">
                {ACTION_LABELS[entry.action] || entry.action}
                {' — '}
                <a
                  href={`/admin/${entry.target_type === 'order' ? 'orders' : 'inquiries'}`}
                  className="text-gold hover:underline"
                >
                  {entry.target_type} #{entry.target_id}
                </a>
              </div>
              {entry.detail && (
                <div className="text-thread/40 text-xs mt-1">{entry.detail}</div>
              )}
            </div>
            <div className="font-mono text-xs text-thread/40 flex-shrink-0">
              {new Date(entry.created_at).toLocaleString()}
            </div>
          </div>
        ))}
        {(!entries || entries.length === 0) && (
          <div className="bg-canvas2 border border-white/5 rounded-sm p-10 text-center">
            <p className="text-thread/60">No activity yet.</p>
            <p className="text-thread/40 text-sm mt-2">
              Order and inquiry actions taken by staff and admins will show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = role === 'admin' ? 'border-gold text-gold' : 'border-blue-400 text-blue-400';
  return (
    <span className={`text-[10px] uppercase tracking-widest border rounded-sm px-1.5 py-0.5 ${styles}`}>
      {role}
    </span>
  );
}
