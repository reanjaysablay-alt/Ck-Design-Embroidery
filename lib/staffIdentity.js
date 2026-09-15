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

export async function getStaffIdentityName() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value || null;
}

export async function setStaffIdentityCookie(name) {
  const store = await cookies();
  store.set(COOKIE_NAME, name, {
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
