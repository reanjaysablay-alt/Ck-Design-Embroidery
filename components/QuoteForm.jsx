'use client';

import { useState } from 'react';

export default function QuoteForm() {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('sent');
      form.reset();
    } catch (err) {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-canvas2 border border-gold/30 rounded-sm p-10 text-center">
        <h2 className="font-display text-2xl text-thread mb-3">Request received</h2>
        <p className="text-thread/60">
          We'll follow up within one business day with pricing and next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Name" name="name" required />
        <Field label="Company" name="company" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
            Estimated quantity
          </label>
          <select
            name="quantity"
            className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
          >
            <option>12–49 pieces</option>
            <option>50–249 pieces</option>
            <option>250+ pieces</option>
            <option>Not sure yet</option>
          </select>
        </div>
        <Field label="Garment type(s)" name="garmentType" placeholder="Polos, hats, jackets…" />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
          Project details
        </label>
        <textarea
          name="details"
          rows={5}
          placeholder="Tell us about your logo, timeline, and anything else useful."
          className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Submit Request'}
      </button>

      {status === 'error' && (
        <p className="text-stitchRed text-sm">
          Something went wrong sending that — please try again or email us directly.
        </p>
      )}
    </form>
  );
}

function Field({ label, name, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread placeholder:text-thread/30 focus-visible:outline-gold"
      />
    </div>
  );
}
