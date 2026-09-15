import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessAdmin } from '@/lib/admin';
import { hashPin, setStaffIdentityCookie, clearStaffIdentityCookie } from '@/lib/staffIdentity';

// Identifies the individual person currently using a (possibly
// shared) staff login. First time a name is used, it self-registers
// with whatever PIN was given. After that, the same name must be
// paired with the same PIN — so one person can't casually show up in
// the activity log under a coworker's name.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessAdmin(user.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { name, pin } = await request.json();
  const trimmedName = name?.toString().trim();
  const trimmedPin = pin?.toString().trim();

  if (!trimmedName || trimmedName.length < 2) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  }
  if (!trimmedPin || !/^\d{4,6}$/.test(trimmedPin)) {
    return NextResponse.json({ error: 'PIN must be 4-6 digits.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const pinHash = hashPin(trimmedPin);

  const { data: existing } = await admin
    .from('staff_profiles')
    .select('*')
    .ilike('name', trimmedName)
    .maybeSingle();

  if (existing) {
    if (existing.pin_hash !== pinHash) {
      return NextResponse.json({ error: 'Incorrect PIN for that name.' }, { status: 401 });
    }
    await admin
      .from('staff_profiles')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    const { error } = await admin
      .from('staff_profiles')
      .insert({ name: trimmedName, pin_hash: pinHash, last_used_at: new Date().toISOString() });
    if (error) {
      return NextResponse.json({ error: 'Could not save your name — please try again.' }, { status: 500 });
    }
  }

  await setStaffIdentityCookie(trimmedName);
  return NextResponse.json({ ok: true, name: trimmedName });
}

// "Not you?" — clears the identity so the next person on this shared
// login has to identify themselves before doing anything.
export async function DELETE() {
  await clearStaffIdentityCookie();
  return NextResponse.json({ ok: true });
}
