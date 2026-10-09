// Shared by server actions and client components. No 'use client' / 'use server' here.

export const STAGES = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'delivered', label: 'Delivered' },
];

// Which timestamp column is stamped when an order enters a stage.
export const STAGE_TIME_COLUMN = {
  accepted: 'delivery_accepted_at',
  picked_up: 'delivery_picked_up_at',
  out_for_delivery: 'delivery_out_at',
  arrived: 'delivery_arrived_at',
  delivered: 'delivered_at',
};

// target stage -> stages it may come from
export const ALLOWED_FROM = {
  picked_up: ['accepted'],
  out_for_delivery: ['picked_up', 'failed'],
  arrived: ['out_for_delivery'],
};

// current stage -> the rider's next button
export const NEXT_STEP = {
  accepted: { to: 'picked_up', label: 'Mark as picked up' },
  picked_up: { to: 'out_for_delivery', label: 'Start delivery' },
  out_for_delivery: { to: 'arrived', label: "I've arrived" },
  failed: { to: 'out_for_delivery', label: 'Retry delivery' },
};

export const FAIL_REASONS = [
  'Customer not available',
  'Customer cannot be reached',
  'Wrong or incomplete address',
  'Customer refused the order',
  'Customer cannot pay the COD amount',
  'Other',
];

export function money(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Older orders accepted before the migration have no delivery_stage.
export function getStage(order) {
  if (order.delivery_stage) return order.delivery_stage;
  if (order.order_status === 'completed') return 'delivered';
  return 'accepted';
}

export function codDue(order) {
  return Number(order.cod_amount || order.total_amount || 0);
}

// Uses exact coordinates when the order has them, otherwise the typed address.
export function destinationQuery(order) {
  if (order.shipping_lat != null && order.shipping_lng != null) {
    return `${order.shipping_lat},${order.shipping_lng}`;
  }
  return order.shipping_address || '';
}

export function mapEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

export function googleMapsUrl(query) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`;
}

export function wazeUrl(query) {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

export function cleanPhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isToday(value) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}
