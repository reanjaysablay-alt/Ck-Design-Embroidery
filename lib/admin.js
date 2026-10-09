// Full admins — comma-separated in ADMIN_EMAILS. Full access: products,
// settings, orders, inquiries, everything.
export function isAdminEmail(email) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Staff — comma-separated in STAFF_EMAILS. Day-to-day access only:
// orders and inquiries. No product catalog or site settings access.
export function isStaffEmail(email) {
  if (!email) return false;
  const list = (process.env.STAFF_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Comma-separated list of staff emails — used to show the "expected"
// staff roster before/alongside whoever has actually signed up.
export function getStaffEmailList() {
  return (process.env.STAFF_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
export function canAccessAdmin(email) {
  return isAdminEmail(email) || isStaffEmail(email);
}

// 'admin' | 'staff' | null — used to decide what to render/allow.
// Admin takes priority if an email is (incorrectly) listed in both.
export function getAdminRole(email) {
  if (isAdminEmail(email)) return 'admin';
  if (isStaffEmail(email)) return 'staff';
  return null;
}

// Delivery staff — comma-separated in DELIVERY_EMAILS. Used by
// requireDelivery() in lib/delivery.js.
export function isDeliveryEmail(email) {
  if (!email) return false;
  const list = (process.env.DELIVERY_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Rider = account with app_metadata.role === 'delivery' (set in Supabase),
// or an email listed in DELIVERY_EMAILS. Pass the full Supabase user object.
export function isDeliveryUser(user) {
  if (!user) return false;
  return user.app_metadata?.role === 'delivery' || isDeliveryEmail(user.email);
}