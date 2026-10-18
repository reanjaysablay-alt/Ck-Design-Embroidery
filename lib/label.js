// Maps an order row to the fields printed on the shipping label.
// If your orders table uses different column names, edit ONLY this file.

const NAME_KEYS = [
  'shipping_name', 'recipient_name', 'receiver_name', 'customer_name', 'buyer_name',
  'full_name', 'fullname', 'contact_name', 'name',
];
const PHONE_KEYS = [
  'shipping_phone', 'recipient_phone', 'receiver_phone', 'customer_phone', 'buyer_phone',
  'phone', 'phone_number', 'contact_number', 'contact_no', 'mobile', 'mobile_number', 'contact',
];
const ADDRESS_KEYS = [
  'shipping_address', 'delivery_address', 'customer_address', 'full_address',
  'address', 'address_line', 'address_line1', 'street_address',
];
// Used to build an address when it is stored in pieces.
const ADDRESS_PARTS = [
  ['address_line1', 'address_line_1', 'street', 'street_address', 'line1'],
  ['address_line2', 'address_line_2', 'line2', 'unit', 'building'],
  ['barangay', 'area', 'district', 'neighborhood'],
  ['city', 'municipality', 'town', 'emirate'],
  ['province', 'state', 'region'],
  ['postal_code', 'zip', 'zip_code', 'postcode'],
  ['country'],
];
// Columns that may hold the customer details as an object or JSON string.
const NESTED_KEYS = [
  'shipping', 'shipping_info', 'shipping_details', 'shipping_address',
  'delivery', 'delivery_info', 'delivery_details', 'customer', 'customer_info',
  'contact', 'recipient', 'buyer', 'address',
];

function asObject(v) {
  if (!v) return null;
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().startsWith('{')) {
    try {
      const o = JSON.parse(v);
      return o && typeof o === 'object' ? o : null;
    } catch {
      return null;
    }
  }
  return null;
}

function text(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return '';
  return String(v).trim();
}

export function getLabelData(order) {
  const o = order || {};

  // The order row first, then any nested objects/JSON columns.
  const sources = [o];
  for (const k of NESTED_KEYS) {
    const obj = asObject(o[k]);
    if (obj) sources.push(obj);
  }

  const pick = (keys) => {
    for (const src of sources) {
      for (const k of keys) {
        const v = text(src[k]);
        if (v) return v;
      }
    }
    return '';
  };

  // Last resort: any column on the order whose name looks right.
  const fuzzy = (include, exclude) => {
    for (const src of sources) {
      for (const [k, v] of Object.entries(src)) {
        const key = k.toLowerCase();
        if (include.test(key) && !exclude.test(key) && text(v)) return text(v);
      }
    }
    return '';
  };

  const customerName =
    pick(NAME_KEYS) ||
    [pick(['first_name', 'firstname']), pick(['last_name', 'lastname'])].filter(Boolean).join(' ') ||
    fuzzy(/name/, /product|item|shop|file|design|rider|delivery_user|title|business|company/);

  const phone =
    pick(PHONE_KEYS) || fuzzy(/phone|mobile|contact_?(no|num)/, /shop|rider/);

  let address = pick(ADDRESS_KEYS);
  if (!address) {
    const parts = ADDRESS_PARTS.map((keys) => pick(keys)).filter(Boolean);
    address = parts.join(', ');
  }
  if (!address) address = fuzzy(/address|street/, /email|ip_|shop|sender|billing/);

  return {
    id: o.id,
    shortId: String(o.id ?? '').slice(0, 8).toUpperCase(),
    customerName,
    phone,
    address,
    payment: o.payment_method === 'cod' ? 'COD' : 'PAID',
    // Kept for other pages; the label no longer prints an amount.
    codAmount:
      o.payment_method === 'cod'
        ? Number(o.total_amount ?? o.total ?? 0) + Number(o.delivery_fee || 0)
        : 0,
    item: pick(['product_name', 'item_name', 'title']),
    notes: pick(['notes', 'note']),
    // "From" block (set these in .env.local)
    shopName: process.env.SHOP_NAME || 'CK Design Embroidery',
    shopAddress: process.env.SHOP_ADDRESS || '',
    shopPhone: process.env.SHOP_PHONE || '',
  };
}