import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'staff_identity_name';
// 12 hours — roughly one shift. After this, the next person to touch
// the shared login (or the same person on a new day) has to identify
// themselves again, rather than the browser silently remembering
// forever.
const COOKIE_MAX_AGE = 60 * 60 * 12;

// Simple SHA-256, not a full password-hashing algorithm (bcrypt/argon2)
// — proportionate to what this protects. See the comment in
// db/schema.sql above the staff_profiles table for why.
export function hashPin(pin) {
  return crypto.createHash('sha256').update(`stitchhouse-staff-pin:${pin}`).digest('hex');
}

// The identity cookie is SIGNED (name.hmac). The cashier role is tied to
// a person's identity, so a plain-text cookie that anyone could edit in
// their browser's dev tools would let any staff member on the shared
// login pose as the cashier. With the signature, a forged or edited
// cookie simply reads as "not identified" and shows the gate again.
function signingSecret() {
  return (
    process.env.STAFF_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'stitchhouse-dev-only-secret'
  );
}

function sign(name) {
  return crypto.createHmac('sha256', signingSecret()).update(`staff-identity:${name}`).digest('hex');
}

export async function getStaffIdentityName() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const name = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);

  const expected = sign(name);
  if (signature.length !== expected.length) return null;
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  return valid ? name : null;
}

export async function setStaffIdentityCookie(name) {
  const store = await cookies();
  store.set(COOKIE_NAME, `${name}.${sign(name)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearStaffIdentityCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
