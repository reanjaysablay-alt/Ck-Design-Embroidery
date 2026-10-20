// Store policy: we only sell to / deliver within the United Arab Emirates.
// Checked on the SERVER for every order route, so it can't be bypassed by
// editing the checkout page in the browser.
export const UAE_ONLY_ERROR =
  'Sorry, we currently only accept orders for delivery within the United Arab Emirates.';

export function isUaeAddress(address) {
  return !!address && address.countryCode === 'AE';
}
