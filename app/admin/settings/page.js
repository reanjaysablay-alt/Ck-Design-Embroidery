import { getSiteSettings } from '@/lib/settings';
import SiteSettingsForm from '@/components/admin/SiteSettingsForm';
import { updateSiteSettings } from '@/app/admin/actions';

export const metadata = { title: 'Site Settings — Stitchhouse Admin' };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <h1 className="font-display text-3xl text-thread mb-8">Site Settings</h1>
      <SiteSettingsForm settings={settings} action={updateSiteSettings} />
    </div>
  );
}

