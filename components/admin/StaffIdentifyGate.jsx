'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffIdentifyGate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/staff/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not verify your identity.');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Who's on shift?</h1>
        <p className="text-slate-500 text-sm mb-6">
          This staff login may be shared — enter your name and a short PIN so the
          admin can see who's doing what. First time using this name? Just pick a PIN
          and it's yours from now on.
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
