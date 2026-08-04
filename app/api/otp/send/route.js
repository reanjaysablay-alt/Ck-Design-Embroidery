import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/otp';

// Sends a one-time verification code to the signed-in user's email.
// Requires authentication; the code is used to confirm the email before
// an order can be placed.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { purpose } = await request.json().catch(() => ({}));

  try {
    const result = await sendOtp({
      userId: user.id,
      email: user.email,
      purpose: purpose || 'order',
    });
    return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
  } catch (err) {
    console.error('send OTP error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
