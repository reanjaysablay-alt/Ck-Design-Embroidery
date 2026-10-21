import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMail, newOrderAdminEmail } from '@/lib/email';
import { verifyCartItems, deductStock } from '@/lib/cartVerify';
import { getDeliveryQuote } from '@/lib/deliveryFee';
import { isUaeAddress, isPinInsideUae, UAE_ONLY_ERROR, PIN_OUTSIDE_UAE_ERROR } from '@/lib/uaeOnly';

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

  if (!isUaeAddress(address)) {
    return NextResponse.json({ error: UAE_ONLY_ERROR }, { status: 400 });
  }
  if (!isPinInsideUae(address)) {
    return NextResponse.json({ error: PIN_OUTSIDE_UAE_ERROR }, { status: 400 });
  }

  try {
    // Re-price against the real products table — never trust price,
    // total, or stock status as sent from the browser.
    const { items: verifiedItems, total, stockDeductions } = await verifyCartItems(items);

    // Automatic delivery fee (Google Maps driving distance). If Google
    // can't find the address, the order still goes through with no fee and
    // staff add it by hand, exactly like before.
    const quote = await getDeliveryQuote({ address, itemsTotal: Number(total) });
    const deliveryFee = quote.status === 'ok' ? quote.fee : 0;
    const orderTotal = (Number(total) + deliveryFee).toFixed(2);

    const { data: order, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_email: user.email,
        items: verifiedItems,
        total: orderTotal,
        delivery_fee: deliveryFee,
        currency: 'USD',
        payment_method: 'cod',
        payment_status: 'pending_cod',
        order_status: 'pending',
        shipping_address: address,
        stock_deductions: stockDeductions,
      })
      .select('*')
      .single();

    if (dbError) throw dbError;

    // Only deduct AFTER the order is confirmed saved — an order that
    // failed to insert shouldn't take stock away from anyone.
    await deductStock(stockDeductions);

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
