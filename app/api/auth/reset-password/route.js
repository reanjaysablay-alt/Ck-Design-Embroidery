import { NextResponse } from 'next/server';
import { verifyResetOtp } from '@/lib/otp';
import { createAdminClient } from '@/lib/supabase/server';

// Step 2 of the forgot-password flow: the user has entered the code they
// received by email. If it's correct, we update their password to the
// new one they chose.
export async function POST(request) {
  try {
    const { email, code, password } = await request.json();

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

    // 1) Verify the OTP proves the email is theirs. This consumes the code.
    const verification = await verifyResetOtp({ email: normalized, code });
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason }, { status: 400 });
    }

    // 2) Look up the user by email so we can update their password via the
    //    service-role admin client (bypasses RLS).
    const admin = createAdminClient();
    const { data: existing } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const user = existing?.users?.find(
      (u) => u.email?.toLowerCase() === normalized
    );
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email.' },
        { status: 404 }
      );
    }

    // 3) Update the password.
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Could not update your password. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, email: normalized });
  } catch (err) {
    console.error('reset password error:', err);
    return NextResponse.json(
      { error: err.message || 'Could not reset your password. Please try again.' },
      { status: 500 }
    );
  }
}
