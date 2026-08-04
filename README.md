# Stitchhouse — Embroidery Marketing Site + Shop

Next.js 14 (App Router) + Tailwind CSS + Supabase (auth & database) + PayPal
+ Gmail-sent order notifications.

## What this site does

- **Homepage** splitting into "For Businesses" (custom/bulk embroidery
  quotes) and "Shop" (retail products)
- **Shop** — products live in a Supabase database, not a static file, so
  admin edits show up immediately
- **Email + password sign-in** required before checkout. New accounts are
  created with a **one-time code (OTP) sent to the user's email** to verify
  the address, then they set a password and a nickname.
- **Checkout** — shipping address, then pay via **PayPal** or **Cash on
  Delivery**
- **Order approval workflow** — every order starts as `pending`. An admin
  accepts or declines it from `/admin/orders`:
  - **Accept** -> notifies the customer (in-app + email) that their order
    is being prepared
  - **Decline** -> notifies the customer (in-app + email), and
    automatically refunds them if they paid via PayPal
- **`/admin`** (restricted to emails in `ADMIN_EMAILS`) — add/edit/delete
  products, review and act on incoming orders, and customize the whole
  site (site title, tagline, hero text, and theme colors) from the
  **Settings** page. Admin accounts get the **admin dashboard only**:
  they're redirected to `/admin` after sign-in, blocked from `/account`,
  and see a minimal header with no storefront nav, cart, or customer links.
- **`/account`** — the signed-in customer's own order history with clear
  **pending / accepted / declined** status badges, plus a live
  **notifications** feed (bell icon with unread count in the header).
  Notifications appear in real time via Supabase Realtime the moment an
  admin accepts or declines an order.

None of this works out of the box — it needs a Supabase project, a PayPal
app, and a Gmail App Password. Follow the setup steps below in order; it's
about 30-40 minutes total, all clicking through dashboards, no code changes
required.

## 1. Set up Supabase (auth + database)

1. Create a free project at supabase.com.
2. In Project Settings -> API, copy the Project URL, the anon public
   key, and the service_role key (this last one is secret — it bypasses
   all database security rules, never expose it to the browser) — you'll
   need all three for `.env.local`.
3. Open SQL Editor -> New query, paste the contents of `db/schema.sql`,
   and run it. This creates the `products`, `orders`, `notifications`,
   `site_settings`, and `signup_verifications` tables with the correct
   security rules already applied. The `notifications` table powers the
   customer's live notification feed (added to the Supabase Realtime
   publication), `site_settings` powers the admin-editable site title, hero
   text, and theme colors (seeded with the current defaults), and
   `signup_verifications` stores the one-time codes used to verify new
   account emails before the account is created. The whole file is
   **safe to re-run** — every table, index, policy, and seed uses
   idempotent guards (`if not exists` / `drop policy if exists` /
   `on conflict do nothing`), so you can paste and run it again any
   time you pull an update that touches the schema.
4. Still in SQL Editor, paste and run `db/seed.sql` to populate the shop
   with 6 starter products (optional — skip it if you'd rather add
   products yourself via `/admin/products/new` once it's running).
5. Go to Authentication -> Providers -> Email, and enable **Email** sign-in
   (this powers the email/password login and registration). You can leave
   the "Confirm email" toggle off, because the app handles its own email
   verification with a one-time code sent via Gmail before the account is
   created.
6. In Authentication -> URL Configuration, set Site URL to
   `http://localhost:3000` for now (change to your real domain at launch).

## 2. Set the admin account

In `.env.local`, set:

```
ADMIN_EMAILS=adminacc0935@gmail.com
```

Comma-separate multiple addresses if more admins are needed later. When
someone signs up or logs in with one of those emails, they automatically
land on the **admin dashboard** after sign-in (they see the admin-only
header, not the storefront). Anyone else is redirected away from `/admin`.

## 4. Set up Gmail for order notification emails

Gmail won't accept your normal password here — it needs an App
Password, which requires 2-Step Verification. Note: `GMAIL_APP_PASSWORD`
must be the real 16-character Gmail App Password (no spaces), not your
normal Gmail password.

1. On the adminacc0935@gmail.com account, go to
   myaccount.google.com/security and turn on 2-Step Verification if it
   isn't already on.
2. Go to myaccount.google.com/apppasswords.
3. Create a new App Password (name it e.g. "Stitchhouse"). Google shows a
   16-character password — copy it.
4. In `.env.local`, set `GMAIL_APP_PASSWORD` to that value (not the real
   Gmail password), and `GMAIL_USER=adminacc0935@gmail.com`.

Worth knowing: a personal Gmail inbox works for getting started, but
Gmail's sending limits (~500/day) and spam-flagging risk on automated mail
mean it's worth moving to a dedicated transactional email service (Resend,
Postmark) before the store gets busy. That's a change contained entirely to
`lib/email.js` — nothing else in the app needs to change.

## 5. Set up PayPal

1. Log into the PayPal Developer Dashboard (developer.paypal.com/dashboard)
   with the client's PayPal Business account.
2. Under Apps & Credentials, use Sandbox while testing. Open (or
   create) an app to get a Client ID and Secret.
3. Note: a UAE PayPal Business account is receive-only and settles in
   USD — no AED balance. Checkout is set to charge in USD
   (`components/CheckoutClient.jsx`, `CURRENCY` constant). If the client
   wants AED pricing, that's a conversation to have with PayPal/the
   client first, not a code change.
4. When ready to go live: switch to Live credentials in the PayPal
   dashboard and update `PAYPAL_BASE_URL` to `https://api-m.paypal.com`.

## 6. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in every value from steps 1-5.

## Run it

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — log in with the admin email to be taken
straight to the admin dashboard. Log in with a regular account to shop and
see your order history + notifications at `/account`. New users create an
account with their email, get a one-time code sent to that email to verify
it, then set a password and a nickname.

## Pages

- `/` — homepage
- `/shop`, `/shop/[slug]` — product grid and detail (data from Supabase)
- `/cart`, `/checkout` — cart and checkout (checkout requires sign-in)
- `/login` — email/password log in + account registration (email → OTP →
  password + nickname)
- `/order/success` — confirmation after placing an order
- `/account` — signed-in user's order history (with pending/accepted/
  declined badges) and live notifications (bell icon in the header)
- `/services`, `/quote` — business/marketing side and quote request form
- `/about`, `/contact` — placeholder copy, swap in the real client content
- `/admin`, `/admin/products`, `/admin/products/new`,
  `/admin/products/[id]/edit`, `/admin/orders`,
  `/admin/settings` — admin-only (settings customizes the site title,
  hero text, and theme colors)

## What still needs attention before launch

1. Real product photos & copy. Swap the Unsplash placeholders for real
   product photography, either through `/admin/products` or by editing
   `db/seed.sql` before running it.

2. Inventory & stock levels. There's no stock tracking — every product
   is treated as always available. Add a `stock` column to `products` and
   decrement it in the order routes if the client needs real inventory
   management.

3. PayPal webhooks. The current flow trusts the client-side capture
   response. For production, also verify captures server-side via a
   PayPal webhook on `PAYMENT.CAPTURE.COMPLETED` as a safety net against
   spoofed requests.

4. Quote form destination. `/app/api/quote/route.js` currently just
   logs submissions server-side. Point it at the same email system
   (`lib/email.js`) or a CRM/Slack webhook so quote requests actually
   reach someone.

5. Content. `/about` and `/contact` have placeholder copy — swap in
   the client's real story, address, and contact details.

6. Domain fonts. The build fetches Fraunces, Inter, and Space Mono
   from Google Fonts at build time — needs normal internet access
   wherever you build/deploy (Vercel, Netlify, your own CI all have this
   by default).

## Deploying

This is a standard Next.js app — Vercel is the path of least resistance
(`vercel deploy`), but it runs anywhere Node is supported. Remember to set
every `.env.local` variable as environment variables in whatever hosting
platform you use — they don't deploy automatically from your local file.
#   C k - D e s i g n - E m b r o i d e r y  
 #   C k - D e s i g n - E m b r o i d e r y  
 