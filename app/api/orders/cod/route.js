import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMail, newOrderAdminEmail } from '@/lib/email';
import { verifyCartItems } from '@/lib/cartVerify';

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
    // Re-price against the real products table — never trust price,
    // total, or stock status as sent from the browser.
    const { items: verifiedItems, total } = await verifyCartItems(items);

    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_email: user.email,
        items: verifiedItems,
        total,
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
      const { subject, html, attachments } = await newOrderAdminEmail(order);
      await sendMail({
        to: process.env.ADMIN_EMAILS.split(',')[0].trim(),
        subject,
        html,
        attachments,
      });
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error(err);
    const status = err.message?.includes('available') || err.message?.includes('stock') || err.message?.includes('Invalid') || err.message?.includes('empty') ? 400 : 500;
    return NextResponse.json({ error: err.message || 'Could not place order' }, { status });
  }
}
