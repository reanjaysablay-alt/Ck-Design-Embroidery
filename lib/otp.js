import { createAdminClient } from '@/lib/supabase/server';
import { sendMailStrict, otpEmail } from '@/lib/email';
import { getSiteSettings } from '@/lib/settings';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between sends

// Generates a 6-digit numeric one-time code.
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Creates a fresh OTP row for the user, invalidating any previous
// unused/unverified codes for the same purpose, and emails it to them.
// Throws if a resend was attempted too soon.
export async function sendOtp({ userId, email, purpose = 'order' }) {
  const admin = createAdminClient();

  // Enforce a resend cooldown so we don't spam the user's inbox.
  const { data: recent, error: recentError } = await admin
    .from('otp_codes')
    .select('created_at')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentError) throw new Error(recentError.message);

  const last = recent?.[0];
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${wait}s before requesting a new code.`);
    }
  }

  // Invalidate any outstanding codes for this user/purpose so only the
  // newest one is valid.
  const { error: invalidateError } = await admin
    .from('otp_codes')
    .update({ used: true })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('used', false);

  if (invalidateError) throw new Error(invalidateError.message);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error: insertError } = await admin.from('otp_codes').insert({
    user_id: userId,
    email,
    code,
    purpose,
    expires_at: expiresAt,
  });

  if (insertError) throw new Error(insertError.message);

  // Send it in real time and verify delivery actually succeeded. If the
  // email fails (bad Gmail config, SMTP down, invalid recipient), we
  // throw so the user is told immediately instead of waiting for a code
  // that never arrives.
  const settings = await getSiteSettings();
  const { subject, html } = otpEmail({ code, siteName: settings.site_title });
  try {
    await sendMailStrict({ to: email, subject, html });
  } catch (err) {
    console.error('OTP email send failed:', err.message);
    throw new Error(emailErrorMessage(err));
  }

  return { sent: true, expiresAt };
}

// Turns a raw nodemailer/Gmail SMTP error into a helpful, user-facing
// message so the customer (or developer) knows exactly what to fix.
function emailErrorMessage(err) {
  const msg = String(err?.message || err || '').toLowerCase();

  if (msg.includes('invalid login') || msg.includes('bad credentials') || msg.includes('username and password')) {
    return 'Email is not configured correctly — the Gmail app password in your settings is invalid. An app password is a 16-character code (not your normal Gmail password) generated after turning on 2-step verification.';
  }
  if (msg.includes('getaddrinfo') || msg.includes('enotfound') || msg.includes('econnrefused')) {
    return 'We could not reach the email server right now. Check your internet connection and try again.';
  }
  if (msg.includes('spam') || msg.includes('blocked') || msg.includes('denied')) {
    return 'Gmail blocked this email (possible spam risk). Please try again in a few minutes.';
  }
  return 'We could not send the code to your email right now. Please try again, or contact support if it keeps failing.';
}

// Verifies the submitted code against the user's latest outstanding OTP
// for the given purpose. Marks it verified on success.
export async function verifyOtp({ userId, email, code, purpose = 'order' }) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('otp_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const otp = rows?.[0];
  if (!otp) return { valid: false, reason: 'No active code. Please request a new one.' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    // Expired — mark used so it can't be reused.
    await admin.from('otp_codes').update({ used: true }).eq('id', otp.id);
    return { valid: false, reason: 'This code has expired. Please request a new one.' };
  }

  if (otp.code !== String(code).trim()) {
    return { valid: false, reason: 'Incorrect code. Please try again.' };
  }

  await admin
    .from('otp_codes')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', otp.id);

  return { valid: true };
}

// Consumes the user's verified OTP. Called by the order routes right
// before placing an order, so the code can only be used once.
export async function consumeOtp({ userId, email, purpose = 'order' }) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('otp_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('used', false)
    .not('verified_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const otp = rows?.[0];
  if (!otp) return { ok: false, reason: 'Please verify your email first.' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'Your verification code has expired. Please request a new one.' };
  }

  await admin.from('otp_codes').update({ used: true }).eq('id', otp.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signup OTP flow — verifies that an email belongs to the person signing up
// BEFORE the account is created in Supabase. These are keyed by email only
// (the user doesn't exist yet), stored in signup_verifications.
// ---------------------------------------------------------------------------

const SIGNUP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SIGNUP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// Sends a signup verification code to the email. Throws if a resend was
// attempted too soon. Returns the expiry so the client can show it.
export async function sendSignupOtp({ email }) {
  const admin = createAdminClient();

  // Enforce a resend cooldown per email.
  const { data: recent, error: recentError } = await admin
    .from('signup_verifications')
    .select('created_at')
    .eq('email', email)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentError) throw new Error(recentError.message);

  const last = recent?.[0];
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < SIGNUP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((SIGNUP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${wait}s before requesting a new code.`);
    }
  }

  // Invalidate any outstanding unverified codes for this email.
  const { error: invalidateError } = await admin
    .from('signup_verifications')
    .update({ verified: true })
    .eq('email', email)
    .eq('verified', false);

  if (invalidateError) throw new Error(invalidateError.message);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + SIGNUP_TTL_MS).toISOString();

  const { error: insertError } = await admin.from('signup_verifications').insert({
    email,
    code,
    purpose: 'signup',
    expires_at: expiresAt,
  });

  if (insertError) throw new Error(insertError.message);

  // Send it and verify delivery succeeded.
  const settings = await getSiteSettings();
  const { subject, html } = otpEmail({ code, siteName: settings.site_title });
  try {
    await sendMailStrict({ to: email, subject, html });
  } catch (err) {
    console.error('Signup OTP email send failed:', err.message);
    throw new Error(emailErrorMessage(err));
  }

  return { sent: true, expiresAt };
}

// Checks the submitted code against the latest outstanding code for the
// email WITHOUT consuming it. Used by the /verify-code step so the user
// can move on to the password screen; the final /verify-signup (or
// /reset-password) step consumes the code (marks it verified) before
// creating the account / updating the password.
export async function checkSignupOtp({ email, code, purpose = 'signup' }) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('signup_verifications')
    .select('*')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const otp = rows?.[0];
  if (!otp) return { valid: false, reason: 'No active code. Please request a new one.' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
    return { valid: false, reason: 'This code has expired. Please request a new one.' };
  }

  if (otp.code !== String(code).trim()) {
    return { valid: false, reason: 'Incorrect code. Please try again.' };
  }

  return { valid: true };
}

// Verifies the submitted code against the latest outstanding code for the
// email. Marks it verified on success (consumes the code).
export async function verifySignupOtp({ email, code, purpose = 'signup' }) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('signup_verifications')
    .select('*')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const otp = rows?.[0];
  if (!otp) return { valid: false, reason: 'No active code. Please request a new one.' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
    return { valid: false, reason: 'This code has expired. Please request a new one.' };
  }

  if (otp.code !== String(code).trim()) {
    return { valid: false, reason: 'Incorrect code. Please try again.' };
  }

await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Login OTP flow — verifies the user's identity when they log in with their
// password. A code is sent to their email (purpose='login'); the user must
// enter it before a session is created. Reuses the signup_verifications
// table (the user already exists in auth).
// ---------------------------------------------------------------------------

const LOGIN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// Sends a login-verification code to the email. Throws if a resend was
// attempted too soon. Returns the expiry so the client can show it.
export async function sendLoginOtp({ email }) {
  const admin = createAdminClient();

  // Enforce a resend cooldown per email.
  const { data: recent, error: recentError } = await admin
    .from('signup_verifications')
    .select('created_at')
    .eq('email', email)
    .eq('purpose', 'login')
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentError) throw new Error(recentError.message);

  const last = recent?.[0];
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < LOGIN_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((LOGIN_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${wait}s before requesting a new code.`);
    }
  }

  // Invalidate any outstanding unverified login codes for this email.
  const { error: invalidateError } = await admin
    .from('signup_verifications')
    .update({ verified: true })
    .eq('email', email)
    .eq('purpose', 'login')
    .eq('verified', false);

  if (invalidateError) throw new Error(invalidateError.message);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + LOGIN_TTL_MS).toISOString();

  const { error: insertError } = await admin.from('signup_verifications').insert({
    email,
    code,
    purpose: 'login',
    expires_at: expiresAt,
  });

  if (insertError) throw new Error(insertError.message);

  // Send it and verify delivery succeeded.
  const settings = await getSiteSettings();
  const { subject, html } = otpEmail({ code, siteName: settings.site_title });
  try {
    await sendMailStrict({ to: email, subject, html });
  } catch (err) {
    console.error('Login OTP email send failed:', err.message);
    throw new Error(emailErrorMessage(err));
  }

  return { sent: true, expiresAt };
}

// Verifies the submitted login code against the latest outstanding login
// code for the email. Marks it verified on success (consumes the code).
export async function verifyLoginOtp({ email, code }) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('signup_verifications')
    .select('*')
    .eq('email', email)
    .eq('purpose', 'login')
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const otp = rows?.[0];
  if (!otp) return { valid: false, reason: 'No active code. Please request a new one.' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
    return { valid: false, reason: 'This code has expired. Please request a new one.' };
  }

  if (otp.code !== String(code).trim()) {
    return { valid: false, reason: 'Incorrect code. Please try again.' };
  }

  await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Password-reset OTP flow — lets an existing user reset their password by
// verifying a code sent to their email. Reuses the signup_verifications
// table with purpose='reset' (the user already exists in auth).
// ---------------------------------------------------------------------------

const RESET_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// Sends a password-reset verification code to the email. The email must
// belong to an existing account (checked by the caller). Throws if a
// resend was attempted too soon.
export async function sendResetOtp({ email }) {
  const admin = createAdminClient();

  // Enforce a resend cooldown per email.
  const { data: recent, error: recentError } = await admin
    .from('signup_verifications')
    .select('created_at')
    .eq('email', email)
    .eq('purpose', 'reset')
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentError) throw new Error(recentError.message);

  const last = recent?.[0];
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < RESET_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESET_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${wait}s before requesting a new code.`);
    }
  }

  // Invalidate any outstanding unverified reset codes for this email.
  const { error: invalidateError } = await admin
    .from('signup_verifications')
    .update({ verified: true })
    .eq('email', email)
    .eq('purpose', 'reset')
    .eq('verified', false);

  if (invalidateError) throw new Error(invalidateError.message);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

  const { error: insertError } = await admin.from('signup_verifications').insert({
    email,
    code,
    purpose: 'reset',
    expires_at: expiresAt,
  });

  if (insertError) throw new Error(insertError.message);

  // Send it and verify delivery succeeded.
  const settings = await getSiteSettings();
  const { subject, html } = otpEmail({ code, siteName: settings.site_title });
  try {
    await sendMailStrict({ to: email, subject, html });
  } catch (err) {
    console.error('Reset OTP email send failed:', err.message);
    throw new Error(emailErrorMessage(err));
  }

  return { sent: true, expiresAt };
}

// Verifies the submitted reset code against the latest outstanding reset
// code for the email. Marks it verified on success (consumes the code).
export async function verifyResetOtp({ email, code }) {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('signup_verifications')
    .select('*')
    .eq('email', email)
    .eq('purpose', 'reset')
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const otp = rows?.[0];
  if (!otp) return { valid: false, reason: 'No active code. Please request a new one.' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
    return { valid: false, reason: 'This code has expired. Please request a new one.' };
  }

  if (otp.code !== String(code).trim()) {
    return { valid: false, reason: 'Incorrect code. Please try again.' };
  }

  await admin.from('signup_verifications').update({ verified: true }).eq('id', otp.id);
  return { valid: true };
}
