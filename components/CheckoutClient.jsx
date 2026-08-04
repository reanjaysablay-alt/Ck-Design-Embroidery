'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import { createClient } from '@/lib/supabase/client';

// UAE PayPal Business accounts are receive-only and settle in USD —
// there is no AED balance. Keep checkout in USD unless that changes.
const CURRENCY = 'USD';

// PayPal SDK endpoint. Sandbox credentials MUST use the sandbox SDK and
// live credentials the live SDK — mixing them causes the generic
// "PayPal checkout hit an error" failure. Set NEXT_PUBLIC_PAYPAL_ENV to
// 'live' (or unset) for production, and 'sandbox' while testing.
const PAYPAL_ENV = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const PAYPAL_SDK_URL =
  PAYPAL_ENV === 'live'
    ? 'https://www.paypal.com/sdk/js'
    : 'https://www.sandbox.paypal.com/sdk/js';

// Gets the signed-in user's Supabase access token. The PayPal payment
// popup opens in its own context, so we send this as a Bearer token to
// the server routes — they accept it instead of relying only on the
// cookie (which can be absent in some embedded/redirect scenarios).
async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export default function CheckoutClient({ user }) {
  const { items, subtotal } = useCart();
  const router = useRouter();
  const [method, setMethod] = useState('paypal'); // 'paypal' | 'cod'
  const [address, setAddress] = useState({
    fullName: user.user_metadata?.full_name || '',
    phone: '',
    line1: '',
    city: '',
    emirate: '',
    country: 'United Arab Emirates',
  });
  const [addressValid, setAddressValid] = useState(false);
  const [codSubmitting, setCodSubmitting] = useState(false);
  const [error, setError] = useState('');
  const paypalRef = useRef(null);
  const buttonsRendered = useRef(false);

  useEffect(() => {
    const required = ['fullName', 'phone', 'line1', 'city', 'emirate'];
    setAddressValid(required.every((k) => address[k].trim().length > 0));
  }, [address]);

  // Render PayPal buttons once the shipping address is valid.
  useEffect(() => {
    if (method !== 'paypal' || !addressValid || items.length === 0) return;
    if (buttonsRendered.current) return;

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) {
      setError('PayPal is not configured yet (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID).');
      return;
    }

    const script = document.createElement('script');
    script.src = `${PAYPAL_SDK_URL}?client-id=${clientId}&currency=${CURRENCY}`;
    script.async = true;
    script.onload = renderButtons;
    document.body.appendChild(script);

    function renderButtons() {
      if (!window.paypal || buttonsRendered.current) return;
      buttonsRendered.current = true;

      window.paypal
        .Buttons({
          createOrder: async () => {
            const token = await getAccessToken();
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ items, currency: CURRENCY }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not start PayPal checkout');
            return data.id;
          },
          onApprove: async (data) => {
            const token = await getAccessToken();
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ orderID: data.orderID, items, address }),
            });
            const result = await res.json();
            if (!res.ok) {
              setError(result.error || 'Payment could not be captured.');
              return;
            }
            router.push(`/order/success?order=${result.orderId}`);
          },
          onError: (err) => {
            // Surface the real reason instead of a generic message so the
            // cause (e.g. sandbox/live mismatch, invalid client id) is visible.
            const reason = err?.message || 'PayPal checkout hit an error — please try again.';
            setError(reason);
          },
        })
        .render(paypalRef.current);
    }

    return () => {
      document.body.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, addressValid, items.length]);

  async function handleCodSubmit() {
    setCodSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/orders/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, address }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not place order');
      router.push(`/order/success?order=${result.orderId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCodSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-thread mb-4">Your cart is empty</h1>
        <p className="text-thread/60">Add something from the shop before checking out.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <h1 className="font-display text-3xl text-thread mb-8">Checkout</h1>

        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Shipping address</h2>
        <div className="space-y-4 mb-10">
          <Field label="Full name" value={address.fullName} onChange={(v) => setAddress({ ...address, fullName: v })} />
          <Field label="Phone" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
          <Field label="Address" value={address.line1} onChange={(v) => setAddress({ ...address, line1: v })} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
            <Field label="Emirate" value={address.emirate} onChange={(v) => setAddress({ ...address, emirate: v })} />
          </div>
        </div>

        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Payment method</h2>
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              setMethod('paypal');
              buttonsRendered.current = false;
            }}
            className={`flex-1 border rounded-sm py-3 text-sm uppercase tracking-widest transition-colors ${
              method === 'paypal' ? 'border-gold text-gold' : 'border-white/20 text-thread/60'
            }`}
          >
            PayPal
          </button>
          <button
            onClick={() => setMethod('cod')}
            className={`flex-1 border rounded-sm py-3 text-sm uppercase tracking-widest transition-colors ${
              method === 'cod' ? 'border-gold text-gold' : 'border-white/20 text-thread/60'
            }`}
          >
            Cash on Delivery
          </button>
        </div>

        {!addressValid && (
          <p className="text-thread/40 text-sm mb-4">Fill in the shipping address above to continue.</p>
        )}

        {addressValid && method === 'paypal' && (
          <div ref={paypalRef} className="min-h-[45px]" />
        )}

        {addressValid && method === 'cod' && (
          <button
            onClick={handleCodSubmit}
            disabled={codSubmitting}
            className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60"
          >
            {codSubmitting ? 'Placing order…' : 'Place Order — Pay on Delivery'}
          </button>
        )}

        {error && <p className="text-stitchRed text-sm mt-4">{error}</p>}
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-widest text-gold mb-4">Order summary</h2>
        <div className="divide-y divide-white/10">
          {items.map((item) => (
            <div key={item.key} className="flex justify-between py-3 text-sm gap-4">
              <div className="text-thread/80">
                <div>
                  {item.name}
                  <span
                    className={`ml-2 text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 align-middle ${
                      item.type === 'custom'
                        ? 'border-gold text-gold'
                        : 'border-white/20 text-thread/50'
                    }`}
                  >
                    {item.type === 'custom' ? 'Custom' : 'Plain'}
                  </span>{' '}
                  {item.size && `(${item.size})`} × {item.qty}
                </div>
                {item.type === 'custom' && item.note && (
                  <div className="text-thread/50 text-xs mt-1 leading-relaxed">
                    <span className="font-mono uppercase tracking-widest text-thread/40">
                      Design note:
                    </span>{' '}
                    {item.note}
                  </div>
                )}
              </div>
              <span className="font-mono text-thread flex-shrink-0">
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-4 mt-2 border-t border-white/10">
          <span className="font-display text-lg text-thread">Total</span>
          <span className="font-mono text-lg text-thread">
            ${subtotal.toFixed(2)} {CURRENCY}
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
      />
    </div>
  );
}

