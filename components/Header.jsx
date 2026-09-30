import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin AND staff accounts get no storefront header at all — the
  // admin dashboard (app/admin/layout.js) already has its own sidebar
  // with its own "CK / Admin" or "CK / Staff" brand at the top, so a
  // second header bar above it was just a duplicate black strip.
  if (user && canAccessAdmin(user?.email)) {
    return null;
  }

  const settings = await getSiteSettings();
  return <HeaderClient user={user} siteTitle={settings.site_title} />;
}
