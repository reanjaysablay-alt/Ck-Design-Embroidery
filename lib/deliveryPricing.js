// Pure delivery-pricing maths. No imports, so it is safe to use in the
// browser (admin settings preview) AND on the server (the real charge).

export const DELIVERY_DEFAULTS = {
  base: 10, // flat starting fee
  perKm: 0.3, // added for every km of driving distance
  min: 10, // never charge less than this
  max: 0, // 0 = no upper limit
  freeOver: 0, // 0 = never free; otherwise free when items total >= this
};

// Turns the saved (string) site settings into clean numbers, falling back
// to the defaults for anything missing or invalid.
export function parseRates(settings = {}) {
  const num = (value, fallback) => {
    const n = Number(value);
    return value !== '' && value != null && Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    base: num(settings.delivery_base_fee, DELIVERY_DEFAULTS.base),
    perKm: num(settings.delivery_per_km, DELIVERY_DEFAULTS.perKm),
    min: num(settings.delivery_min_fee, DELIVERY_DEFAULTS.min),
    max: num(settings.delivery_max_fee, DELIVERY_DEFAULTS.max),
    freeOver: num(settings.delivery_free_over, DELIVERY_DEFAULTS.freeOver),
  };
}

// fee = base + perKm x km, raised to the minimum, capped at the maximum
// (if one is set), then rounded UP to a whole dirham.
export function priceForKm(km, rates) {
  const { base, perKm, min, max } = { ...DELIVERY_DEFAULTS, ...rates };
  let fee = Number(base) + Number(perKm) * Number(km);
  fee = Math.max(fee, Number(min) || 0);
  if (Number(max) > 0) fee = Math.min(fee, Number(max));
  return Math.ceil(fee - 1e-9);
}
