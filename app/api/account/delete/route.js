import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Lets a signed-in customer permanently delete their own login. Their
// past orders are NOT deleted — see the "on delete set null" migration
// in db/schema.sql — they just become detached from a (now-gone) login,
// since the order already carries its own copy of customer_email and
// shipping_address for business/accounting records.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('Account deletion failed:', error.message);
    return NextResponse.json(
      { error: 'Could not delete your account. Please try again or contact support.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
