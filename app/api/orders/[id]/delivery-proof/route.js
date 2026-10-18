import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail, isStaffEmail, isDeliveryUser } from '@/lib/admin';

export async function GET(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Not signed in', { status: 401 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('user_id, delivery_proof_path')
    .eq('id', id)
    .maybeSingle();

  if (!order?.delivery_proof_path) {
    return new NextResponse('No proof of delivery found', { status: 404 });
  }

  const allowed =
    order.user_id === user.id ||
    isAdminEmail(user.email) ||
    isStaffEmail(user.email) ||
    isDeliveryUser(user);
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  const { data, error } = await admin.storage
    .from('delivery-proofs')
    .createSignedUrl(order.delivery_proof_path, 300);
  if (error || !data?.signedUrl) {
    return new NextResponse('Could not load proof', { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}