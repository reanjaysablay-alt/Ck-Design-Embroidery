import { NextResponse } from 'next/server';
import { sendResetOtp } from '@/lib/otp';
import { createAdminClient } from '@/lib/supabase/server';

// Step 1 of the forgot-password flow: verify the email belongs to an
// existing account and send a one-time password-reset code to it. The
// password is NOT changed here — it is only changed after the user
// proves they own the email by entering the correct code.
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // Only allow resetting for an existing account.
    const admin = createAdminClient();
    const { data: existing } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const accountExists = existing?.users?.some(
      (u) => u.email?.toLowerCase() === normalized
    );
    if (!accountExists) {
      return NextResponse.json(
        { error: 'No account found with this email. Please create an account first.' },
        { status: 404 }
      );
    }

    await sendResetOtp({ email: normalized });

    return NextResponse.json({ ok: true, email: normalized });
  } catch (err) {
    console.error('send reset OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Could not send the reset code. Please try again.' },
      { status: 500 }
    );
  }
}
