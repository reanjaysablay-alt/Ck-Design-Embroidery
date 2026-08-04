import { NextResponse } from 'next/server';
import { computeTotal } from '@/lib/paypal';
import { createClient } from '@/lib/supabase/server';
import { sendMail, newOrderAdminEmail } from '@/lib/email';

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { items, address } = await request.json();
  if (!items?.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }
  if (!address?.fullName || !address?.line1 || !address?.city) {
    return NextResponse.json({ error: 'Shipping address is incomplete' }, { status: 400 });
  }

  try {
    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_email: user.email,
        items,
        total: computeTotal(items),
        currency: 'USD',
        payment_method: 'cod',
        payment_status: 'pending_cod',
        order_status: 'pending',
        shipping_address: address,
      })
      .select('*')
      .single();

    if (dbError) throw dbError;

    if (process.env.ADMIN_EMAILS) {
      const { subject, html } = newOrderAdminEmail(order);
      await sendMail({ to: process.env.ADMIN_EMAILS.split(',')[0].trim(), subject, html });
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Could not place order' }, { status: 500 });
  }
}
