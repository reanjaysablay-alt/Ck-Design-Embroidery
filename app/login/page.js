'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const authError = params.get('error');

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'password'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Signup state
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  // Login state — 2-step: password, then email code.
  const [loginStep, setLoginStep] = useState('password'); // 'password' | 'otp'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  // When true (set right after a password reset), the next login skips the
  // email-code step — the user already proved ownership of the email by
  // entering the reset code, so we log them straight in.
  const [skipOtp, setSkipOtp] = useState(false);

  // Forgot-password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  // Step 1 of login: verify the password, then send a code to the email.
  // Unless skipOtp is set (right after a password reset), in which case we
  // log straight in — the user already proved ownership of the email.
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (skipOtp) {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });
        if (error) throw new Error(error.message || 'Could not log in. Please try again.');
        setSkipOtp(false);
        router.push(next);
        router.refresh();
        return;
      }

      const res = await fetch('/api/auth/login-send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify your credentials.');
      setLoginStep('otp');
    } catch (err) {
      setError(err.message || 'Could not log in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Resend the login code (e.g. after it expires or arrives late).
  async function handleSendLoginCode() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login-send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send a new code.');
      setSuccess('A new code has been sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2 of login: enter the emailed code to complete sign-in.
  async function handleVerifyLoginCode() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login-verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          code: loginCode,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify the code.');
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 1: send the OTP to the email
  async function handleSendCode() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send code.');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: verify the OTP, then move to password/nickname
  async function handleVerifyCode() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify code.');
      setStep('password');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: create the account with password + nickname
  async function handleCreateAccount(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password, nickname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create account.');
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Forgot-password step 1: send the reset OTP to the email
  async function handleSendResetCode() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send reset code.');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Forgot-password step 2: verify the reset OTP, then move to new password
  async function handleVerifyResetCode() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, purpose: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify code.');
      setStep('password');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Forgot-password step 3: set the new password
  async function handleResetPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset password.');
      // Back to log in with a success message. The user already proved
      // ownership of the email via the reset code, so the next login skips
      // the email-code step.
      setMode('login');
      setStep('email');
      setLoginStep('password');
      setSkipOtp(true);
      setLoginEmail(resetEmail);
      setLoginPassword('');
      setLoginCode('');
      setResetEmail('');
      setResetCode('');
      setResetPassword('');
      setSuccess('Password updated. You can now log in with your new password.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

return (
    <div className="max-w-sm mx-auto px-5 py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-gold mb-3">Account</p>

        {/* Tabs: Log in / Create account */}
        {mode !== 'reset' && (
          <div className="flex gap-3 mb-8 border-b border-white/10 pb-4">
            <button
              onClick={() => { setMode('login'); setStep('email'); setLoginStep('password'); setSkipOtp(false); setError(''); setSuccess(''); }}
              className={`text-sm uppercase tracking-widest pb-2 transition-colors ${
                mode === 'login' ? 'text-gold border-b-2 border-gold' : 'text-thread/50 hover:text-thread/80'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => { setMode('signup'); setStep('email'); setSkipOtp(false); setError(''); setSuccess(''); }}
              className={`text-sm uppercase tracking-widest pb-2 transition-colors ${
                mode === 'signup' ? 'text-gold border-b-2 border-gold' : 'text-thread/50 hover:text-thread/80'
              }`}
            >
              Create account
            </button>
          </div>
        )}

        {authError && (
          <p className="text-stitchRed text-sm mb-6">
            Something went wrong — please try again.
          </p>
        )}

        {error && <p className="text-stitchRed text-sm mb-6">{error}</p>}

        {success && <p className="text-green-400 text-sm mb-6">{success}</p>}

        {mode === 'login' && loginStep === 'password' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email" type="email" value={loginEmail} onChange={setLoginEmail} required />
            <Field label="Password" type="password" value={loginPassword} onChange={setLoginPassword} required />
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setMode('reset'); setStep('email'); setSkipOtp(false); setError(''); setSuccess(''); }}
                className="text-gold text-xs uppercase tracking-widest hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
            >
              {loading ? 'Sending code…' : 'Log in'}
            </button>
          </form>
        )}

        {mode === 'login' && loginStep === 'otp' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-3xl text-thread mb-2">Check your email</h1>
              <p className="text-thread/60 text-sm leading-relaxed">
                We sent a 6-digit code to <span className="text-gold">{loginEmail}</span>. Enter it below to confirm it&apos;s you.
              </p>
            </div>
            <Field label="Verification code" value={loginCode} onChange={setLoginCode} placeholder="000000" />
            <button
              onClick={handleVerifyLoginCode}
              disabled={loading}
              className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Verify & log in'}
            </button>
            <button
              onClick={handleSendLoginCode}
              disabled={loading}
              className="w-full text-thread/60 text-xs uppercase tracking-widest hover:text-thread"
            >
              Resend code
            </button>
            <button
              onClick={() => { setLoginStep('password'); setError(''); setSuccess(''); }}
              className="text-thread/40 text-xs uppercase tracking-widest hover:text-thread"
            >
              ← Back to log in
            </button>
          </div>
        )}

        {mode === 'signup' && (
          <SignupForm
            step={step}
            email={email}
            setEmail={setEmail}
            nickname={nickname}
            setNickname={setNickname}
            code={code}
            setCode={setCode}
            password={password}
            setPassword={setPassword}
            loading={loading}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
            onCreateAccount={handleCreateAccount}
            onBack={() => { setStep('email'); setError(''); }}
          />
        )}

        {mode === 'reset' && (
          <ResetForm
            step={step}
            email={resetEmail}
            setEmail={setResetEmail}
            code={resetCode}
            setCode={setResetCode}
            password={resetPassword}
            setPassword={setResetPassword}
            loading={loading}
            onSendCode={handleSendResetCode}
            onVerifyCode={handleVerifyResetCode}
            onResetPassword={handleResetPassword}
            onBack={() => { setMode('login'); setStep('email'); setLoginStep('password'); setSkipOtp(false); setError(''); setSuccess(''); }}
          />
        )}
    </div>
  );
}

function SignupForm({
  step,
  email,
  setEmail,
  nickname,
  setNickname,
  code,
  setCode,
  password,
  setPassword,
  loading,
  onSendCode,
  onVerifyCode,
  onCreateAccount,
  onBack,
}) {
  if (step === 'email') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl text-thread mb-2">Create your account</h1>
          <p className="text-thread/60 text-sm leading-relaxed">
            Enter your email and we&apos;ll send you a one-time code to verify it.
          </p>
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <button
          onClick={onSendCode}
          disabled={loading}
          className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
        >
          {loading ? 'Sending code…' : 'Send code'}
        </button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl text-thread mb-2">Check your email</h1>
          <p className="text-thread/60 text-sm leading-relaxed">
            We sent a 6-digit code to <span className="text-gold">{email}</span>. Enter it below to verify your address.
          </p>
        </div>
        <Field label="Verification code" value={code} onChange={setCode} placeholder="000000" />
        <button
          onClick={onVerifyCode}
          disabled={loading}
          className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button onClick={onBack} className="text-thread/40 text-xs uppercase tracking-widest hover:text-thread">
          ← Use a different email
        </button>
      </div>
    );
  }

  // step === 'password'
  return (
    <form onSubmit={onCreateAccount} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-thread mb-2">Final details</h1>
        <p className="text-thread/60 text-sm leading-relaxed">
          Then choose a password and a nickname for your account.
        </p>
      </div>
      <Field label="Nickname" value={nickname} onChange={setNickname} placeholder="How should we call you?" />
      <Field label="Password" type="password" value={password} onChange={setPassword} />
      <p className="text-thread/40 text-xs -mt-2">At least 8 characters.</p>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create account & log in'}
      </button>
    </form>
  );
}

function ResetForm({
  step,
  email,
  setEmail,
  code,
  setCode,
  password,
  setPassword,
  loading,
  onSendCode,
  onVerifyCode,
  onResetPassword,
  onBack,
}) {
  if (step === 'email') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl text-thread mb-2">Reset your password</h1>
          <p className="text-thread/60 text-sm leading-relaxed">
            Enter the email you registered with and we&apos;ll send you a one-time code to reset your password.
          </p>
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <button
          onClick={onSendCode}
          disabled={loading}
          className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
        >
          {loading ? 'Sending code…' : 'Send code'}
        </button>
        <button onClick={onBack} className="text-thread/40 text-xs uppercase tracking-widest hover:text-thread">
          ← Back to log in
        </button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl text-thread mb-2">Check your email</h1>
          <p className="text-thread/60 text-sm leading-relaxed">
            We sent a 6-digit code to <span className="text-gold">{email}</span>. Enter it below to continue.
          </p>
        </div>
        <Field label="Verification code" value={code} onChange={setCode} placeholder="000000" />
        <button
          onClick={onVerifyCode}
          disabled={loading}
          className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button onClick={onSendCode} className="text-thread/40 text-xs uppercase tracking-widest hover:text-thread">
          Resend code
        </button>
      </div>
    );
  }

  // step === 'password'
  return (
    <form onSubmit={onResetPassword} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-thread mb-2">Choose a new password</h1>
        <p className="text-thread/60 text-sm leading-relaxed">
          Enter a new password for your account.
        </p>
      </div>
      <Field label="New password" type="password" value={password} onChange={setPassword} />
      <p className="text-thread/40 text-xs -mt-2">At least 8 characters.</p>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-6 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
      >
        {loading ? 'Updating…' : 'Reset password'}
      </button>
    </form>
  );
}

function Field({ label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
      />
    </div>
  );
}
