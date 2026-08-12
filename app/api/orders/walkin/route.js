import { NextResponse } from 'next/server';
import { computeTotal } from '@/lib/paypal';
import { createClient } from '@/lib/supabase/server';
import { sendMail, newOrderAdminEmail } from '@/lib/email';

// Walk-in orders skip delivery entirely — the customer places the
// order online, then picks it up and pays in person at the shop. Only
// a name and phone number are required (no shipping address).
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { items, contact } = await request.json();
  if (!items?.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }
  if (!contact?.fullName || !contact?.phone) {
    return NextResponse.json({ error: 'Name and phone number are required' }, { status: 400 });
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
        payment_method: 'walkin',
        payment_status: 'pending_walkin',
        order_status: 'pending',
        shipping_address: { fullName: contact.fullName, phone: contact.phone },
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
    return NextResponse.json({ error: 'Could not place order' }, { status: 500 });
  }
}
