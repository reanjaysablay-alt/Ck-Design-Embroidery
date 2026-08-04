import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CheckoutClient from '@/components/CheckoutClient';

export const metadata = { title: 'Checkout — Stitchhouse' };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/checkout');
  }

  return <CheckoutClient user={user} />;
}
