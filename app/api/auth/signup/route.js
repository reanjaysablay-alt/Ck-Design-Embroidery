import { NextResponse } from 'next/server';
import { sendSignupOtp } from '@/lib/otp';
import { createAdminClient } from '@/lib/supabase/server';

// Step 1 of the email-registration flow: verify the email is available
// and send a one-time code to it. The account is NOT created yet — it is
// only created after the user proves they own the email by entering the
// correct code.
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

// Reject if this email is already registered.
    const admin = createAdminClient();
    const { data: existing } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const alreadyExists = existing?.users?.some(
      (u) => u.email?.toLowerCase() === normalized
    );
    if (alreadyExists) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 409 }
      );
    }

    await sendSignupOtp({ email: normalized });

    return NextResponse.json({ ok: true, email: normalized });
  } catch (err) {
    console.error('send signup OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Could not send the verification code. Please try again.' },
      { status: 500 }
    );
  }
}
