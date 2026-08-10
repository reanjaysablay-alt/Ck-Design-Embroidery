import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadDesignFile } from '@/lib/upload';

// Lets a signed-in customer upload their design/artwork from the
// product page before adding a custom item to their cart. The file is
// uploaded immediately (rather than held in memory) because the cart
// is persisted to localStorage as JSON and can't hold a File object —
// only the returned storage path travels with the cart item.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string' || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    const { path, name } = await uploadDesignFile(file);
    return NextResponse.json({ path, name });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 400 });
  }
}
