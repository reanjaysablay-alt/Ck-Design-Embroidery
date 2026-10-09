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
        'id, total, cod_amount, payment_method, delivery_user_id, delivery_stage, delivered_at, order_status, cod_remitted_at'
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

    const eligibleIds = eligibleOrders.map((order) => order.id);
    const remittedAt = new Date().toISOString();

    const { data: updatedOrders, error: updateError } = await db
      .from('orders')
      .update({
        cod_remitted_at: remittedAt,
        cod_remitted_by: auth.user.id,
      })
      .in('id', eligibleIds)
      .eq('delivery_user_id', cleanRiderId)
      .eq('payment_method', 'cod')
      .is('cod_remitted_at', null)
      .select('id');

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    if (!updatedOrders || updatedOrders.length === 0) {
      return {
        ok: false,
        error:
          'No orders were updated. The remittance may already have been received.',
      };
    }

    const updatedIds = new Set(updatedOrders.map((order) => String(order.id)));

    const total = eligibleOrders
      .filter((order) => updatedIds.has(String(order.id)))
      .reduce((sum, order) => sum + getCodAmount(order), 0);

    revalidatePath('/admin/cod-remittance');
    revalidatePath('/delivery');
    revalidatePath('/admin');

    return {
      ok: true,
      count: updatedOrders.length,
      total: Number(total.toFixed(2)),
      remittedAt,
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Unable to confirm the COD remittance.',
    };
  }
}