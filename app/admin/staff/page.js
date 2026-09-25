import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, getStaffEmailList } from '@/lib/admin';
import { formatDate, formatDateTime } from '@/lib/formatDate';
import { approveStaffProfile, denyStaffProfile } from '@/app/admin/actions';
import StaffApprovalButtons from '@/components/admin/StaffApprovalButtons';
import AutoRefresh from '@/components/admin/AutoRefresh';

export const metadata = { title: 'Staff — Stitchhouse Admin' };

// Always compute fresh from the database — the activity log and
// sign-in times must never show a cached/stale snapshot.
export const dynamic = 'force-dynamic';

const ACTION_LABELS = {
  'order.accept': 'Accepted an order',
  'order.ship': 'Marked an order as shipped',
  'order.complete': 'Marked an order as completed',
  'order.ready_for_pickup': 'Marked an order as ready for pickup',
  'order.picked_up': 'Marked an order as picked up',
  'order.cancel': 'Canceled an order',
  'order.set_fee': 'Set a customization fee',
  'order.set_delivery_fee': 'Set a delivery fee',
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

  // The individual people who've identified themselves on a shared
  // staff login (see StaffIdentifyGate) — separate from the
  // STAFF_EMAILS login roster above, since one login can be used by
  // several different named people. Split into those still waiting
  // on admin approval (can't get into the dashboard yet) and those
  // already approved.
  const { data: staffProfiles } = await admin
    .from('staff_profiles')
    .select('id, name, approved, approved_at, created_at, last_used_at')
    .order('last_used_at', { ascending: false, nullsFirst: false });

  const pendingProfiles = (staffProfiles || []).filter((p) => !p.approved);
  const approvedProfiles = (staffProfiles || []).filter((p) => p.approved);

  return (
    <div>
      <AutoRefresh />
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
                      Joined {s.createdAt ? formatDate(s.createdAt) : '—'}
                    </span>
                    <span>
                      Last sign-in{' '}
                      {s.lastSignInAt
                        ? formatDateTime(s.lastSignInAt)
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

      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Pending Approval</h2>
      <p className="text-slate-500 mb-6">
        Someone has entered this name for the first time on the identify screen. They're stuck
        there until you approve them below.
      </p>
      {pendingProfiles.length === 0 && (
        <p className="text-slate-500 mb-14">No one is waiting on approval.</p>
      )}
      {pendingProfiles.length > 0 && (
        <div className="space-y-3 mb-14">
          {pendingProfiles.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-amber-200 bg-amber-50/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
            >
              <div>
                <div className="text-slate-900 font-medium">{p.name}</div>
                <div className="text-slate-400 text-xs">First seen {formatDate(p.created_at)}</div>
              </div>
              <StaffApprovalButtons
                id={p.id}
                name={p.name}
                approveAction={approveStaffProfile}
                denyAction={denyStaffProfile}
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">Identified Staff Members</h2>
      <p className="text-slate-500 mb-6">
        Approved individual people who've identified themselves by name on a shared staff login
        (see the name + PIN prompt shown after logging in).
      </p>
      {approvedProfiles.length === 0 && (
        <p className="text-slate-500 mb-14">No one has been approved yet.</p>
      )}
      {approvedProfiles.length > 0 && (
        <div className="space-y-3 mb-14">
          {approvedProfiles.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
            >
              <div className="text-slate-900 font-medium">{p.name}</div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-mono text-slate-500">
                <span>First seen {formatDate(p.created_at)}</span>
                <span>
                  Last active {p.last_used_at ? formatDateTime(p.last_used_at) : 'never'}
                </span>
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
                <span className="text-slate-500 text-xs font-mono">
                  {entry.actor_name ? (
                    <>
                      <span className="text-slate-800 font-medium not-italic">{entry.actor_name}</span>{' '}
                      <span className="text-slate-400">({entry.actor_email})</span>
                    </>
                  ) : (
                    entry.actor_email
                  )}
                </span>
                <span className="text-slate-400 text-xs font-mono whitespace-nowrap">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
