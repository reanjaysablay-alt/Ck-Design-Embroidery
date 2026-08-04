import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';
import HeaderClient from './HeaderClient';
import AdminHeader from './AdminHeader';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getSiteSettings();

  // Admin accounts get the admin-only header — no storefront nav, no
  // cart, no customer account links. They live in the admin dashboard.
  if (user && isAdminEmail(user?.email)) {
    return <AdminHeader user={user} siteTitle={settings.site_title} />;
  }

  return <HeaderClient user={user} siteTitle={settings.site_title} />;
}
