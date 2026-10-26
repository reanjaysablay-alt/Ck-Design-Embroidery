'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessAdmin } from '@/lib/admin';

function isDelivered(order) {
  const deliveryStage = String(order?.delivery_stage || '').toLowerCase();
  const orderStatus = String(order?.order_status || '').toLowerCase();

  return (
    deliveryStage === 'delivered' ||
    Boolean(order?.delivered_at) ||
    orderStatus === 'completed' ||
    orderStatus === 'delivered'
  );
}

function getCodAmount(order) {
  if (
    order?.cod_amount !== null &&
    order?.cod_amount !== undefined &&
    order?.cod_amount !== ''
  ) {
    const amount = Number(order.cod_amount);

    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  const total = Number(order?.total || 0);

  return Number.isFinite(total) ? total : 0;
}

function buildRemittances(orders, names = {}) {
  const riderMap = new Map();

  for (const order of orders || []) {
    if (!isDelivered(order)) continue;
    if (!order.delivery_user_id) continue;
    if (order.cod_remitted_at) continue;

    const riderId = String(order.delivery_user_id);
    const amount = getCodAmount(order);

    if (!riderMap.has(riderId)) {
      riderMap.set(riderId, {
        riderId,
        riderName: names[riderId] || `Rider ${riderId.slice(0, 8)}`,
        amount: 0,
        orderCount: 0,
        orders: [],
      });
    }

    const rider = riderMap.get(riderId);

    rider.amount += amount;
    rider.orderCount += 1;

    rider.orders.push({
      id: order.id,
      amount,
      customerEmail: order.customer_email || '',
      deliveredAt: order.delivered_at || null,
    });
  }

  return Array.from(riderMap.values())
    .map((rider) => ({
      ...rider,
      amount: Number(rider.amount.toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Records one COD payment. Uses the cashier_remit_cod database function when
// it is installed (atomic). If that function is missing from the database,
// falls back to writing the same rows directly so confirming still works.
async function recordCodPayment(db, order, amount, note, user) {
  const { error } = await db.rpc('cashier_remit_cod', {
    p_order_id: Number(order.id),
    p_amount_received: amount,
    p_note: note,
    p_recorded_by: 'Admin',
    p_recorded_by_email: user.email,
    p_remitted_by: user.id,
  });

  if (!error) return { ok: true };

  const message = String(error.message || '');
  const functionMissing =
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /could not find the function|function .* does not exist/i.test(message);

  if (!functionMissing) return { ok: false, error: message };

  if (String(order.order_status || '').toLowerCase() === 'canceled') {
    return { ok: false, error: 'This order was canceled.' };
  }

  const { data: existing, error: lookupError } = await db
    .from('payment_records')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };

  if (!existing) {
    const { error: insertError } = await db.from('payment_records').insert({
      order_id: order.id,
      method: 'cod',
      payment_mode: 'cash',
      amount_expected: Number(order.total || 0),
      amount_received: amount,
      collected_by: order.cod_collected_by || null,
      recorded_by: 'Admin',
      recorded_by_email: user.email,
      note,
    });

    if (insertError) return { ok: false, error: insertError.message };
  }

  const nowIso = new Date().toISOString();

  const { error: updateError } = await db
    .from('orders')
    .update({
      payment_status: 'paid',
      cod_collected_at: order.cod_collected_at || nowIso,
      cod_remitted_at: nowIso,
      cod_remitted_by: user.id,
    })
    .eq('id', order.id)
    .is('cod_remitted_at', null);

  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  if (!canAccessAdmin(user.email)) {
    return {
      ok: false,
      error: 'You are not authorized to manage COD remittances.',
    };
  }

  return { ok: true, user };
}

export async function loadCodRemittances() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) return auth;

    const db = await createAdminClient();

    const { data: orders, error } = await db
      .from('orders')
      .select(
        'id, total, cod_amount, payment_method, delivery_user_id, delivery_stage, delivered_at, order_status, cod_remitted_at, customer_email, created_at'
      )
      .eq('payment_method', 'cod')
      .not('delivery_user_id', 'is', null)
      .is('cod_remitted_at', null)
      .order('delivered_at', { ascending: false, nullsFirst: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    const riderIds = [
      ...new Set((orders || []).map((o) => o.delivery_user_id).filter(Boolean)),
    ];

    const names = {};

    if (riderIds.length > 0) {
      const { data: profiles } = await db
        .from('delivery_profiles')
        .select('user_id, display_name')
        .in('user_id', riderIds);

      for (const profile of profiles || []) {
        if (profile.display_name) {
          names[String(profile.user_id)] = profile.display_name;
        }
      }
    }

    const riders = buildRemittances(orders, names);

    const amount = riders.reduce((sum, rider) => sum + rider.amount, 0);
    const orderCount = riders.reduce(
      (sum, rider) => sum + rider.orderCount,
      0
    );

    return {
      ok: true,
      riders,
      totals: {
        amount: Number(amount.toFixed(2)),
        orders: orderCount,
        riders: riders.length,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Unable to load COD remittances.',
    };
  }
}

export async function verifyCodRemittance({ riderId, orderIds }) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) return auth;

    const cleanRiderId = String(riderId || '').trim();

    if (!cleanRiderId) {
      return { ok: false, error: 'Missing delivery rider.' };
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return { ok: false, error: 'No COD orders were selected.' };
    }

    const cleanOrderIds = [
      ...new Set(
        orderIds.map((id) => String(id || '').trim()).filter(Boolean)
      ),
    ];

    if (cleanOrderIds.length === 0) {
      return { ok: false, error: 'No COD orders were selected.' };
    }

    const db = await createAdminClient();

    const { data: orders, error: fetchError } = await db
      .from('orders')
      .select(
        'id, total, cod_amount, payment_method, delivery_user_id, delivery_stage, delivered_at, order_status, cod_remitted_at, cod_collected_at, cod_collected_by'
      )
      .in('id', cleanOrderIds)
      .eq('delivery_user_id', cleanRiderId)
      .eq('payment_method', 'cod')
      .is('cod_remitted_at', null);

    if (fetchError) {
      return { ok: false, error: fetchError.message };
    }

    const eligibleOrders = (orders || []).filter(isDelivered);

    if (eligibleOrders.length === 0) {
      return {
        ok: false,
        error: 'There are no outstanding delivered COD orders for this rider.',
      };
    }

    const remittedAt = new Date().toISOString();

    // Record each order through the same database function the cashier uses.
    // It inserts the payment_records row (what the Revenue report reads),
    // marks the order paid and stamps cod_remitted_at in ONE transaction.
    const succeeded = [];
    const failed = [];

    for (const order of eligibleOrders) {
      const amount = getCodAmount(order);
      const orderTotal = Number(order.total || 0);
      const differs = Math.abs(amount - orderTotal) > 0.009;

      const result = await recordCodPayment(
        db,
        order,
        amount,
        differs
          ? 'Received via admin COD remittance (amount differs from order total)'
          : 'Received via admin COD remittance',
        auth.user
      );

      if (!result.ok) {
        failed.push({ id: order.id, error: result.error });
      } else {
        succeeded.push({ id: order.id, amount });
      }
    }

    if (succeeded.length === 0) {
      return {
        ok: false,
        error:
          failed[0]?.error ||
          'No orders were updated. The remittance may already have been received.',
      };
    }

    const total = succeeded.reduce((sum, order) => sum + order.amount, 0);

    revalidatePath('/admin/cod-remittance');
    revalidatePath('/admin/revenue');
    revalidatePath('/admin/cashier');
    revalidatePath('/admin/orders');
    revalidatePath('/delivery');
    revalidatePath('/admin');

    return {
      ok: true,
      count: succeeded.length,
      total: Number(total.toFixed(2)),
      remittedAt,
      failed,
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Unable to confirm the COD remittance.',
    };
  }
}