import { NextResponse } from 'next/server';
import { checkSignupOtp } from '@/lib/otp';

// Verifies the signup code entered by the user matches the one sent to
// their email. This does NOT create the account and does NOT consume the
// code — it only confirms the email is theirs so the client can safely
// move on to the final step (password + nickname). The account is created
// (and the code consumed) in /api/auth/verify-signup.
export async function POST(request) {
  try {
    const { email, code, purpose } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const verification = await checkSignupOtp({ email: normalized, code, purpose: purpose || 'signup' });

    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason }, { status: 400 });
    }

    return NextResponse.json({ ok: true, email: normalized });
  } catch (err) {
    console.error('verify code error:', err);
    return NextResponse.json(
      { error: 'Could not verify the code. Please try again.' },
      { status: 500 }
    );
  }
}
