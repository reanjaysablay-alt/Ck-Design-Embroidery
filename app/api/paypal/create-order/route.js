import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/paypal';
import { createClient } from '@/lib/supabase/server';
import { verifyCartItems } from '@/lib/cartVerify';

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

  const { items, currency } = await request.json();
  if (!items?.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  try {
    // Re-price against the real products table — this is the amount
    // that actually gets charged, so it's the critical point to verify
    // at. Anything the browser sent for `price` is discarded here.
    const { items: verifiedItems } = await verifyCartItems(items);
    const order = await createOrder({ items: verifiedItems, currency: currency || 'USD' });
    return NextResponse.json({ id: order.id });
  } catch (err) {
    console.error(err);
    const status = err.message?.includes('available') || err.message?.includes('stock') || err.message?.includes('Invalid') || err.message?.includes('empty') ? 400 : 500;
    return NextResponse.json({ error: err.message || 'Could not start PayPal checkout' }, { status });
  }
}
