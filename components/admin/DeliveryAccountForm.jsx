'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createDeliveryAccount } from '@/app/admin/actions';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200';

export default function DeliveryAccountForm() {
  const [state, action, pending] = useActionState(createDeliveryAccount, null);
  const formRef = useRef(null);

  // Clear the form after a successful create.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="name" required placeholder="Rider name" className={inputClass} />
        <input name="phone" placeholder="Phone (optional)" className={inputClass} />
        <input name="email" type="email" required placeholder="Login email" className={inputClass} />
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {pending ? 'Creating...' : 'Add delivery account'}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-green-600">
          Delivery account created. Give the rider this email and password to sign in.
        </p>
      )}
    </form>
  );
}