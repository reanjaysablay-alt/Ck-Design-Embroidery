import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyOtp } from '@/lib/otp';

// Validates the code the user entered against the one emailed to them.
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { code, purpose } = body;
  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  try {
    const result = await verifyOtp({
      userId: user.id,
      email: user.email,
      code,
      purpose: purpose || 'order',
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('verify OTP error:', err.message);
    return NextResponse.json({ error: 'Could not verify code' }, { status: 500 });
  }
}
