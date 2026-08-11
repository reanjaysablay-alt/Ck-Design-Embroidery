import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';
import HeaderClient from './HeaderClient';
import AdminHeader from './AdminHeader';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getSiteSettings();

  // Admin AND staff accounts get the minimal admin-only header — no
  // storefront nav, no cart, no customer account links, just Sign out.
  // They live in the admin dashboard, not the customer-facing site.
  if (user && canAccessAdmin(user?.email)) {
    return <AdminHeader user={user} siteTitle={settings.site_title} />;
  }

  return <HeaderClient user={user} siteTitle={settings.site_title} />;
}
