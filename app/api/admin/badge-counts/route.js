import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAccessAdmin, isAdminEmail } from '@/lib/admin';
import { getAdminBadgeCounts } from '@/lib/adminCounts';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessAdmin(user.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const counts = await getAdminBadgeCounts(isAdminEmail(user.email));
  return NextResponse.json(counts);
}
