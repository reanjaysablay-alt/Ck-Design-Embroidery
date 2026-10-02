// Receipt numbers are derived from the payment record id, so they are
// unique, sequential and never need a second counter: OR-000042.
export function formatReceiptNo(id) {
  return `OR-${String(id).padStart(6, '0')}`;
}

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export function paymentModeLabel(value) {
  return PAYMENT_MODES.find((m) => m.value === value)?.label || value;
}

export function customerLabel(order) {
  return order?.shipping_address?.fullName || order?.customer_email || 'Customer';
}
