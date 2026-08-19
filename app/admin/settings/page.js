import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';
import SiteSettingsForm from '@/components/admin/SiteSettingsForm';
import { updateSiteSettings } from '@/app/admin/actions';

export const metadata = { title: 'Site Settings — Stitchhouse Admin' };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect('/admin/orders');

  const settings = await getSiteSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Site Settings</h1>
      <SiteSettingsForm settings={settings} action={updateSiteSettings} />
    </div>
  );
}
