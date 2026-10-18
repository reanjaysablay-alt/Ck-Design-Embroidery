import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { uploadProductImage } from '@/lib/upload';

// Admin-only. The product form uploads each extra view (side, back,
// detail...) here ONE AT A TIME as soon as it is picked. Sending them all
// inside the form submit would blow past Vercel's ~4.5MB request limit.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string' || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!file.type?.startsWith('image/')) {
    return NextResponse.json({ error: 'Please choose an image file.' }, { status: 400 });
  }

  try {
    const url = await uploadProductImage(file);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 400 });
  }
}
