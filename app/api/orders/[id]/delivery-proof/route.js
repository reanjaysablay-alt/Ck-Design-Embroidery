import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAccessAdmin, isDeliveryUser } from '@/lib/admin';

const PROOF_BUCKET = 'delivery-proofs';

// GET /api/orders/:id/delivery-proof
//
// Opens the proof-of-delivery photo for an order. This is the link behind
// "View proof of delivery" in the customer's notifications. The photo
// lives in a PRIVATE bucket, so instead of exposing it we check who is
// asking and redirect to a short-lived signed link (10 minutes).
//
// Allowed: the customer who owns the order, staff/admin, and the rider
// the order is assigned to. Anyone else gets a plain 404, so the response
// never reveals whether an order exists.
export async function GET(_request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }

  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, delivery_user_id, delivery_proof_path')
    .eq('id', orderId)
    .maybeSingle();

  const allowed =
    !!order &&
    (order.user_id === user.id ||
      order.delivery_user_id === user.id ||
      canAccessAdmin(user.email) ||
      isDeliveryUser(user));
  if (!allowed) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  if (!order.delivery_proof_path) {
    return NextResponse.json({ error: 'No proof of delivery for this order yet.' }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(order.delivery_proof_path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not open the proof photo.' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}