import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMail, newOrderAdminEmail } from '@/lib/email';
import { verifyCartItems } from '@/lib/cartVerify';

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
    const status = err.message?.includes('available') || err.message?.includes('stock') || err.message?.includes('Invalid') || err.message?.includes('empty') ? 400 : 500;
    return NextResponse.json({ error: err.message || 'Could not place order' }, { status });
  }
}
