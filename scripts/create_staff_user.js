#!/usr/bin/env node
/**
 * scripts/create_staff_user.js
 *
 * Simple Node script to provision a Supabase auth user using the
 * Service Role Key. Intended to be run locally (server-only credentials)
 * Example:
 *   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_key node scripts/create_staff_user.js staffacc020935@gmail.com "P@ssw0rd!"
 *
 * If you omit the password the script will generate one and print it.
 *
 * SECURITY: Do NOT commit your real service role key into the repository.
 */

const [,, emailArg, passwordArg] = process.argv;

if (!emailArg) {
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create_staff_user.js <email> [password]');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
  process.exit(1);
}

const email = String(emailArg).trim().toLowerCase();
const password = passwordArg || generatePassword();

async function main() {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`;
  const body = {
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'staff' }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }

  if (!res.ok) {
    console.error('Failed to create user:', res.status, res.statusText);
    console.error(data);
    process.exit(2);
  }

  console.log('User created successfully.');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log('\nNext steps:');
  console.log('- Add the staff email to STAFF_EMAILS in your .env.local or platform env (comma-separated).');
  console.log("  e.g. STAFF_EMAILS=adminacc0935@gmail.com,staffacc020935@gmail.com");
  console.log('- Restart your Next.js server so the new STAFF_EMAILS value is picked up.');
}

function generatePassword(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let out = '';
  const rnd = cryptoRandomBytes(length);
  for (let i = 0; i < length; i++) {
    out += chars[rnd[i] % chars.length];
  }
  return out;
}

function cryptoRandomBytes(n) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    return arr;
  }
  // Node.js fallback
  try {
    const { randomFillSync } = require('crypto');
    const buf = Buffer.allocUnsafe(n);
    randomFillSync(buf);
    return buf;
  } catch (e) {
    // last resort - insecure
    const buf = Buffer.alloc(n);
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
    return buf;
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(99);
});
