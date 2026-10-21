// Rough outline of the United Arab Emirates (lat, lng), drawn slightly
// generous (a few km of sea / border margin) so no real UAE address is ever
// rejected. Used by BOTH the checkout map (to block pins outside the UAE)
// and the server (so the check can't be bypassed from the browser).
// No imports, so it is safe to use anywhere.

const UAE_POLYGON = [
  [24.3, 51.5],
  [25.4, 52.9],
  [25.55, 54.7],
  [26.1, 55.6],
  [26.25, 56.2],
  [25.2, 56.5],
  [24.5, 56.0],
  [23.6, 55.9],
  [22.6, 55.3],
  [22.55, 52.0],
];

// Map view limits (south-west and north-east corners) so customers can't
// even scroll the checkout map away from the UAE.
export const UAE_MAP_BOUNDS = [
  [22.4, 51.3],
  [26.4, 56.7],
];

export const UAE_MAP_CENTER = { lat: 24.45, lng: 54.4 }; // Abu Dhabi

// Where the map opens when the customer has picked an emirate.
export const EMIRATE_CENTERS = {
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  Sharjah: { lat: 25.3463, lng: 55.4209 },
  Ajman: { lat: 25.4052, lng: 55.5136 },
  'Umm Al Quwain': { lat: 25.5647, lng: 55.5552 },
  'Ras Al Khaimah': { lat: 25.7895, lng: 55.9432 },
  Fujairah: { lat: 25.1288, lng: 56.3265 },
};

// Reads latitude/longitude from an address object. Returns { lat, lng }
// for two real numbers, otherwise null.
export function readPin(address) {
  if (!address) return null;
  const lat = Number(address.lat);
  const lng = Number(address.lng);
  if (address.lat == null || address.lng == null) return null;
  if (address.lat === '' || address.lng === '') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// Ray-casting point-in-polygon test.
export function isInsideUae(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  let inside = false;
  for (let i = 0, j = UAE_POLYGON.length - 1; i < UAE_POLYGON.length; j = i++) {
    const [yi, xi] = UAE_POLYGON[i];
    const [yj, xj] = UAE_POLYGON[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
