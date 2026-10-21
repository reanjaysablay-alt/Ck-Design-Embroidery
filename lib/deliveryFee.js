import { getSiteSettings } from '@/lib/settings';
import { parseRates, priceForKm } from '@/lib/deliveryPricing';
import { readPin, isInsideUae } from '@/lib/uaeBounds';

// Automatic delivery fee: real DRIVING distance from the shop to the
// customer's address, priced with the rates the admin sets in
// Admin -> Settings -> Delivery fee.
//
// Two distance providers, tried in this order:
//   1. Google Routes API  (only if GOOGLE_MAPS_API_KEY is set and working)
//   2. OpenStreetMap      (Nominatim geocoding + OSRM routing, free, no key)
//
// So the fee keeps working even when the Google key is rejected
// (PERMISSION_DENIED, billing problems, etc). Same exports and same
// return shape as before - no other file needs to change.
//
// MAP PIN: if the customer dropped a pin on the checkout map, the pin's
// exact coordinates are used as the destination (no address guessing at
// all). The pin must be inside the UAE.
//
// TIP: in Admin -> Settings, set the shop origin as "lat, lng"
// (e.g. 24.3300, 54.5000 - right-click your shop in Google Maps and copy
// the coordinates). That is the most accurate and skips one lookup.

const GOOGLE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// Nominatim's usage policy requires a descriptive User-Agent.
const USER_AGENT = `CKDesignEmbroidery-Checkout/1.0 (${process.env.NOMINATIM_EMAIL || 'shop delivery fee lookup'})`;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // same route -> same distance
const CACHE_MAX = 500;
const routeCache = new Map();
const geoCache = new Map();

// If Google rejects the key (400/401/403) don't retry it on every
// checkout - skip straight to OpenStreetMap for a while.
const GOOGLE_RETRY_AFTER_MS = 10 * 60 * 1000;
let googleBlockedUntil = 0;

export const DELIVERY_QUOTE_ERROR =
  "We couldn't calculate the delivery fee for this address. Please check the address, or choose Cash on Delivery.";

// ---------------------------------------------------------------- helpers

function cacheGet(map, key) {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  return undefined;
}

function cacheSet(map, key, value) {
  if (map.size >= CACHE_MAX) map.delete(map.keys().next().value);
  map.set(key, { value, at: Date.now() });
}

async function fetchJson(url, options = {}, label = 'request', timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300);
      console.error(`${label} error`, res.status, body);
      return { ok: false, status: res.status, data: null };
    }
    return { ok: true, status: res.status, data: await res.json() };
  } catch (err) {
    console.error(`${label} failed:`, err.message);
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// "24.33, 54.50" -> { lat, lng }, anything else -> null
function parseLatLng(text) {
  const m = String(text).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function clean(parts) {
  return parts
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim());
}

// The customer's address as one line Google can find.
function destinationText(address) {
  return clean([
    address.line1,
    address.line2,
    address.city,
    address.emirate,
    address.postalCode,
    'United Arab Emirates',
  ]).join(', ');
}

// Address lookups for OpenStreetMap, most specific first. OSM is pickier
// than Google, so we fall back to simpler versions of the address.
function destinationCandidates(address) {
  const uae = 'United Arab Emirates';
  const list = [
    { text: clean([address.line1, address.line2, address.city, address.emirate, uae]).join(', '), approx: false },
    { text: clean([address.line1, address.city, address.emirate, uae]).join(', '), approx: false },
    // Only try the second address line on its own if there is one,
    // otherwise this would silently become a city-only lookup.
    ...(address.line2?.trim()
      ? [{ text: clean([address.line2, address.city, address.emirate, uae]).join(', '), approx: false }]
      : []),
    // City / area only: less exact, so the quote is flagged "approx".
    { text: clean([address.city, address.emirate, uae]).join(', '), approx: true },
  ];
  const seen = new Set();
  return list.filter((c) => {
    if (!c.text || !address.city?.trim() || seen.has(c.text.toLowerCase())) return false;
    seen.add(c.text.toLowerCase());
    return true;
  });
}

// ----------------------------------------------------------------- Google

function waypoint(text) {
  const ll = parseLatLng(text);
  if (ll) return { location: { latLng: { latitude: ll.lat, longitude: ll.lng } } };
  return { address: String(text) };
}

async function googleDistance(origin, destination) {
  if (!process.env.GOOGLE_MAPS_API_KEY) return null;
  if (Date.now() < googleBlockedUntil) return null;

  const { ok, status, data } = await fetchJson(
    GOOGLE_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: waypoint(origin),
        destination: waypoint(destination),
        travelMode: 'DRIVE',
        regionCode: 'AE',
        units: 'METRIC',
      }),
    },
    'Google Routes API'
  );

  if (!ok) {
    // Key / permission / billing problem -> stop trying for a while and
    // use OpenStreetMap instead.
    if ([400, 401, 403].includes(status)) {
      googleBlockedUntil = Date.now() + GOOGLE_RETRY_AFTER_MS;
      console.error('Google Routes key rejected - using OpenStreetMap fallback for 10 minutes.');
    }
    return null;
  }

  const route = data?.routes?.[0];
  const meters = Number(route?.distanceMeters);
  if (!Number.isFinite(meters)) return null;

  const seconds = parseInt(String(route.duration || '').replace('s', ''), 10);
  return {
    km: Math.round(meters / 100) / 10,
    minutes: Number.isFinite(seconds) ? Math.round(seconds / 60) : null,
  };
}

// ---------------------------------------------------------- OpenStreetMap

async function geocode(text) {
  const ll = parseLatLng(text);
  if (ll) return ll;

  const key = String(text).toLowerCase();
  const cached = cacheGet(geoCache, key);
  if (cached !== undefined) return cached;

  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=ae&q=${encodeURIComponent(text)}`;
  const { ok, data } = await fetchJson(
    url,
    { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } },
    'Nominatim'
  );
  if (!ok) return null; // network/server problem: don't cache it

  const hit = Array.isArray(data) ? data[0] : null;
  const point = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  const valid = point && Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null;
  cacheSet(geoCache, key, valid);
  return valid;
}

async function osrmDistance(from, to) {
  const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  const { ok, data } = await fetchJson(url, { headers: { 'User-Agent': USER_AGENT } }, 'OSRM');
  if (!ok || data?.code !== 'Ok') return null;

  const route = data.routes?.[0];
  const meters = Number(route?.distance);
  if (!Number.isFinite(meters)) return null;

  const seconds = Number(route.duration);
  return {
    km: Math.round(meters / 100) / 10,
    minutes: Number.isFinite(seconds) ? Math.round(seconds / 60) : null,
  };
}

async function osmDistance(origin, address) {
  const from = await geocode(origin);
  if (!from) {
    console.error('OpenStreetMap could not find the shop origin:', origin);
    return null;
  }

  for (const candidate of destinationCandidates(address)) {
    const to = await geocode(candidate.text);
    if (!to) continue;
    const route = await osrmDistance(from, to);
    if (route) return { ...route, approx: candidate.approx };
  }
  return null;
}

// Same as osmDistance, but the destination is an exact map pin, so there
// is nothing to look up or guess for the customer side.
async function osmPinDistance(origin, pin) {
  const from = await geocode(origin);
  if (!from) {
    console.error('OpenStreetMap could not find the shop origin:', origin);
    return null;
  }
  const route = await osrmDistance(from, { lat: pin.lat, lng: pin.lng });
  return route ? { ...route, approx: false } : null;
}

// ------------------------------------------------------------ main entry

async function drivingDistance(origin, address) {
  // A pin dropped on the map beats any typed address.
  const pin = readPin(address);
  const pinned = !!pin;
  const destination = pinned
    ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
    : destinationText(address);

  const cacheKey = `${origin}|${destination}`.toLowerCase();
  const cached = cacheGet(routeCache, cacheKey);
  if (cached) return cached;

  let result = null;

  const google = await googleDistance(origin, destination);
  if (google) result = { ...google, approx: false, source: 'google' };

  if (!result) {
    const osm = pinned
      ? await osmPinDistance(origin, pin)
      : await osmDistance(origin, address);
    if (osm) result = { ...osm, source: 'osm' };
  }

  if (result) {
    result = { ...result, pinned };
    cacheSet(routeCache, cacheKey, result);
  }
  return result;
}

// Returns one of:
//   { status: 'ok', mode: 'off', fee: 0 }                        feature off / not a UAE address
//   { status: 'ok', mode: 'auto', fee, km, minutes, free, ... }  fee worked out from driving distance
//   { status: 'unavailable', reason }                            no route could be found for that address
export async function getDeliveryQuote({ address, itemsTotal = 0 }) {
  const settings = await getSiteSettings();

  // Switch it off from Admin -> Settings (delivery_auto_enabled = false).
  // A missing Google key no longer turns it off: OpenStreetMap covers it.
  if (settings.delivery_auto_enabled === 'false') {
    return { status: 'ok', mode: 'off', fee: 0 };
  }

  // Only UAE addresses are priced automatically.
  if (!address || address.countryCode !== 'AE') {
    return { status: 'ok', mode: 'off', fee: 0 };
  }

  // A dropped pin must be inside the UAE (the checkout map enforces this
  // too, but the server never trusts the browser).
  const pin = readPin(address);
  if (pin && !isInsideUae(pin.lat, pin.lng)) {
    return { status: 'unavailable', reason: 'pin_outside_uae' };
  }

  if (!address.line1?.trim() || !address.city?.trim()) {
    return { status: 'unavailable', reason: 'incomplete_address' };
  }

  const origin = settings.delivery_origin?.trim() || 'CK Design Embroidery, Shabiya 10, Abu Dhabi, UAE';
  const route = await drivingDistance(origin, address);

  // A UAE trip is never 0 km nor more than ~700 km - anything else means
  // the wrong place was matched, so don't charge on a bad guess.
  if (!route || route.km < 0.1 || route.km > 700) {
    return { status: 'unavailable', reason: 'lookup_failed' };
  }

  const rates = parseRates(settings);
  const free = rates.freeOver > 0 && Number(itemsTotal) >= rates.freeOver;
  const fee = free ? 0 : priceForKm(route.km, rates);

  return {
    status: 'ok',
    mode: 'auto',
    fee,
    km: route.km,
    minutes: route.minutes,
    free,
    approx: route.approx,
    source: route.source,
    pinned: !!route.pinned,
  };
}
