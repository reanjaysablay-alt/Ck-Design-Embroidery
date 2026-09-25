'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffIdentifyGate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  async function submitIdentity() {
    const res = await fetch('/api/staff/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Could not verify your identity.');
    return result;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await submitIdentity();
      if (result.pending) {
        setPending(true);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Re-sends the same name+PIN to see if an admin has approved it yet
  // — used by the "Check again" button on the waiting screen.
  async function handleCheckAgain() {
    setLoading(true);
    setError('');
    try {
      const result = await submitIdentity();
      if (!result.pending) {
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Waiting for approval</h1>
          <p className="text-slate-500 text-sm mb-6">
            Thanks, {name}. An admin needs to approve you from the Staff page before you can
            get into the dashboard. Check back shortly, or ask them directly.
          </p>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <button
            onClick={handleCheckAgain}
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-medium text-sm px-6 py-3.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Who's on shift?</h1>
        <p className="text-slate-500 text-sm mb-6">
          This staff login may be shared — enter your name and a short PIN so the
          admin can see who's doing what. First time using this name? Pick a PIN and
          an admin will need to approve you before you get in.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus-visible:outline-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">
              PIN (4-6 digits)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 tracking-widest focus-visible:outline-indigo-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-medium text-sm px-6 py-3.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
