import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessAdmin } from '@/lib/admin';

// Staff can triage inquiries too (mark read / delete) — this is
// routine day-to-day work, not a full-admin-only action.
async function requireStaffOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessAdmin(user.email)) {
    throw new Error('Not authorized');
  }
  return user;
}

// Mark an inquiry as read.
export async function PATCH(request) {
  try {
    await requireStaffOrAdmin();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from('contact_inquiries')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Delete an inquiry.
export async function DELETE(request) {
  try {
    await requireStaffOrAdmin();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from('contact_inquiries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
