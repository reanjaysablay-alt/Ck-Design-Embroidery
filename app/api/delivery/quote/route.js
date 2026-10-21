import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCartItems } from '@/lib/cartVerify';
import { getDeliveryQuote } from '@/lib/deliveryFee';
import { isUaeAddress, isPinInsideUae, UAE_ONLY_ERROR, PIN_OUTSIDE_UAE_ERROR } from '@/lib/uaeOnly';

// Live delivery-fee preview for the checkout page. Signed-in customers
// only (every Google lookup costs money). The real fee is recomputed on
// the server again when the order is actually created/charged — this
// route is just what the customer sees beforehand.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { items, address } = await request.json();
  if (!address || typeof address !== 'object') {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }
  if (!isUaeAddress(address)) {
    return NextResponse.json({ error: UAE_ONLY_ERROR }, { status: 400 });
  }
  if (!isPinInsideUae(address)) {
    return NextResponse.json({ error: PIN_OUTSIDE_UAE_ERROR }, { status: 400 });
  }

  // Items total (re-priced from the database) is only needed for the
  // optional "free delivery over X" rule.
  let itemsTotal = 0;
  try {
    itemsTotal = Number((await verifyCartItems(items)).total);
  } catch {
    itemsTotal = 0;
  }

  const quote = await getDeliveryQuote({ address, itemsTotal });
  return NextResponse.json(quote);
}
