import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin, getAdminRole } from '@/lib/admin';
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
  // storefront nav, no cart, no customer account links, just the site
  // title/logo. They live in the admin dashboard, not the customer-
  // facing site; signing out happens from the sidebar there. The
  // "Admin"/"Staff" badge reflects which one they actually are —
  // staff never see the word "Admin" anywhere at the top.
  if (user && canAccessAdmin(user?.email)) {
    return <AdminHeader role={getAdminRole(user.email)} siteTitle={settings.site_title} />;
  }

  return <HeaderClient user={user} siteTitle={settings.site_title} />;
}
