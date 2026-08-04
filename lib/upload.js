import { createAdminClient } from '@/lib/supabase/server';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Uploads a File (from a server action's FormData) to the public
// product-images bucket and returns its public URL. Uses the service
// role key — regular users have no write access to this bucket.
export async function uploadProductImage(file) {
  if (file.size > MAX_SIZE) {
    throw new Error('Image is too large — please use a file under 5MB.');
  }

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from('product-images')
    .upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = admin.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
