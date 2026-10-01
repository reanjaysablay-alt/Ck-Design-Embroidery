'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, canAccessAdmin, getAdminRole } from '@/lib/admin';
import { refundCapture } from '@/lib/paypal';
import { uploadProductImage } from '@/lib/upload';
import { saveSiteSettings } from '@/lib/settings';
import { logActivity } from '@/lib/activityLog';
import { getStaffIdentityName } from '@/lib/staffIdentity';
import { restoreStock, verifyCartItems, deductStock } from '@/lib/cartVerify';
import {
  sendMail,
  orderToShipCustomerEmail,
  orderToReceiveCustomerEmail,
  orderCompletedCustomerEmail,
  orderCanceledCustomerEmail,
  orderTotalUpdatedCustomerEmail,
  orderPreparingCustomerEmail,
  orderReadyForPickupCustomerEmail,
  orderPickedUpCustomerEmail,
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

// Reads and normalizes the product form fields (shared by create + update).
function parseProductForm(formData) {
  const sizesRaw = formData.get('sizes')?.toString().trim();
  const threadsRaw = formData.get('threads')?.toString().trim();
  const sizes = sizesRaw ? sizesRaw.split(',').map((s) => s.trim()).filter(Boolean) : null;

  // Per-size stock quantities, e.g. { S: 10, M: 15, L: 0 } — only
  // tracked when the product actually has sizes. Each field is named
  // stock_<size> in the form (see ProductForm.jsx).
  let stock = null;
  if (sizes?.length) {
    stock = {};
    for (const size of sizes) {
      const raw = formData.get(`stock_${size}`);
      const qty = Number(raw);
      stock[size] = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
    }
  }

  // Manual "Mark as Out of Stock" checkbox always wins (e.g. a
  // discontinued item you don't want orderable even if some stock
  // count is still sitting non-zero). Otherwise, if stock is tracked
  // per-size, in_stock is derived automatically from whether any size
  // still has quantity left.
  const manuallyOutOfStock = formData.get('outOfStock') === 'on';
  const inStock = manuallyOutOfStock
    ? false
    : stock
    ? Object.values(stock).some((qty) => qty > 0)
    : true;

  return {
    slug: formData.get('slug')?.toString().trim(),
    name: formData.get('name')?.toString().trim(),
    price: Number(formData.get('price')),
    category: formData.get('category')?.toString().trim() || null,
    description: formData.get('description')?.toString().trim() || null,
    stitch_count: formData.get('stitchCount')?.toString().trim() || null,
    threads: threadsRaw ? threadsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    sizes,
    stock,
    in_stock: inStock,
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

// Approves a pending staff identity (admin-only) so that name+PIN can
// get past StaffIdentifyGate into the actual dashboard. See the
// `approved` column comment in db/schema.sql.
export async function approveStaffProfile(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { error } = await admin
    .from('staff_profiles')
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/staff');
}

// Denies a pending staff identity (admin-only) by deleting the row —
// the name is free again, so if it's re-entered on the identify
// screen it self-registers from scratch (new PIN, unapproved) exactly
// like a brand-new name.
export async function denyStaffProfile(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { error } = await admin.from('staff_profiles').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/staff');
}

// Clears a staff member's saved name+PIN identity (admin-only). This
// doesn't touch their actual login (STAFF_EMAILS/Supabase account) —
// only the lightweight name+PIN accountability layer from
// StaffIdentifyGate. After this, that name is free again: the next
// time anyone enters it on the identify screen, it self-registers
// fresh with whatever PIN they set, exactly like a brand-new name.
//
// Note: if that person is already identified in an active browser
// session, this doesn't force them out mid-session — their identity
// cookie is still valid until it naturally expires (12 hours) or they
// use "Not you? Switch". The reset takes effect the next time someone
// has to identify themselves with that name.
export async function resetStaffPin(formData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { error } = await admin.from('staff_profiles').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/settings');
  revalidatePath('/admin/staff');
}

// Shared by every order-status transition below: sends the customer's
// Gmail notification FIRST (so it can never be blocked by anything
// after it), then writes the in-app notification (wrapped in its own
// try/catch so a problem there never blocks the email or the status
// update that already happened).
// Notifies a customer that their order's status changed: an in-app
// notification (fast, drives the notification bell — kept synchronous
// so it's there the instant the page refreshes) and an email (slow —
// a real SMTP round trip to Gmail, easily the single biggest reason a
// staff/admin button click used to feel like it hung. Deferred via
// after() so the status change and page refresh happen immediately,
// and the email goes out a moment later in the background instead of
// making the person wait on it).
async function notifyOrderStatus(admin, order, { title, body, emailTemplateFn }) {
  if (order.customer_email && emailTemplateFn) {
    after(async () => {
      try {
        const { subject, html } = emailTemplateFn(order);
        await sendMail({ to: order.customer_email, subject, html });
      } catch (err) {
        console.error('Order status email failed for order', order.id, err.message);
      }
    });
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

// pending -> to_ship (PayPal/COD) or pending -> preparing (Walk-in).
// Order is confirmed and moves straight into production/fulfillment,
// on whichever pipeline matches how the customer chose to pay.
export async function acceptOrder(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('payment_method, production_stage')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const isWalkin = existing.payment_method === 'walkin';
  const nextStatus = isWalkin ? 'preparing' : 'to_ship';

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: nextStatus, production_stage: existing.production_stage || 'order_received' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Order accepted 🎉',
    body: isWalkin
      ? `Great news — order #${order.id} ($${total}) has been accepted and is being prepared. We'll let you know when it's ready for pickup.`
      : `Great news — order #${order.id} ($${total}) has been accepted and is now in production. We'll be in touch with shipping details.`,
    emailTemplateFn: isWalkin ? orderPreparingCustomerEmail : orderToShipCustomerEmail,
  });

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.accept',
    targetType: 'order',
    targetId: order.id,
    details: isWalkin
      ? `Accepted order #${order.id} ($${total}) — moved to Preparing`
      : `Accepted order #${order.id} ($${total}) — moved to To Ship`,
  });

  revalidatePath('/admin/orders');
}

// to_ship -> to_receive. Staff marks the order as shipped/out for
// delivery.
export async function markShipped(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'to_receive', production_stage: 'ready_for_fulfillment' })
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

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.ship',
    targetType: 'order',
    targetId: order.id,
    details: `Marked order #${order.id} as shipped — moved to To Receive`,
  });

  revalidatePath('/admin/orders');
}

// to_receive -> completed. Staff confirms the customer has received
// the order.
export async function markCompleted(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'completed', production_stage: 'completed' })
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

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.complete',
    targetType: 'order',
    targetId: order.id,
    details: `Marked order #${order.id} as completed`,
  });

  revalidatePath('/admin/orders');
}

// preparing -> ready_for_pickup. Walk-in equivalent of markShipped.
export async function markReadyForPickup(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'ready_for_pickup', production_stage: 'ready_for_fulfillment' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Ready for pickup 📍',
    body: `Order #${order.id} ($${total}) is ready for pickup at our shop. Please bring your payment.`,
    emailTemplateFn: orderReadyForPickupCustomerEmail,
  });

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.ready_for_pickup',
    targetType: 'order',
    targetId: order.id,
    details: `Marked order #${order.id} as ready for pickup`,
  });

  revalidatePath('/admin/orders');
}

// ready_for_pickup -> picked_up. Walk-in equivalent of markCompleted.
export async function markPickedUp(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'picked_up', production_stage: 'completed' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const total = Number(order.total).toFixed(2);
  await notifyOrderStatus(admin, order, {
    title: 'Order picked up ✅',
    body: `Order #${order.id} ($${total}) has been marked as picked up. Thanks for your order!`,
    emailTemplateFn: orderPickedUpCustomerEmail,
  });

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.picked_up',
    targetType: 'order',
    targetId: order.id,
    details: `Marked order #${order.id} as picked up`,
  });

  revalidatePath('/admin/orders');
}

// pending / to_ship / to_receive -> canceled. Refunds automatically if
// it was a paid PayPal order.
export async function cancelOrder(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  // Only restore stock if this order wasn't already canceled — guards
  // against a double form-submit crediting stock back twice.
  const { data: existing } = await admin
    .from('orders')
    .select('order_status')
    .eq('id', id)
    .single();
  const alreadyCanceled = existing?.order_status === 'canceled';

  const { data: order, error } = await admin
    .from('orders')
    .update({ order_status: 'canceled' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  if (!alreadyCanceled && order.stock_deductions?.length) {
    await restoreStock(order.stock_deductions);
  }

  // Refund automatically if it was a paid PayPal order.
  let refunded = false;
  if (order.payment_method === 'paypal' && order.paypal_capture_id) {
    try {
      await refundCapture(order.paypal_capture_id);
      await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', id);
      order.payment_status = 'refunded';
      refunded = true;
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

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.cancel',
    targetType: 'order',
    targetId: order.id,
    details: `Canceled order #${order.id} ($${total})${refunded ? ' — PayPal payment refunded' : ''}${
      !alreadyCanceled && order.stock_deductions?.length ? ' — stock restored' : ''
    }`,
  });

  revalidatePath('/admin/orders');
}

// Recomputes an order's total from its items (base price × qty for
// every item, plus each custom item's own customizationFee if set)
// plus the order-level delivery fee, if any.
function computeOrderTotalWithFees(items, deliveryFee = 0) {
  const itemsTotal = items.reduce((sum, item) => {
    const base = Number(item.price) * Number(item.qty);
    const fee = item.type === 'custom' ? Number(item.customizationFee || 0) : 0;
    return sum + base + fee;
  }, 0);
  return (itemsTotal + Number(deliveryFee || 0)).toFixed(2);
}

// Adds, changes, or clears the customization charge on a single custom
// item within an order, recalculates the order total, and notifies the
// customer of the new total. Staff/admin, same as the other order
// actions — this is routine operational work, not a catalog/settings
// change.
export async function setCustomizationFee(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');
  const itemIndex = Number(formData.get('itemIndex'));
  const feeRaw = formData.get('fee')?.toString().trim();
  const fee = feeRaw ? Number(feeRaw) : 0;

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Once an order has shipped/is ready for pickup (or moved beyond
  // that), the charge is locked — never trust that the UI hides the
  // field, re-check here.
  if (!['pending', 'to_ship', 'preparing'].includes(existing.order_status)) {
    throw new Error('Customization fee can no longer be changed — this order is already being fulfilled.');
  }

  const items = (existing.items || []).map((item, i) => {
    if (i !== itemIndex) return item;
    const updated = { ...item };
    if (fee > 0) {
      updated.customizationFee = fee;
    } else {
      delete updated.customizationFee;
    }
    return updated;
  });

  const total = computeOrderTotalWithFees(items, existing.delivery_fee);

  const { data: order, error } = await admin
    .from('orders')
    .update({ items, total })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await notifyOrderStatus(admin, order, {
    title: 'Order total updated 💲',
    body: `A customization charge was added to order #${order.id}. New total: $${Number(order.total).toFixed(2)}.`,
    emailTemplateFn: (o) => orderTotalUpdatedCustomerEmail(o, 'customization charge'),
  });

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.set_fee',
    targetType: 'order',
    targetId: order.id,
    details: `Set customization fee on order #${order.id}, item ${itemIndex + 1} — new total $${Number(order.total).toFixed(2)}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/history');
}

// Sets (or clears) the delivery fee on a Cash on Delivery order — the
// only payment method this applies to, since PayPal is prepaid at
// checkout and Walk-in orders are never delivered. Recalculates the
// order total and notifies the customer, same pattern as
// setCustomizationFee above but at the order level, not per-item.
export async function setDeliveryFee(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');
  const feeRaw = formData.get('fee')?.toString().trim();
  const fee = feeRaw ? Number(feeRaw) : 0;

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (existing.payment_method !== 'cod') {
    throw new Error('Delivery fee only applies to Cash on Delivery orders.');
  }

  // Once an order has shipped (or moved beyond that), the fee is
  // locked — never trust that the UI hides the field, re-check here.
  if (!['pending', 'to_ship'].includes(existing.order_status)) {
    throw new Error('Delivery fee can no longer be changed — this order has already shipped.');
  }

  const total = computeOrderTotalWithFees(existing.items || [], fee);

  const { data: order, error } = await admin
    .from('orders')
    .update({ delivery_fee: fee, total })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await notifyOrderStatus(admin, order, {
    title: 'Order total updated 💲',
    body: `A delivery fee was added to order #${order.id}. New total: $${Number(order.total).toFixed(2)}.`,
    emailTemplateFn: (o) => orderTotalUpdatedCustomerEmail(o, 'delivery fee'),
  });

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.set_delivery_fee',
    targetType: 'order',
    targetId: order.id,
    details: `Set delivery fee on order #${order.id} to $${fee.toFixed(2)} — new total $${Number(order.total).toFixed(2)}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/history');
}

// Cash on Delivery: the customer pays the courier AFTER delivery, so
// staff records the payment once the cash is collected. Only valid for
// COD orders that have shipped or been delivered.
export async function markCodPaid(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (existing.payment_method !== 'cod') {
    throw new Error('Only Cash on Delivery orders are paid after delivery.');
  }
  if (!['to_receive', 'completed'].includes(existing.order_status)) {
    throw new Error('This order has not been shipped yet.');
  }

  const { data: order, error } = await admin
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await notifyOrderStatus(admin, order, {
    title: 'Payment received 💵',
    body: `We received your cash payment of $${Number(order.total).toFixed(2)} for order #${order.id}. Thank you!`,
  });

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.cod_paid',
    targetType: 'order',
    targetId: order.id,
    details: `Recorded cash payment on delivery for order #${order.id} ($${Number(order.total).toFixed(2)})`,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/history');
}

const PRODUCTION_STAGES = [
  'order_received',
  'proofing_pending',
  'design_approved',
  'in_tailoring',
  'in_embroidery',
  'quality_check',
  'ready_for_fulfillment',
  'completed',
];

const PRODUCTION_STAGE_LABELS = {
  order_received: 'Order Received',
  proofing_pending: 'Proofing Pending',
  design_approved: 'Design Approved',
  in_tailoring: 'In Tailoring',
  in_embroidery: 'In Embroidery',
  quality_check: 'Quality Check',
  ready_for_fulfillment: 'Ready for Fulfillment',
  completed: 'Completed',
};

// What the customer is told when staff moves their order to a stage.
const PRODUCTION_STAGE_MESSAGES = {
  order_received: 'Your order details & measurements are being verified.',
  proofing_pending: 'Your digitized embroidery design is ready — please review and approve it.',
  design_approved: 'Your design is approved and queued for production.',
  in_tailoring: 'Fabric cutting and garment tailoring is in progress.',
  in_embroidery: 'Machine hooping and thread stitching is in progress.',
  quality_check: 'Thread trimming, ironing, and quality inspection are underway.',
  ready_for_fulfillment: 'Your order is packed and ready.',
  completed: 'Your order is complete. Thank you!',
};

// Moves an order through the customer-facing production tracker shown
// on My Purchases (ProductionStageTracker), and keeps it CONNECTED to
// the order status: reaching "Ready for Fulfillment" ships the order
// (or marks it ready for pickup), and "Completed" marks it
// delivered/picked up — reusing the same actions as the Ship / Ready /
// Completed buttons so the customer gets the same notification + email
// either way. Every other stage sends the customer an in-app
// notification, so the tracker never changes silently.
export async function setProductionStage(formData) {
  const actor = await requireStaffOrAdmin();
  const id = formData.get('id');
  const stage = formData.get('stage')?.toString();

  if (!PRODUCTION_STAGES.includes(stage)) {
    throw new Error('Invalid production stage.');
  }

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (['canceled', 'completed', 'picked_up'].includes(existing.order_status)) {
    throw new Error('This order is already closed.');
  }
  if (existing.order_status === 'pending' && stage !== 'order_received') {
    throw new Error('Accept the order first before moving it through production.');
  }

  const makeForm = () => {
    const f = new FormData();
    f.set('id', String(id));
    return f;
  };

  let status = existing.order_status;
  let handled = false;

  if (stage === 'ready_for_fulfillment' || stage === 'completed') {
    if (status === 'to_ship') {
      await markShipped(makeForm());
      status = 'to_receive';
      handled = true;
    } else if (status === 'preparing') {
      await markReadyForPickup(makeForm());
      status = 'ready_for_pickup';
      handled = true;
    }
    if (stage === 'completed') {
      if (status === 'to_receive') {
        await markCompleted(makeForm());
        handled = true;
      } else if (status === 'ready_for_pickup') {
        await markPickedUp(makeForm());
        handled = true;
      }
    }
  }

  if (!handled) {
    const { data: order, error } = await admin
      .from('orders')
      .update({ production_stage: stage })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await notifyOrderStatus(admin, order, {
      title: `Order #${order.id}: ${PRODUCTION_STAGE_LABELS[stage]}`,
      body: PRODUCTION_STAGE_MESSAGES[stage],
    });

    await logActivity({
      actorEmail: actor.email,
      actorRole: getAdminRole(actor.email),
      action: 'order.set_production_stage',
      targetType: 'order',
      targetId: order.id,
      details: `Moved order #${order.id} to production stage "${PRODUCTION_STAGE_LABELS[stage]}"`,
    });
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/history');
  revalidatePath('/account');
}

// Courier name + tracking code (and optional tracking link) for orders
// that ship — shown to the customer in the tracker once the order is
// Ready for Fulfillment. Walk-in orders are picked up in store, so
// they never have tracking.
export async function setTrackingInfo(formData) {
  const actor = await requireStaffOrAdmin();
  const admin = createAdminClient();
  const id = formData.get('id');
  const courier = formData.get('courier')?.toString().trim() || null;
  const number = formData.get('trackingNumber')?.toString().trim() || null;
  const url = formData.get('trackingUrl')?.toString().trim() || null;

  // The link is shown to customers as a clickable href — only ever
  // allow real web links, never javascript:/data: URLs.
  if (url && !/^https?:\/\//i.test(url)) {
    throw new Error('Tracking link must start with http:// or https://');
  }

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('payment_method, order_status')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (existing.payment_method === 'walkin') {
    throw new Error('Walk-in orders are picked up in store — no tracking.');
  }
  if (['canceled', 'completed', 'picked_up'].includes(existing.order_status)) {
    throw new Error('This order is already closed.');
  }

  const { data: order, error } = await admin
    .from('orders')
    .update({ courier_name: courier, tracking_number: number, tracking_url: url })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  if (number) {
    await notifyOrderStatus(admin, order, {
      title: 'Tracking details added 🚚',
      body: `Order #${order.id}: ${courier || 'Courier'} — tracking #${number}.`,
    });
  }

  await logActivity({
    actorEmail: actor.email,
    actorRole: getAdminRole(actor.email),
    action: 'order.set_tracking',
    targetType: 'order',
    targetId: order.id,
    details: `Set tracking on order #${order.id}: ${courier || 'courier'} ${number || '(cleared)'}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath('/account');
}

// ---------------------------------------------------------------------------
// Customer messages — /admin/messages. Day-to-day support work, open to
// staff as well as full admins, same reasoning as orders/inquiries.
// ---------------------------------------------------------------------------

// Sends a staff/admin reply into a customer's message thread. Uses the
// admin client because the row's user_id is the *customer's* id, not
// the replying staff member's — it could never satisfy a
// customer-owns-this-row RLS policy no matter who's signed in.
// Deliberately does NOT also drop a row into `notifications` — a new
// message already has its own dedicated bell (MessagesBell) and its
// own unread count, so mirroring it into the general notifications
// feed would just show the same thing twice in two different places.
export async function sendStaffMessage(formData) {
  const actor = await requireStaffOrAdmin();
  const role = getAdminRole(actor.email);
  const userId = formData.get('userId')?.toString();
  const body = formData.get('body')?.toString().trim();
  if (!userId) throw new Error('Missing conversation');
  if (!body) throw new Error('Message cannot be empty');

  const admin = createAdminClient();
  const senderName = role === 'staff' ? (await getStaffIdentityName()) || 'Staff' : 'Admin';

  const { data: message, error } = await admin
    .from('messages')
    .insert({ user_id: userId, sender_role: 'staff', sender_name: senderName, body })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await logActivity({
    actorEmail: actor.email,
    actorRole: role,
    action: 'message.reply',
    targetType: 'message_thread',
    targetId: userId,
    details: `Replied in message thread for ${message.customer_email || userId}`,
  });

  revalidatePath('/admin/messages');
  return message;
}

// Permanently deletes an entire conversation (every message in one
// customer's thread). Open to staff as well as admins, and recorded in
// the activity log so it's attributable.
export async function deleteConversation(userId) {
  const actor = await requireStaffOrAdmin();
  const role = getAdminRole(actor.email);
  if (!userId) throw new Error('Missing conversation');

  const admin = createAdminClient();
  const { data: sample } = await admin
    .from('messages')
    .select('customer_email')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from('messages').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);

  await logActivity({
    actorEmail: actor.email,
    actorRole: role,
    action: 'message.delete_thread',
    targetType: 'message_thread',
    targetId: userId,
    details: `Deleted the conversation with ${sample?.customer_email || userId}`,
  });

  revalidatePath('/admin/messages');
}

// Marks every unread customer message in a thread as read by staff —
// called from the thread view when a staff/admin opens a conversation.
export async function markMessagesReadByStaff(userId) {
  await requireStaffOrAdmin();
  if (!userId) return;
  const admin = createAdminClient();
  await admin
    .from('messages')
    .update({ read_by_staff: true })
    .eq('user_id', userId)
    .eq('sender_role', 'customer')
    .eq('read_by_staff', false);

  revalidatePath('/admin/messages');
}
