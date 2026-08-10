import { NextResponse } from 'next/server';
import { captureOrder, computeTotal, extractCaptureId } from '@/lib/paypal';
import { createClient } from '@/lib/supabase/server';
import { sendMail, newOrderAdminEmail } from '@/lib/email';

export async function POST(request) {
  // Auth: prefer the user's access token sent as a Bearer token (the
  // PayPal popup context can drop the session cookie), fall back to the
  // session cookie.
  const authHeader = request.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let supabase;
  let user = null;

  if (accessToken) {
    supabase = await createClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) user = data.user;
  }

  if (!user) {
    supabase = supabase || (await createClient());
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();
    user = cookieUser || null;
  }

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { orderID, items, address } = await request.json();
  if (!orderID || !items?.length) {
    return NextResponse.json({ error: 'Missing order details' }, { status: 400 });
  }

  try {
    const capture = await captureOrder(orderID);
    const status = capture.status;

    if (status !== 'COMPLETED') {
      return NextResponse.json({ error: `Payment status: ${status}` }, { status: 400 });
    }

    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_email: user.email,
        items,
        total: computeTotal(items),
        currency: 'USD',
        payment_method: 'paypal',
        payment_status: 'paid',
        order_status: 'pending',
        paypal_order_id: orderID,
        paypal_capture_id: extractCaptureId(capture),
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
    return NextResponse.json(
      { error: 'Payment succeeded but the order could not be saved — contact support with your PayPal receipt.' },
      { status: 500 }
    );
  }
}
