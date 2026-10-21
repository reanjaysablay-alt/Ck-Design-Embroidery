import { readPin, isInsideUae } from '@/lib/uaeBounds';

// Store policy: we only sell to / deliver within the United Arab Emirates.
// Checked on the SERVER for every order route, so it can't be bypassed by
// editing the checkout page in the browser.
export const UAE_ONLY_ERROR =
  'Sorry, we currently only accept orders for delivery within the United Arab Emirates.';

export const PIN_OUTSIDE_UAE_ERROR =
  'The pinned location is outside the United Arab Emirates. Please drop the pin inside the UAE.';

export function isUaeAddress(address) {
  return !!address && address.countryCode === 'AE';
}

// If the customer dropped a map pin, it must be inside the UAE.
// No pin at all is fine (the typed address is used instead).
export function isPinInsideUae(address) {
  const pin = readPin(address);
  if (!pin) return true;
  return isInsideUae(pin.lat, pin.lng);
}
