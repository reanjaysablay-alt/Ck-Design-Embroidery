'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { refundCapture } from '@/lib/paypal';
import { uploadProductImage } from '@/lib/upload';
import { saveSiteSettings } from '@/lib/settings';
import {
  sendMail,
  orderAcceptedCustomerEmail,
  orderDeclinedCustomerEmail,
} from '@/lib/email';

// Every action re-checks admin status server-side against the current
// session — never trust that only admins can reach this file just
// because the UI hides the buttons from everyone else.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    throw new Error('Not authorized');
  }
  return user;
}

function parseProductForm(formData) {
  const sizesRaw = formData.get('sizes')?.toString().trim();
  const threadsRaw = formData.get('threads')?.toString().trim();

  return {
    slug: formData.get('slug')?.toString().trim(),
    name: formData.get('name')?.toString().trim(),
    price: Number(formData.get('price')),
    category: formData.get('category')?.toString().trim() || null,
    description: formData.get('description')?.toString().trim() || null,
    stitch_count: formData.get('stitchCount')?.toString().trim() || null,
    threads: threadsRaw ? threadsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    sizes: sizesRaw ? sizesRaw.split(',').map((s) => s.trim()).filter(Boolean) : null,
  };
}

// If a new file was chosen, upload it and use that URL. Otherwise fall
// back to whatever image the product already had (for edits), or null
// (for a brand new product with no upload — the shop shows a placeholder).
async function resolveImage(formData, existingImage) {
  const file = formData.get('imageFile');
  if (file && typeof file === 'object' && file.size > 0) {
    return await uploadProductImage(file);
  }
  return existingImage || null;
}

export async function createProduct(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const product = parseProductForm(formData);
  product.image = await resolveImage(formData, null);

  const { error } = await admin.from('products').insert(product);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/');
  redirect('/admin/products');
}

export async function updateProduct(id, formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const product = parseProductForm(formData);
  const existingImage = formData.get('existingImage')?.toString() || null;
  product.image = await resolveImage(formData, existingImage);

  const { error } = await admin.from('products').update(product).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/');
  redirect('/admin/products');
}

export async function deleteProduct(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { error } = await admin.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/');
}

export async function updateSiteSettings(formData) {
  await requireAdmin();

  const settings = {
    site_title: formData.get('site_title')?.toString().trim() || 'CK Design Embroidery',
    site_tagline: formData.get('site_tagline')?.toString().trim() || '',
    hero_heading: formData.get('hero_heading')?.toString().trim() || '',
    hero_subheading: formData.get('hero_subheading')?.toString().trim() || '',
    color_canvas: formData.get('color_canvas')?.toString().trim() || '#000000',
    color_canvas2: formData.get('color_canvas2')?.toString().trim() || '#111111',
    color_thread: formData.get('color_thread')?.toString().trim() || '#F4EFE3',
    color_gold: formData.get('color_gold')?.toString().trim() || '#D4A537',
    color_linen: formData.get('color_linen')?.toString().trim() || '#EFE7D8',
color_linen2: formData.get('color_linen2')?.toString().trim() || '#E4D9C4',
    color_ink: formData.get('color_ink')?.toString().trim() || '#1C1811',
    color_stitchRed: formData.get('color_stitchRed')?.toString().trim() || '#A73B3B',
    title_font: formData.get('title_font')?.toString().trim() || 'fraunces',
    tagline_font: formData.get('tagline_font')?.toString().trim() || 'fraunces',
    heading_font: formData.get('heading_font')?.toString().trim() || 'fraunces',
  };

  await saveSiteSettings(settings);

  // Refresh every page that renders site-wide theme/text.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  revalidatePath('/shop');
  revalidatePath('/');
}

export async function acceptOrder(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'accepted' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  // 1) Realtime Gmail notification — sent FIRST so it can never be
  //    blocked by anything below. Fires the moment the admin clicks
  //    Accept and lands in the customer's Gmail app immediately.
  if (order.customer_email) {
    const { subject, html } = orderAcceptedCustomerEmail(order);
    await sendMail({ to: order.customer_email, subject, html });
  }

  // 2) In-app notification (live on /account via Realtime). Wrapped in
  //    try/catch so a problem here never blocks the order action or
  //    the email above.
  try {
    const total = Number(order.total).toFixed(2);
    await admin.from('notifications').insert({
      user_id: order.user_id,
      order_id: order.id,
      title: 'Order accepted 🎉',
      body: `Great news — order #${order.id} ($${total}) has been accepted and is now in production. We'll be in touch with shipping details.`,
    });
  } catch (err) {
    console.error('Notification insert failed for order', id, err.message);
  }

  revalidatePath('/admin/orders');
}

export async function declineOrder(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'declined' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  // Refund automatically if it was a paid PayPal order.
  if (order.payment_method === 'paypal' && order.paypal_capture_id) {
    try {
      await refundCapture(order.paypal_capture_id);
      await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', id);
    } catch (err) {
      console.error('Refund failed for order', id, err.message);
      // Order is still marked declined — refund needs manual follow-up
      // in the PayPal dashboard if this happens.
    }
  }

  // 1) Realtime Gmail notification — sent FIRST so it can never be
  //    blocked by anything below. Fires the moment the admin clicks
  //    Decline and lands in the customer's Gmail app immediately.
  if (order.customer_email) {
    const { subject, html } = orderDeclinedCustomerEmail(order);
    await sendMail({ to: order.customer_email, subject, html });
  }

  // 2) In-app notification (live on /account via Realtime). Wrapped in
  //    try/catch so a problem here never blocks the order action or
  //    the email above.
  try {
    const total = Number(order.total).toFixed(2);
    await admin.from('notifications').insert({
      user_id: order.user_id,
      order_id: order.id,
      title: 'Order declined',
      body: `We're sorry — order #${order.id} ($${total}) couldn't be fulfilled.${
        order.payment_method === 'paypal' ? ' Your PayPal payment has been refunded.' : ''
      }`,
    });
  } catch (err) {
    console.error('Notification insert failed for order', id, err.message);
  }

  revalidatePath('/admin/orders');
}
