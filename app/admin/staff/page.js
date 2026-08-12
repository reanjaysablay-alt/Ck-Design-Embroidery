import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, getStaffEmailList } from '@/lib/admin';

export const metadata = { title: 'Staff — Stitchhouse Admin' };

const ACTION_LABELS = {
  'order.accept': 'Accepted an order',
  'order.ship': 'Marked an order as shipped',
  'order.complete': 'Marked an order as completed',
  'order.cancel': 'Canceled an order',
  'order.set_fee': 'Set a customization fee',
  'inquiry.reply': 'Replied to an inquiry',
  'inquiry.read': 'Marked an inquiry as read',
  'inquiry.delete': 'Deleted an inquiry',
};

export default async function AdminStaffPage() {
  // Full-admin only — staff shouldn't be able to monitor other staff.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const admin = createAdminClient();
  const staffEmails = getStaffEmailList();

  // Cross-reference the STAFF_EMAILS roster with actual Supabase auth
  // accounts, so we can show who's actually signed up vs. who's been
  // granted access but hasn't created a login yet.
  let authUsers = [];
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    authUsers = data?.users || [];
  } catch (err) {
    console.error('Could not list auth users:', err.message);
  }

  const staffAccounts = staffEmails.map((email) => {
    const match = authUsers.find((u) => u.email?.toLowerCase() === email);
    return {
      email,
      signedUp: !!match,
      createdAt: match?.created_at || null,
      lastSignInAt: match?.last_sign_in_at || null,
      nickname: match?.user_metadata?.nickname || null,
    };
  });

  const { data: activity } = await admin
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);

  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-2">Staff</h1>
      <p className="text-thread/50 mb-10">
        Monitor staff accounts and everything they've done in the dashboard.
      </p>

      <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Staff Accounts</h2>
      {staffAccounts.length === 0 && (
        <p className="text-thread/60 mb-14">
          No staff emails configured — add addresses to STAFF_EMAILS in your environment variables.
        </p>
      )}
      {staffAccounts.length > 0 && (
        <div className="space-y-3 mb-14">
          {staffAccounts.map((s) => (
            <div
              key={s.email}
              className="bg-canvas2 border border-white/5 rounded-sm p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <div className="font-display text-thread">
                  {s.nickname || s.email}
                </div>
                {s.nickname && <div className="text-thread/40 text-xs">{s.email}</div>}
              </div>
              <div className="flex items-center gap-6 text-xs font-mono text-thread/50">
                {s.signedUp ? (
                  <>
                    <span>
                      Joined {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                    </span>
                    <span>
                      Last sign-in{' '}
                      {s.lastSignInAt
                        ? new Date(s.lastSignInAt).toLocaleString()
                        : 'never'}
                    </span>
                  </>
                ) : (
                  <span className="text-thread/40 border border-white/15 rounded-sm px-2 py-1 uppercase tracking-widest">
                    Not signed up yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Recent Activity</h2>
      <p className="text-thread/50 mb-6">
        The last {activity?.length || 0} actions taken by staff and admin accounts.
      </p>

      {(!activity || activity.length === 0) && (
        <p className="text-thread/60">No activity recorded yet.</p>
      )}

      {activity && activity.length > 0 && (
        <div className="space-y-2">
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-start justify-between gap-3 bg-canvas2 border border-white/5 rounded-sm px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-thread text-sm">
                  {ACTION_LABELS[entry.action] || entry.action}
                </div>
                {entry.details && (
                  <div className="text-thread/50 text-xs mt-0.5">{entry.details}</div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 ${
                    entry.actor_role === 'admin'
                      ? 'border-gold text-gold'
                      : 'border-white/20 text-thread/50'
                  }`}
                >
                  {entry.actor_role}
                </span>
                <span className="text-thread/60 text-xs font-mono">{entry.actor_email}</span>
                <span className="text-thread/30 text-xs font-mono whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
