import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin } from '@/lib/admin';

// Called right after a successful login/signup when no explicit `next`
// was requested. lib/admin.js reads plain (non-NEXT_PUBLIC_) env vars,
// so the admin/staff check has to happen server-side — the login page
// itself is a client component and can't see ADMIN_EMAILS/STAFF_EMAILS.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const target = user && canAccessAdmin(user.email) ? '/admin' : '/';
  return NextResponse.json({ target });
}
