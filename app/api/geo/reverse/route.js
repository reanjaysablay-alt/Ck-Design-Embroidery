import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isInsideUae } from '@/lib/uaeBounds';

// Turns a map pin (lat, lng) into address fields for the checkout form
// (OpenStreetMap / Nominatim reverse lookup, free, no key). Signed-in
// customers only, UAE pins only, results cached, and calls are spaced out
// to respect Nominatim's usage policy (max ~1 request per second).

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = `CKDesignEmbroidery-Checkout/1.0 (${process.env.NOMINATIM_EMAIL || 'shop address lookup'})`;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

// One lookup at a time, at least 1.1s apart.
let queue = Promise.resolve();
let lastCallAt = 0;
function throttled(task) {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + 1100 - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => {});
  return run;
}

const EMIRATE_BY_ISO = {
  'AE-AZ': 'Abu Dhabi',
  'AE-DU': 'Dubai',
  'AE-SH': 'Sharjah',
  'AE-AJ': 'Ajman',
  'AE-UQ': 'Umm Al Quwain',
  'AE-RK': 'Ras Al Khaimah',
  'AE-FU': 'Fujairah',
};

// The names the checkout dropdown uses.
const EMIRATES = Object.values(EMIRATE_BY_ISO);

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function pickEmirate(address) {
  const byIso = EMIRATE_BY_ISO[address['ISO3166-2-lvl4']] || EMIRATE_BY_ISO[address['ISO3166-2-lvl3']];
  if (byIso) return byIso;

  const state = norm(address.state || address.state_district || address.region);
  return EMIRATES.find((name) => state.includes(norm(name))) || '';
}

function first(...values) {
  return values.find((v) => typeof v === 'string' && v.trim())?.trim() || '';
}

function toFields(hit) {
  const a = hit?.address || {};

  const road = first(a.road, a.pedestrian, a.footway, a.path);
  const street = [first(a.house_number), road].filter(Boolean).join(' ');
  const area = first(a.neighbourhood, a.suburb, a.quarter, a.city_district);

  // Line 1: street + area, e.g. "Al Khaleej Al Arabi Street, Al Danah".
  const line1 = [street, area].filter(Boolean).join(', ') || first(hit?.name, area);

  // Line 2: a building / landmark name when the pin landed on one.
  const name = first(hit?.name, a.building);
  const line2 = name && name !== road && name !== line1 ? name : '';

  const emirate = pickEmirate(a);
  const city =
    first(a.city, a.town, a.village, a.municipality, a.county, a.city_district, a.suburb, a.state_district) ||
    emirate;

  return { line1, line2, city, emirate };
}

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideUae(lat, lng)) {
    return NextResponse.json({ error: 'Pin must be inside the United Arab Emirates.' }, { status: 400 });
  }

  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.value);
  }

  async function lookup(zoom) {
    const url = `${NOMINATIM_REVERSE}?format=jsonv2&addressdetails=1&zoom=${zoom}&lat=${lat}&lon=${lng}`;
    return throttled(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Nominatim ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    });
  }

  try {
    // Street level first. Empty spots (desert, new areas) have no street
    // nearby, so fall back to the wider area instead of returning nothing.
    let fields = toFields(await lookup(18));
    if (!fields.line1 && !fields.city) fields = toFields(await lookup(14));

    if (!fields.line1 && !fields.city && !fields.emirate) {
      return NextResponse.json({ status: 'unavailable' });
    }

    const value = { status: 'ok', ...fields };

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { value, at: Date.now() });

    return NextResponse.json(value);
  } catch (err) {
    console.error('Reverse geocode failed:', err.message);
    return NextResponse.json({ status: 'unavailable' });
  }
}
