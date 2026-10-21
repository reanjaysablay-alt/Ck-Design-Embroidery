// Receipt numbers are derived from the payment record id, so they are
// unique, sequential and never need a second counter: OR-000042.
export function formatReceiptNo(id) {
  return `OR-${String(id).padStart(6, '0')}`;
}

// What the cashier can choose for a walk-in payment.
export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
];

// Older receipts may still carry a mode that is no longer offered, so keep
// their labels readable.
const LEGACY_MODE_LABELS = {
  gcash: 'GCash',
  card: 'Card',
  other: 'Other',
};

export function paymentModeLabel(value) {
  return (
    PAYMENT_MODES.find((m) => m.value === value)?.label ||
    LEGACY_MODE_LABELS[value] ||
    value
  );
}

export function customerLabel(order) {
  return order?.shipping_address?.fullName || order?.customer_email || 'Customer';
}
