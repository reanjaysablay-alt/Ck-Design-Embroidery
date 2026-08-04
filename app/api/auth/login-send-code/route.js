import { NextResponse } from 'next/server';
import { sendLoginOtp } from '@/lib/otp';
import { createClient } from '@/lib/supabase/server';

// 2FA login step 1: the user has entered their email + password. We
// verify the password is correct server-side, then send a one-time code
// to their email. The user is NOT logged in yet — they only get a
// session after entering the correct code (see /api/auth/login-verify-code).
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // 1) Verify the password is correct. If it isn't, don't send a code.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (signInError) {
      const message = signInError.message?.toLowerCase() || '';
      if (message.includes('invalid login credentials') || message.includes('password')) {
        return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
      }
      return NextResponse.json({ error: signInError.message || 'Could not verify your credentials.' }, { status: 400 });
    }

    // 2) Password is correct — immediately revoke the session so the user
    //    is not logged in until they complete the code step.
    await supabase.auth.signOut();

    // 3) Send the one-time code to their email.
    await sendLoginOtp({ email: normalized });

    return NextResponse.json({ ok: true, email: normalized });
  } catch (err) {
    console.error('send login OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Could not send the verification code. Please try again.' },
      { status: 500 }
    );
  }
}
