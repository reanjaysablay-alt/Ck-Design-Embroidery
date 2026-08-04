import { NextResponse } from 'next/server';
import { verifyLoginOtp } from '@/lib/otp';
import { createClient } from '@/lib/supabase/server';

// 2FA login step 2: the user has entered the code they received by email.
// If it's correct, we create the session (sign them in) so they land in
// the app. The code is consumed on success.
export async function POST(request) {
  try {
    const { email, code, password } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // 1) Verify the OTP proves the email is theirs. This consumes the code.
    const verification = await verifyLoginOtp({ email: normalized, code });
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason }, { status: 400 });
    }

    // 2) Sign them in so they get a real session. The password is passed
    //    from the client (it was already verified in step 1's send-code
    //    route, and kept in memory — never persisted).
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Your code was correct, but we could not log you in. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, email: normalized });
  } catch (err) {
    console.error('verify login OTP error:', err);
    return NextResponse.json(
      { error: 'Could not verify the code. Please try again.' },
      { status: 500 }
    );
  }
}
