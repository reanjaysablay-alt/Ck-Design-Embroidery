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

const DESIGN_BUCKET = 'design-uploads';
const MAX_DESIGN_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_DESIGN_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'ai', 'eps', 'svg', 'psd'];

// Uploads a customer's design/artwork file (from the product page's
// "Custom" flow) to the private design-uploads bucket. Private — unlike
// product-images — because these are customer files, not public product
// photos. Only admins can read them back, via signed URLs or the
// service role key (see getDesignDownloadUrl / getDesignFileBuffer).
export async function uploadDesignFile(file) {
  if (file.size > MAX_DESIGN_SIZE) {
    throw new Error('File is too large — please use a file under 10MB.');
  }

  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_DESIGN_EXTENSIONS.includes(ext)) {
    throw new Error('Unsupported file type. Please upload an image, PDF, SVG, AI, EPS, or PSD file.');
  }

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from(DESIGN_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) throw new Error(`Design upload failed: ${error.message}`);

  return { path, name: file.name || path };
}

// A time-limited link an admin can use to download a customer's design
// file straight from the browser. The bucket is private, so a signed
// URL (rather than a public one) is the only way to hand this out.
export async function getDesignDownloadUrl(path, expiresIn = 60 * 60 * 24 * 7) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DESIGN_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Could not create download link: ${error.message}`);
  return data.signedUrl;
}

// Raw bytes of a design file, used to attach it directly to the new-order
// admin email so the admin has it in their inbox without a click.
export async function getDesignFileBuffer(path) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(DESIGN_BUCKET).download(path);
  if (error) throw new Error(`Could not read design file: ${error.message}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
