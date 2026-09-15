import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';
import { formatDate, formatDateTime } from '@/lib/formatDate';
import SiteSettingsForm from '@/components/admin/SiteSettingsForm';
import ResetStaffPinButton from '@/components/admin/ResetStaffPinButton';
import { updateSiteSettings, resetStaffPin } from '@/app/admin/actions';

export const metadata = { title: 'Site Settings — Stitchhouse Admin' };

// Always compute fresh from the database.
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const settings = await getSiteSettings();

  const admin = createAdminClient();
  const { data: staffProfiles } = await admin
    .from('staff_profiles')
    .select('id, name, created_at, last_used_at')
    .order('name', { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Site Settings</h1>
      <SiteSettingsForm settings={settings} action={updateSiteSettings} />

      <div className="mt-14 pt-10 border-t border-slate-200 max-w-2xl">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">Staff PINs</h2>
        <p className="text-slate-500 text-sm mb-6">
          Each name shown here has set its own PIN after logging into a staff account (see the
          "Who's on shift?" prompt). If someone forgets their PIN, reset it here — they'll be
          asked to set a brand new one the next time they identify themselves. This doesn't
          affect their actual login, only this name + PIN accountability layer.
        </p>

        {(!staffProfiles || staffProfiles.length === 0) && (
          <p className="text-slate-400 text-sm">No one has set up a PIN yet.</p>
        )}

        {staffProfiles && staffProfiles.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 px-5">
            {staffProfiles.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="text-slate-900 font-medium">{p.name}</div>
                  <div className="text-slate-400 text-xs font-mono">
                    First seen {formatDate(p.created_at)} · Last active{' '}
                    {p.last_used_at ? formatDateTime(p.last_used_at) : 'never'}
                  </div>
                </div>
                <ResetStaffPinButton id={p.id} name={p.name} action={resetStaffPin} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
