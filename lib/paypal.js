const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
// Switch PAYPAL_BASE_URL to https://api-m.paypal.com in production env vars.

// ---------- Delivery config (all env-driven) ----------
const STORE_LAT = Number(process.env.STORE_LAT);
const STORE_LNG = Number(process.env.STORE_LNG);
const DELIVERY_MIN_FEE = Number(process.env.DELIVERY_MIN_FEE || 5); // minimum fee, in order currency
const DELIVERY_PER_KM = Number(process.env.DELIVERY_PER_KM || 0.5); // placeholder rate
const DELIVERY_MAX_KM = Number(process.env.DELIVERY_MAX_KM || 30);
const ROAD_FACTOR = Number(process.env.DELIVERY_ROAD_FACTOR || 1.3); // straight-line -> approx road distance
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // only needed for typed addresses

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

// ---------- Delivery fee ----------
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Accepts { lat, lng } (map pin) or { address } (typed, geocoded server-side).
async function resolveDestination(delivery) {
  if (delivery?.lat != null && delivery?.lng != null) {
    return { lat: Number(delivery.lat), lng: Number(delivery.lng) };
  }
  if (delivery?.address) {
    if (!GOOGLE_MAPS_API_KEY) throw new Error('Address lookup is not configured');
    const url =
      'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(delivery.address) +
      '&components=country:AE&key=' +
      GOOGLE_MAPS_API_KEY;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (data.status !== 'OK' || !loc) throw new Error('Could not find that address');
    return { lat: loc.lat, lng: loc.lng };
  }
  throw new Error('Delivery location required');
}

export async function computeDeliveryFee(delivery) {
  if (!Number.isFinite(STORE_LAT) || !Number.isFinite(STORE_LNG)) {
    throw new Error('Store location is not configured');
  }
  const dest = await resolveDestination(delivery);
  const km = distanceKm(STORE_LAT, STORE_LNG, dest.lat, dest.lng) * ROAD_FACTOR;
  if (!Number.isFinite(km)) throw new Error('Invalid delivery location');
  if (km > DELIVERY_MAX_KM) throw new Error('Outside delivery range');
  const fee = Math.max(DELIVERY_MIN_FEE, km * DELIVERY_PER_KM);
  return { fee: fromCents(toCents(fee)), km: Number(km.toFixed(1)) };
}

// Use this for a live fee preview in checkout (call from a /api/delivery-fee route).
export async function quoteDelivery(delivery) {
  return computeDeliveryFee(delivery);
}

// ---------- PayPal orders ----------
export async function createOrder({ items, currency, delivery }) {
  const accessToken = await getAccessToken();

  const itemTotal = computeTotal(items);
  const { fee } = delivery
    ? await computeDeliveryFee(delivery)
    : { fee: '0.00' };
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