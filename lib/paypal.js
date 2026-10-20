const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
// Switch PAYPAL_BASE_URL to https://api-m.paypal.com in production env vars.

export async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Could not authenticate with PayPal');
  const data = await res.json();
  return data.access_token;
}

// ---------- Money helpers (work in cents to avoid float errors) ----------
const toCents = (n) => Math.round(Number(n) * 100);
const fromCents = (c) => (c / 100).toFixed(2);

// Recompute the item total server-side from known product prices —
// never trust a total sent from the browser.
export function computeTotal(items) {
  const cents = items.reduce(
    (sum, item) => sum + toCents(item.price) * Number(item.qty),
    0
  );
  return fromCents(cents);
}

// ---------- PayPal orders ----------
// `deliveryFee` is worked out by the caller (lib/deliveryFee.js) and is
// charged as PayPal's "shipping" line on top of the item total.
export async function createOrder({ items, currency, deliveryFee = 0 }) {
  const accessToken = await getAccessToken();

  const itemTotal = computeTotal(items);
  const fee = fromCents(toCents(deliveryFee));
  const total = fromCents(toCents(itemTotal) + toCents(fee));

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: total,
            breakdown: {
              item_total: { currency_code: currency, value: itemTotal },
              shipping: { currency_code: currency, value: fee },
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PayPal create-order failed: ${detail}`);
  }
  return res.json();
}

// Reads an existing PayPal order (used to confirm the amount the customer
// is about to pay before we capture it).
export async function getOrder(orderID) {
  const accessToken = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Could not look up the PayPal order');
  return res.json();
}

export async function captureOrder(orderID) {
  const accessToken = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PayPal capture failed: ${detail}`);
  }
  return res.json();
}

// Pulls the capture ID out of a capture response — needed later to
// issue a refund if an admin declines a paid order.
export function extractCaptureId(captureResponse) {
  return captureResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
}

export async function refundCapture(captureId) {
  const accessToken = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}), // empty body = full refund
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PayPal refund failed: ${detail}`);
  }
  return res.json();
}