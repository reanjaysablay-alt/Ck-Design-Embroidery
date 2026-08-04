import { NextResponse } from 'next/server';
import { verifySignupOtp } from '@/lib/otp';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Step 2 of the email-registration flow: the user has entered the code
// they received by email. If it's correct, we create the Supabase account
// (with their password + nickname), then sign them in.
export async function POST(request) {
  try {
    const { email, code, password, nickname } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();

    // 1) Verify the OTP proves the email is theirs.
    const verification = await verifySignupOtp({ email: normalized, code });
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason }, { status: 400 });
    }

    // 2) Create the account in Supabase with the password + nickname.
    const admin = createAdminClient();
    const { data: created, error: signUpError } = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
      user_metadata: { nickname: nickname?.trim() || null },
    });

    if (signUpError) {
      // If the email was created between the check and now, or the
      // password is invalid, surface a clear message.
      return NextResponse.json(
        { error: signUpError.message || 'Could not create your account. Please try again.' },
        { status: 400 }
      );
    }

    // 3) Sign them in so they land straight in the app.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (signInError) {
      // Account was created but auto sign-in failed — still a success;
      // the browser will send them to the login page to sign in.
      return NextResponse.json({ ok: true, created: true, email: normalized, userId: created.user?.id });
    }

    return NextResponse.json({ ok: true, created: true, email: normalized, userId: created.user?.id });
  } catch (err) {
    console.error('verify signup OTP error:', err);
    return NextResponse.json(
      { error: 'Could not create your account. Please try again.' },
      { status: 500 }
    );
  }
}
