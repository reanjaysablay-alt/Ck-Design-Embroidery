import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, getStaffEmailList } from '@/lib/admin';

export const metadata = { title: 'Staff — Stitchhouse Admin' };

const ACTION_LABELS = {
  'order.accept': 'Accepted an order',
  'order.ship': 'Marked an order as shipped',
  'order.complete': 'Marked an order as completed',
  'order.ready_for_pickup': 'Marked an order as ready for pickup',
  'order.picked_up': 'Marked an order as picked up',
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
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Staff</h1>
      <p className="text-slate-500 mb-10">
        Monitor staff accounts and everything they've done in the dashboard.
      </p>

      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Staff Accounts</h2>
      {staffAccounts.length === 0 && (
        <p className="text-slate-500 mb-14">
          No staff emails configured — add addresses to STAFF_EMAILS in your environment variables.
        </p>
      )}
      {staffAccounts.length > 0 && (
        <div className="space-y-3 mb-14">
          {staffAccounts.map((s) => (
            <div
              key={s.email}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
            >
              <div>
                <div className="text-slate-900 font-medium">
                  {s.nickname || s.email}
                </div>
                {s.nickname && <div className="text-slate-400 text-xs">{s.email}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-mono text-slate-500">
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
                  <span className="text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 uppercase tracking-widest">
                    Not signed up yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Recent Activity</h2>
      <p className="text-slate-500 mb-6">
        The last {activity?.length || 0} actions taken by staff and admin accounts.
      </p>

      {(!activity || activity.length === 0) && (
        <p className="text-slate-500">No activity recorded yet.</p>
      )}

      {activity && activity.length > 0 && (
        <div className="space-y-2">
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-start justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <div className="text-slate-800 text-sm">
                  {ACTION_LABELS[entry.action] || entry.action}
                </div>
                {entry.details && (
                  <div className="text-slate-500 text-xs mt-0.5">{entry.details}</div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest border rounded-full px-1.5 py-0.5 ${
                    entry.actor_role === 'admin'
                      ? 'border-indigo-200 text-indigo-600 bg-indigo-50'
                      : 'border-slate-200 text-slate-500 bg-slate-50'
                  }`}
                >
                  {entry.actor_role}
                </span>
                <span className="text-slate-500 text-xs font-mono">{entry.actor_email}</span>
                <span className="text-slate-400 text-xs font-mono whitespace-nowrap">
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
