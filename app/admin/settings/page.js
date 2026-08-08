import { getSiteSettings } from '@/lib/settings';
import SiteSettingsForm from '@/components/admin/SiteSettingsForm';
import { updateSiteSettings } from '@/app/admin/actions';

export const metadata = { title: 'Site Settings — Admin' };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">Site Settings</h1>
      <SiteSettingsForm settings={settings} action={updateSiteSettings} />
    </div>
  );
}
