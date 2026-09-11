// CK Design Embroidery is based in Abu Dhabi, UAE — timestamps
// throughout the admin dashboard and customer account pages should
// always show in this timezone, regardless of where the code actually
// executes. Without this, a Server Component's `new Date().toLocaleString()`
// silently uses whatever timezone the server process happens to be
// running in (Vercel defaults to UTC), which can be many hours off
// from what staff and customers actually see on their clocks.
const SHOP_TIMEZONE = 'Asia/Dubai';
// Fixed +4:00, no daylight saving in the UAE — safe to hardcode rather
// than deriving it, and much simpler than pulling in a timezone
// library just for this one offset.
const SHOP_OFFSET_MS = 4 * 60 * 60 * 1000;

export function formatDateTime(input) {
  return new Date(input).toLocaleString('en-US', {
    timeZone: SHOP_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDate(input) {
  return new Date(input).toLocaleDateString('en-US', {
    timeZone: SHOP_TIMEZONE,
    dateStyle: 'medium',
  });
}

export function formatTime(input) {
  return new Date(input).toLocaleTimeString('en-US', {
    timeZone: SHOP_TIMEZONE,
    timeStyle: 'short',
  });
}

// Returns a Date object whose UTC getters (getUTCFullYear,
// getUTCMonth, getUTCDate, ...) read as the shop's actual Dubai
// wall-clock values, regardless of what timezone the server process
// itself is running in. Use this instead of plain `new Date()` /
// `.setHours(0,0,0,0)` whenever code needs to reason about "what day
// is it right now" or bucket timestamps into calendar days — e.g. the
// Sales page's day-by-day revenue chart. Using the server's own local
// midnight for that bucketing would put some sales in the wrong day
// whenever the server's timezone differs from Dubai's.
export function toShopTime(input) {
  const date = input ? new Date(input) : new Date();
  return new Date(date.getTime() + SHOP_OFFSET_MS);
}
