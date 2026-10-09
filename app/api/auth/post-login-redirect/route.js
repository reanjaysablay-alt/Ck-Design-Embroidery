import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  canAccessAdmin,
  isAdminEmail,
  isDeliveryEmail,
} from '@/lib/admin';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let target = '/';

  // Delivery = created from the Staff page (app_metadata.role)
  // OR listed in the DELIVERY_EMAILS env var.
  const isDelivery =
    user?.app_metadata?.role === 'delivery' || isDeliveryEmail(user?.email);

  if (!user) {
    target = '/login';
  } else if (isAdminEmail(user.email)) {
    // Full administrator
    target = '/admin';
  } else if (isDelivery) {
    // Delivery account
    target = '/delivery';
  } else if (canAccessAdmin(user.email)) {
    // Staff account
    target = '/admin/orders';
  } else {
    // Normal customer
    target = '/';
  }

  return NextResponse.json({ target });
}