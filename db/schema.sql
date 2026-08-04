-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- after creating your project.

create table if not exists public.products (
  id bigint generated always as identity primary key,
  slug text unique not null,
  name text not null,
  price numeric(10, 2) not null,
  category text,
  image text,
  description text,
  stitch_count text,
  threads text[],
  sizes text[],
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone (including signed-out visitors) can read the product catalog.
-- The drop-if-exists guard makes this whole file safe to re-run (which
-- is needed if you ran an earlier version of this schema before).
drop policy if exists "Public can view products" on public.products;
create policy "Public can view products"
  on public.products for select
  using (true);

-- No insert/update/delete policy is defined for products, on purpose.
-- Admin writes go through server actions using the service role key
-- (see lib/supabase/server.js createAdminClient), which bypasses RLS
-- after the server independently verifies the request is from an
-- admin email. Regular signed-in users can never write to this table
-- directly, no matter what the client sends.

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text,
  items jsonb not null,
  total numeric(10, 2) not null,
  currency text not null default 'USD',
  payment_method text not null check (payment_method in ('paypal', 'cod')),
  payment_status text not null default 'pending',
  order_status text not null default 'pending' check (order_status in ('pending', 'accepted', 'declined')),
  paypal_order_id text,
  paypal_capture_id text,
  shipping_address jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Users can see only their own orders.
drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Users can only create orders under their own account, and only via the
-- server-side API routes (which authenticate the request first).
drop policy if exists "Users can insert their own orders" on public.orders;
create policy "Users can insert their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for regular users — order_status changes
-- (accept/decline) go through admin server actions using the service
-- role key, same reasoning as the products table above.

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(order_status);

-- Customer notifications — created by admin server actions when an
-- order is accepted or declined, shown on the customer's account page.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Users can read only their own notifications.
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can mark their own notifications as read.
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert/delete policy — notifications are created by admin server
-- actions via the service role key, same reasoning as products/orders.

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);

-- Email verification codes for the signup flow. Unlike otp_codes (which
-- are tied to an existing auth user), these are keyed by the email only,
-- because the user doesn't exist in Supabase auth yet when they request
-- a signup code. A row is created when a code is sent and marked verified
-- when the user enters the correct code. Idempotent — safe to re-run.
create table if not exists public.signup_verifications (
  id bigint generated always as identity primary key,
  email text not null,
code text not null,
  purpose text not null default 'signup' check (purpose in ('signup', 'reset', 'login')),
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.signup_verifications enable row level security;

-- No RLS policies are needed for reads/writes — signup codes are created,
-- verified, and consumed by server-side API routes using the service
-- role key (bypasses RLS). Regular users never touch this table directly.

create index if not exists signup_verifications_email_idx on public.signup_verifications(email);

-- Ensure the check constraint allows the 'login' purpose (for email
-- verification on login). Idempotent — safe to re-run even if the table
-- was created by an earlier version of this schema.
do $$
begin
  alter table public.signup_verifications
    drop constraint if exists signup_verifications_purpose_check;
  alter table public.signup_verifications
    add constraint signup_verifications_purpose_check
    check (purpose in ('signup', 'reset', 'login'));
end $$;

-- Turn on realtime for notifications so customers see new ones appear
-- live on their account page without a manual refresh. Idempotent — it
-- won't error if the schema is re-run.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- Site-wide settings editable from /admin/settings (site title, tagline,
-- hero copy, and theme colors). Public read so the site can render them;
-- writes go through admin server actions via the service role key.
create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Anyone can read settings (the public storefront needs them to render).
drop policy if exists "Public can view site settings" on public.site_settings;
create policy "Public can view site settings"
  on public.site_settings for select
  using (true);

-- No insert/update/delete policy — admin server actions use the service
-- role key, same reasoning as products/orders/notifications.

-- Seed with the current defaults so the site renders correctly even
-- before anyone visits /admin/settings.
insert into public.site_settings (key, value) values
  ('site_title', 'CK Design Embroidery'),
  ('site_tagline', 'Custom Embroidery & Shop'),
  ('hero_heading', 'Every logo, stitched to hold.'),
  ('hero_subheading', 'We run custom embroidery for businesses who need uniforms, merch, and branded gear done right — and stock a small shop of ready-made embroidered pieces stitched right here in-house.'),
  ('color_canvas', '#000000'),
  ('color_canvas2', '#111111'),
  ('color_thread', '#F4EFE3'),
  ('color_gold', '#D4A537'),
  ('color_linen', '#EFE7D8'),
  ('color_linen2', '#E4D9C4'),
  ('color_ink', '#1C1811'),
  ('color_stitchRed', '#A73B3B'),
  ('title_font', 'fraunces'),
  ('tagline_font', 'fraunces'),
  ('heading_font', 'fraunces')
on conflict (key) do nothing;

-- One-time passcodes (OTP) emailed to a signed-in user before they can
-- place an order. The row is created when a code is sent, marked verified
-- when the user enters the correct code, and consumed (used=true) when an
-- order is actually placed. Idempotent — safe to re-run.
create table if not exists public.otp_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code text not null,
  purpose text not null default 'order' check (purpose in ('order')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.otp_codes enable row level security;

-- No RLS policies are needed for reads/writes — OTP codes are created,
-- verified, and consumed by server-side API routes using the service
-- role key (bypasses RLS). Regular users never touch this table directly.

create index if not exists otp_codes_user_id_idx on public.otp_codes(user_id);
create index if not exists otp_codes_email_idx on public.otp_codes(email);

-- Storage bucket for product images uploaded from the admin dashboard.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Anyone can view product images (needed for the shop to display them).
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Contact inquiries, feedback, and ratings from customers.
-- Admin reads these via the service role key; no RLS policies needed
-- for reads since admin server actions bypass RLS entirely.
create table if not exists public.contact_inquiries (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text,
  type text not null default 'message' check (type in ('message', 'feedback', 'rating', 'quote')),
  subject text,
  message text not null,
  rating integer check (rating >= 1 and rating <= 5),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- No insert/update/delete policy for this bucket, on purpose — uploads
-- go through the admin server action using the service role key, same
-- reasoning as the products and orders tables above.

