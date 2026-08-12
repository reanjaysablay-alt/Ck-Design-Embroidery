'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, canAccessAdmin } from '@/lib/admin';
import { refundCapture } from '@/lib/paypal';
import { uploadProductImage } from '@/lib/upload';
import { saveSiteSettings } from '@/lib/settings';
import {
  sendMail,
  orderToShipCustomerEmail,
  orderToReceiveCustomerEmail,
  orderCompletedCustomerEmail,
  orderCanceledCustomerEmail,
} from '@/lib/email';

// Every action re-checks admin status server-side against the current
// session — never trust that only admins can reach this file just
// because the UI hides the buttons from everyone else. Product and
// site-settings changes are admin-only (full access required).
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

// Day-to-day order/inquiry actions — allowed for staff as well as full
// admins, since processing orders is routine operational work.
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
    // Checkbox convention: present + "on" when checked, absent when
    // unchecked — so no value at all means the product is in stock.
    in_stock: formData.get('outOfStock') === 'on' ? false : true,
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
  let admin;
  try {
    await requireAdmin();
    admin = createAdminClient();
    const product = parseProductForm(formData);
    product.image = await resolveImage(formData, null);

    const { error } = await admin.from('products').insert(product);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('createProduct error:', err.message);
    const msg = err.message || 'Could not create product';
    redirect(`/admin/products/new?error=${encodeURIComponent(msg)}`);
  }

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

// Shared by every order-status transition below: sends the customer's
// Gmail notification FIRST (so it can never be blocked by anything
// after it), then writes the in-app notification (wrapped in its own
// try/catch so a problem there never blocks the email or the status
// update that already happened).
async function notifyOrderStatus(admin, order, { title, body, emailTemplateFn }) {
  if (order.customer_email) {
    const { subject, html } = emailTemplateFn(order);
    await sendMail({ to: order.customer_email, subject, html });
  }

  try {
    await admin.from('notifications').insert({
      user_id: order.user_id,
      order_id: order.id,
      title,
      body,
    });
  } catch (err) {
    console.error('Notification insert failed for order', order.id, err.message);
  }
}

// pending -> to_ship. Order is confirmed and moves straight into
// production/fulfillment.
export async function acceptOrder(formData) {
  await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'to_ship' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Order accepted 🎉',
    body: `Great news — order #${order.id} ($${total}) has been accepted and is now in production. We'll be in touch with shipping details.`,
    emailTemplateFn: orderToShipCustomerEmail,
  });

  revalidatePath('/admin/orders');
}

// to_ship -> to_receive. Staff marks the order as shipped/out for
// delivery.
export async function markShipped(formData) {
  await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'to_receive' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Order shipped 📦',
    body: `Order #${order.id} ($${total}) is on its way to you.`,
    emailTemplateFn: orderToReceiveCustomerEmail,
  });

  revalidatePath('/admin/orders');
}

// to_receive -> completed. Staff confirms the customer has received
// the order.
export async function markCompleted(formData) {
  await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'completed' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Order completed ✅',
    body: `Order #${order.id} ($${total}) has been marked as received. Thanks for your order!`,
    emailTemplateFn: orderCompletedCustomerEmail,
  });

  revalidatePath('/admin/orders');
}

// pending / to_ship / to_receive -> canceled. Refunds automatically if
// it was a paid PayPal order.
export async function cancelOrder(formData) {
  await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'canceled' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  // Refund automatically if it was a paid PayPal order.
  if (order.payment_method === 'paypal' && order.paypal_capture_id) {
    try {
      await refundCapture(order.paypal_capture_id);
      await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', id);
      order.payment_status = 'refunded';
    } catch (err) {
      console.error('Refund failed for order', id, err.message);
      // Order is still marked canceled — refund needs manual follow-up
      // in the PayPal dashboard if this happens.
    }
  }

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Order canceled',
    body: `We're sorry — order #${order.id} ($${total}) couldn't be fulfilled.${
      order.payment_method === 'paypal' ? ' Your PayPal payment has been refunded.' : ''
    }`,
    emailTemplateFn: orderCanceledCustomerEmail,
  });

  revalidatePath('/admin/orders');
}
