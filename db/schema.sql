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
  in_stock boolean not null default true,
  -- Per-size stock quantities, e.g. {"S": 10, "M": 15, "L": 0}. Null
  -- means stock isn't tracked per-size for this product (falls back
  -- to the plain in_stock boolean above) — used for products with no
  -- sizes at all.
  stock jsonb,
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
  -- on delete set null (not cascade): if a customer deletes their
  -- account, we keep the order as a business record — it already has
  -- its own copy of customer_email/shipping_address — we just detach
  -- it from the now-deleted login. Only the account login is gone.
  user_id uuid references auth.users(id) on delete set null,
  customer_email text,
  items jsonb not null,
  total numeric(10, 2) not null,
  currency text not null default 'USD',
  payment_method text not null check (payment_method in ('paypal', 'cod', 'walkin')),
  payment_status text not null default 'pending',
  order_status text not null default 'pending' check (order_status in (
    'pending', 'to_ship', 'to_receive', 'completed', 'canceled',
    'preparing', 'ready_for_pickup', 'picked_up'
  )),
  paypal_order_id text,
  paypal_capture_id text,
  shipping_address jsonb,
  -- Manual courier tracking — filled in by staff when an order is
  -- marked shipped (to_ship -> to_receive). Only relevant to delivery
  -- orders (PayPal/COD); walk-in orders never use these since there's
  -- no courier involved. No courier API integration — staff just type
  -- in whatever the courier's own system gave them.
  courier_name text,
  tracking_number text,
  tracking_url text,
  -- Exactly which product/size/quantity combinations this order
  -- deducted from stock at checkout, e.g.
  -- [{"productId": 12, "size": "M", "qty": 2}]. Stored on the order
  -- itself (not recomputed later) so canceling always restores the
  -- exact amount taken, even if the product's sizes or stock have
  -- since changed.
  stock_deductions jsonb,
  -- Delivery fee, only ever added to Cash on Delivery orders (PayPal
  -- is prepaid at checkout, Walk-in has no delivery). Set by staff
  -- before the order ships — see setDeliveryFee.
  delivery_fee numeric(10, 2) not null default 0,
  -- Finer-grained embroidery production stage, shown to the customer
  -- as an icon tracker on My Purchases (see ProductionStageTracker).
  -- Separate from order_status (which drives the admin workflow
  -- buttons and what counts as a sale) — this just tells the customer
  -- what's physically happening to a custom order right now. Null for
  -- orders with no custom items, since this is specifically about the
  -- embroidery/tailoring pipeline. Set by staff via setProductionStage.
  production_stage text check (production_stage in (
    'order_received', 'proofing_pending', 'design_approved', 'in_tailoring',
    'in_embroidery', 'quality_check', 'ready_for_fulfillment', 'completed'
  )),
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

-- Storage bucket for customer-uploaded design/artwork files, attached
-- to custom orders from the product page's "Custom" flow. Private,
-- unlike product-images — these are customer files, not public product
-- photos. No select/insert/update/delete policy is defined on purpose:
-- uploads go through /api/upload/design (which checks the request is
-- from a signed-in user, then writes with the service role key), and
-- admin reads go through signed URLs generated with the service role
-- key (see lib/upload.js getDesignDownloadUrl). Regular users can never
-- read this bucket directly, no matter what the client sends.
insert into storage.buckets (id, name, public)
values ('design-uploads', 'design-uploads', false)
on conflict (id) do nothing;

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
  -- Staff's reply to this inquiry (message/feedback/quote types — not
  -- used for ratings). Emailed to the customer when set; overwriting it
  -- sends a fresh reply email.
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- No insert/update/delete policy for this bucket, on purpose — uploads
-- go through the admin server action using the service role key, same
-- reasoning as the products and orders tables above.

-- Public ratings shown on the website (Contact page → "Rate Us" tab).
-- Kept separate from contact_inquiries so only public-safe fields (name,
-- stars, comment) are ever exposed. Updates are pushed to visitors in
-- realtime via the Supabase Realtime publication below.
create table if not exists public.ratings (
  id bigint generated always as identity primary key,
  name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  -- Ties a rating back to its contact_inquiries row so a re-run of this
  -- schema can backfill cleanly without duplicating (and so deleting the
  -- inquiry removes the public rating too).
  source_id bigint unique references public.contact_inquiries(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ratings enable row level security;

-- Anyone (including signed-out visitors) can read the public ratings feed.
-- The website's anon client reads this to render the star summary + list.
drop policy if exists "Public can view ratings" on public.ratings;
create policy "Public can view ratings"
  on public.ratings for select
  using (true);

-- No insert/update/delete policy for regular users — ratings are created
-- by the contact API route using the service role key (bypasses RLS),
-- same reasoning as the orders/inquiries tables above.

create index if not exists ratings_created_at_idx on public.ratings(created_at desc);

-- Turn on realtime for ratings so new ones appear live on the site
-- without a refresh. Idempotent — safe to re-run.
do $$
begin
  alter publication supabase_realtime add table public.ratings;
exception
  when duplicate_object then null;
end $$;

-- Backfill ratings that already exist in contact_inquiries so the public
-- feed picks them up. Idempotent thanks to the unique source_id column.
insert into public.ratings (name, rating, comment, source_id)
select name, rating, message, id
from public.contact_inquiries
where type = 'rating' and rating is not null and rating between 1 and 5
on conflict (source_id) do nothing;


-- ---------------------------------------------------------------------------
-- Migration: let customers delete their own account (see
-- /api/account/delete) without wiping their order/revenue history.
-- Safe to re-run — only needed once on a database created before this
-- change (a brand-new database already gets "on delete set null" from
-- the orders table definition above).
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders alter column user_id drop not null;
alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Migration: add in_stock to products for the admin's "Out of Stock"
-- toggle. Safe to re-run — only needed once on a database created
-- before this change (a brand-new database already gets in_stock from
-- the products table definition above).
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists in_stock boolean not null default true;

-- ---------------------------------------------------------------------------
-- Migration: expand order_status from pending/accepted/declined to the
-- full fulfillment lifecycle (pending, to_ship, to_receive, completed,
-- canceled). Safe to re-run — only needed once on a database created
-- before this change (a brand-new database already gets the new set
-- from the orders table definition above). Existing rows are remapped
-- so no order is left with a status value the new check no longer
-- allows: accepted -> to_ship, declined -> canceled.
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_order_status_check;
update public.orders set order_status = 'to_ship' where order_status = 'accepted';
update public.orders set order_status = 'canceled' where order_status in ('declined', 'cancelled');
update public.orders set order_status = 'pending' where order_status not in (
  'pending', 'to_ship', 'to_receive', 'completed', 'canceled'
);
alter table public.orders
  add constraint orders_order_status_check
  check (order_status in ('pending', 'to_ship', 'to_receive', 'completed', 'canceled'));

-- ---------------------------------------------------------------------------
-- Migration: add staff reply fields to contact_inquiries (message/
-- feedback/quote types — the dashboard's Inquiries view). Safe to
-- re-run — only needed once on a database created before this change
-- (a brand-new database already gets these from the table definition
-- above).
-- ---------------------------------------------------------------------------
alter table public.contact_inquiries add column if not exists reply text;
alter table public.contact_inquiries add column if not exists replied_at timestamptz;

-- ---------------------------------------------------------------------------
-- Activity log: records every order/inquiry action taken by staff and
-- admin accounts, so the admin dashboard can show what staff have been
-- doing (see /admin/staff). Written via lib/activityLog.js using the
-- service role key — never by the client directly.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_activity_log (
  id bigint generated always as identity primary key,
  actor_email text not null,
  actor_role text not null check (actor_role in ('admin', 'staff')),
  action text not null,
  target_type text,
  target_id text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_log enable row level security;

-- No select/insert/update/delete policy is defined on purpose — this is
-- an internal audit trail. Writes go through server actions using the
-- service role key, and the /admin/staff page (admin-only) reads it the
-- same way. Regular users, and even staff accounts, can never read this
-- table directly through the client.

create index if not exists admin_activity_log_created_at_idx on public.admin_activity_log(created_at desc);
create index if not exists admin_activity_log_actor_idx on public.admin_activity_log(actor_email);

-- ---------------------------------------------------------------------------
-- Migration: add Walk-in as a payment method, with its own pickup
-- fulfillment pipeline (Preparing -> Ready for Pickup -> Picked Up)
-- separate from the shipping pipeline (To Ship -> To Receive ->
-- Completed) used by PayPal/COD orders. Safe to re-run — only needed
-- once on a database created before this change.
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('paypal', 'cod', 'walkin'));

alter table public.orders drop constraint if exists orders_order_status_check;
-- Defensive remapping, run again here in case this block is ever run
-- on its own without the earlier order_status migration above having
-- run first — remaps any known legacy status name, then coerces
-- anything still unrecognized to 'pending' as a last resort so this
-- constraint can never fail to apply regardless of what's actually in
-- the table.
update public.orders set order_status = 'to_ship' where order_status = 'accepted';
update public.orders set order_status = 'canceled' where order_status in ('declined', 'cancelled');
update public.orders set order_status = 'to_receive' where order_status = 'shipped';
update public.orders set order_status = 'completed' where order_status = 'delivered';
update public.orders set order_status = 'pending' where order_status not in (
  'pending', 'to_ship', 'to_receive', 'completed', 'canceled',
  'preparing', 'ready_for_pickup', 'picked_up'
);
alter table public.orders add constraint orders_order_status_check
  check (order_status in (
    'pending', 'to_ship', 'to_receive', 'completed', 'canceled',
    'preparing', 'ready_for_pickup', 'picked_up'
  ));

-- ---------------------------------------------------------------------------
-- Migration: add manual courier tracking fields, filled in by staff
-- when marking a delivery order as shipped. Safe to re-run — only
-- needed once on a database created before this change.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists courier_name text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;

-- ---------------------------------------------------------------------------
-- Migration: add per-size stock tracking to products (e.g. S/M/L/XL
-- quantities), shown to customers on each product page. Safe to
-- re-run — only needed once on a database created before this change.
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists stock jsonb;

-- ---------------------------------------------------------------------------
-- Stock deduction/restoration, called at checkout and on order
-- cancellation. Implemented as SECURITY DEFINER functions (not plain
-- table updates) for two reasons:
--   1. Atomicity — the read-modify-write happens in a single statement
--      inside Postgres, so two customers buying the last unit at the
--      same time can't both succeed (no race condition).
--   2. Customers' own session can call this narrow, safe operation
--      even though they have no general write access to the products
--      table (see the "no insert/update/delete policy" note above) —
--      the function runs with elevated privileges for just this one
--      job, nothing more.
-- ---------------------------------------------------------------------------
create or replace function public.decrement_product_stock(p_product_id bigint, p_size text, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_stock jsonb;
begin
  update public.products
  set stock = jsonb_set(
        stock,
        array[p_size],
        to_jsonb(greatest(0, coalesce((stock->>p_size)::int, 0) - p_qty))
      )
  where id = p_product_id and stock ? p_size
  returning stock into updated_stock;

  if updated_stock is not null then
    update public.products
    set in_stock = exists (
      select 1 from jsonb_each_text(updated_stock) as kv(k, v)
      where v::int > 0
    )
    where id = p_product_id;
  end if;
end;
$$;

grant execute on function public.decrement_product_stock(bigint, text, int) to authenticated;

create or replace function public.restore_product_stock(p_product_id bigint, p_size text, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_stock jsonb;
begin
  update public.products
  set stock = jsonb_set(
        coalesce(stock, '{}'::jsonb),
        array[p_size],
        to_jsonb(coalesce((stock->>p_size)::int, 0) + p_qty)
      )
  where id = p_product_id and stock is not null and stock ? p_size
  returning stock into updated_stock;

  if updated_stock is not null then
    update public.products
    set in_stock = true
    where id = p_product_id;
  end if;
end;
$$;

grant execute on function public.restore_product_stock(bigint, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Migration: add stock_deductions to orders, recording exactly what
-- was taken from stock at checkout so cancellation can restore the
-- exact amount later. Safe to re-run — only needed once on a database
-- created before this change.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists stock_deductions jsonb;

-- ---------------------------------------------------------------------------
-- Migration: add delivery_fee to orders, settable by staff/admin on
-- Cash on Delivery orders only (see setDeliveryFee). Safe to re-run —
-- only needed once on a database created before this change.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists delivery_fee numeric(10, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- Migration: add production_stage to orders — the finer embroidery
-- pipeline stage shown to customers as an icon tracker (see
-- ProductionStageTracker / setProductionStage). Safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists production_stage text;
alter table public.orders drop constraint if exists orders_production_stage_check;
alter table public.orders add constraint orders_production_stage_check check (production_stage in (
  'order_received', 'proofing_pending', 'design_approved', 'in_tailoring',
  'in_embroidery', 'quality_check', 'ready_for_fulfillment', 'completed'
));

-- ---------------------------------------------------------------------------
-- Staff identity layer: a shared "staff" login (from STAFF_EMAILS) may
-- actually be used by more than one physical person. This lets each
-- person identify themselves by name + a short PIN right after
-- logging in, so /admin/staff's activity log shows exactly who did
-- what — not just the shared account's email.
--
-- `approved` gates actual admin-interface access: the first time a
-- name is used it self-registers but stays unapproved, and the
-- person sees a "waiting for approval" screen instead of the
-- dashboard until an admin approves them from /admin/staff. Existing
-- rows from before this column existed default to true so no one
-- already in active use gets locked out by the migration.
--
-- The PIN itself is still just a lightweight accountability layer on
-- top of real auth (Supabase login remains the actual account
-- boundary), so it's hashed with a simple SHA-256 (see
-- lib/staffIdentity.js) rather than a full password-hashing algorithm.
-- ---------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id bigint generated always as identity primary key,
  name text not null unique,
  pin_hash text not null,
  approved boolean not null default true,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Migration: add the approval columns to a database created before
-- this change. Safe to re-run.
alter table public.staff_profiles add column if not exists approved boolean not null default true;
alter table public.staff_profiles add column if not exists approved_at timestamptz;

alter table public.staff_profiles enable row level security;
-- No select/insert/update/delete policy on purpose — only ever
-- accessed via the service role key, from /api/staff/identify and the
-- /admin/staff page.

-- Migration: add actor_name to the existing activity log, so entries
-- made after this change show the individual person's name alongside
-- the shared account's email. Safe to re-run.
alter table public.admin_activity_log add column if not exists actor_name text;

-- ---------------------------------------------------------------------------
-- Customer <-> staff messaging. Lets a signed-in customer message the
-- shop directly (separate from the one-off contact_inquiries form on
-- /contact) and get replies from staff/admin, threaded per customer —
-- shown on the customer's /account/messages page and the dashboard's
-- /admin/messages inbox.
--
-- RLS mirrors the notifications table: a customer can read/insert only
-- their own rows, and can only ever insert as sender_role = 'customer'
-- (never spoof a staff reply from the client). Staff/admin read the
-- full inbox and insert replies through the sendStaffMessage server
-- action using the service role key — a staff reply's user_id is the
-- *customer's* id (whose thread it belongs to), not the staff
-- member's, so it could never satisfy a customer-owns-this-row policy
-- anyway.
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'staff')),
  -- Set only for sender_role = 'staff', from the name+PIN identity
  -- gate (or 'Admin' for a full admin) — so the customer sees who
  -- replied. Always null for sender_role = 'customer'.
  sender_name text,
  -- Denormalized so the admin inbox can list/search conversations by
  -- email without joining into the auth schema. Always set server-side
  -- by the trigger below from auth.users, never trusted from the
  -- client, so it can't be spoofed and stays correct even on a staff
  -- reply (where the inserting session is staff, not the customer).
  customer_email text,
  body text not null,
  read_by_customer boolean not null default false,
  read_by_staff boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Users can view their own messages" on public.messages;
create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own messages" on public.messages;
create policy "Users can insert their own messages"
  on public.messages for insert
  with check (auth.uid() = user_id and sender_role = 'customer');

-- Lets a customer mark a staff reply in their own thread as read (see
-- MessageThread.jsx) — same shape as the notifications read policy.
drop policy if exists "Users can mark their own messages read" on public.messages;
create policy "Users can mark their own messages read"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

-- Always fills customer_email from auth.users server-side, regardless
-- of who's inserting (the customer themselves, or staff replying on
-- their thread) — same narrow-SECURITY DEFINER-function reasoning as
-- decrement_product_stock/restore_product_stock above.
create or replace function public.set_message_customer_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select email into new.customer_email from auth.users where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists messages_set_customer_email on public.messages;
create trigger messages_set_customer_email
  before insert on public.messages
  for each row execute function public.set_message_customer_email();

-- Realtime so a customer sees a staff reply appear live on
-- /account/messages without a manual refresh, same as notifications.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------------
-- Migration: design proofing. Staff uploads a digitized embroidery proof;
-- the customer approves it (or requests changes) from My Purchases. The
-- proof file lives in the private design-uploads bucket. Safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists proof_path text;
alter table public.orders add column if not exists proof_name text;
alter table public.orders add column if not exists proof_feedback text;
alter table public.orders add column if not exists proof_uploaded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Migration: Cashier role + payment records.
--
-- The admin assigns exactly ONE approved staff member as the cashier
-- (staff_profiles.is_cashier — a partial unique index makes a second
-- cashier impossible). The cashier's dashboard is limited to payments:
-- COD cash handed over by delivery staff, walk-in payments, and the
-- payment records. Every payment is written to payment_records (one per
-- order, never edited) and gets a receipt number (OR-000123).
-- Safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.staff_profiles add column if not exists is_cashier boolean not null default false;
create unique index if not exists staff_profiles_one_cashier
  on public.staff_profiles ((true)) where is_cashier;

-- Swaps the cashier in ONE transaction so there is never zero or two.
create or replace function public.assign_cashier(p_profile_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.staff_profiles where id = p_profile_id and approved) then
    raise exception 'Staff member not found or not approved';
  end if;
  update public.staff_profiles set is_cashier = false where is_cashier;
  update public.staff_profiles set is_cashier = true where id = p_profile_id;
end;
$$;
revoke all on function public.assign_cashier(bigint) from public, anon, authenticated;
grant execute on function public.assign_cashier(bigint) to service_role;

-- Delivery staff report the cash they collected on a COD delivery; that
-- is what puts the order in the cashier's queue.
alter table public.orders add column if not exists cod_collected_at timestamptz;
alter table public.orders add column if not exists cod_collected_by text;

create table if not exists public.payment_records (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references public.orders(id) on delete restrict,
  method text not null check (method in ('cod', 'walkin')),
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'gcash', 'card', 'other')),
  amount_expected numeric(10, 2) not null,
  amount_received numeric(10, 2) not null,
  collected_by text,
  recorded_by text not null,
  recorded_by_email text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.payment_records enable row level security;
-- No policies on purpose: internal financial records, only ever read
-- and written through server code using the service role key.
create index if not exists payment_records_created_at_idx on public.payment_records(created_at desc);



create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nickname text,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Make sure delivery is an allowed role.
alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (
  role in (
    'customer',
    'staff',
    'admin',
    'delivery'
  )
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile"
on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
);


-- ============================================================
-- DELIVERY PROFILES
-- ============================================================

-- Delivery setup (clean, idempotent)


-- =====================================================================
-- Delivery setup (clean, idempotent) - paste the WHOLE file into the
-- Supabase SQL Editor and press Run. Safe to run more than once.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Delivery profiles (one row per rider)
-- ---------------------------------------------------------------------
create table if not exists public.delivery_profiles (
  id            bigint generated always as identity primary key,
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  display_name  text not null,
  phone         text,
  vehicle_type  text,
  vehicle_plate text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists delivery_profiles_active_idx
  on public.delivery_profiles(active);

alter table public.delivery_profiles enable row level security;

drop policy if exists "Delivery can view own profile" on public.delivery_profiles;
create policy "Delivery can view own profile"
  on public.delivery_profiles
  for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists delivery_profiles_set_updated_at on public.delivery_profiles;
create trigger delivery_profiles_set_updated_at
  before update on public.delivery_profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 2. Order columns used by the delivery flow
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists delivery_user_id        uuid references auth.users(id) on delete set null,
  add column if not exists delivery_stage          text,
  add column if not exists delivery_accepted_at    timestamptz,
  add column if not exists delivery_picked_up_at   timestamptz,
  add column if not exists delivery_out_at         timestamptz,
  add column if not exists delivery_arrived_at     timestamptz,
  add column if not exists delivered_at            timestamptz,
  add column if not exists delivery_proof_path     text,
  add column if not exists delivery_recipient_name text,
  add column if not exists delivery_notes          text,
  add column if not exists delivery_failed_reason  text,
  add column if not exists cod_amount              numeric(12,2),
  add column if not exists cod_collected_amount    numeric(12,2),
  add column if not exists cod_change              numeric(12,2),
  add column if not exists cod_remitted_at         timestamptz,
  add column if not exists cod_remitted_by         uuid references auth.users(id) on delete set null,
  add column if not exists shipping_lat            double precision,
  add column if not exists shipping_lng            double precision;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_delivery_stage_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_delivery_stage_check
      check (delivery_stage is null or delivery_stage in
        ('accepted','picked_up','out_for_delivery','arrived','delivered','failed'));
  end if;
end $$;

create index if not exists orders_delivery_user_id_idx
  on public.orders(delivery_user_id);

create index if not exists orders_available_for_delivery_idx
  on public.orders(production_stage)
  where delivery_user_id is null;


-- ---------------------------------------------------------------------
-- 3. Helper: is the caller an active rider?
--    A rider = auth user whose app_metadata.role is 'delivery' AND who
--    has an active row in delivery_profiles.
-- ---------------------------------------------------------------------
create or replace function public.is_active_rider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'delivery'
    and exists (
      select 1 from public.delivery_profiles dp
      where dp.user_id = auth.uid() and dp.active
    );
$$;

revoke all on function public.is_active_rider() from public, anon;
grant execute on function public.is_active_rider() to authenticated;


-- ---------------------------------------------------------------------
-- 4. Orders RLS - riders can READ only. They change orders exclusively
--    through the functions in section 5.
-- ---------------------------------------------------------------------
drop policy if exists "Delivery users can view assigned orders" on public.orders;
create policy "Delivery users can view assigned orders"
  on public.orders
  for select to authenticated
  using (delivery_user_id = auth.uid());

drop policy if exists "Delivery users can view available deliveries" on public.orders;
create policy "Delivery users can view available deliveries"
  on public.orders
  for select to authenticated
  using (
    public.is_active_rider()
    and production_stage = 'ready_for_fulfillment'
    and delivery_user_id is null
    and payment_method is distinct from 'walkin'
  );


-- ---------------------------------------------------------------------
-- 5. Rider actions (security definer: they run with elevated rights but
--    check that the caller is an active rider and, after accepting, that
--    the order is assigned to THAT rider).
-- ---------------------------------------------------------------------

-- 5a. Accept an available delivery
create or replace function public.delivery_accept_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_rider() then
    raise exception 'Not an active delivery rider' using errcode = '42501';
  end if;

  update public.orders
     set delivery_user_id     = auth.uid(),
         delivery_stage       = 'accepted',
         delivery_accepted_at = now()
   where id = p_order_id
     and delivery_user_id is null
     and production_stage = 'ready_for_fulfillment'
     and payment_method is distinct from 'walkin';

  if not found then
    raise exception 'Order is no longer available' using errcode = 'P0001';
  end if;
end;
$$;

-- 5b. accepted -> picked_up
create or replace function public.delivery_mark_picked_up(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_rider() then
    raise exception 'Not an active delivery rider' using errcode = '42501';
  end if;

  update public.orders
     set delivery_stage         = 'picked_up',
         delivery_picked_up_at  = now()
   where id = p_order_id
     and delivery_user_id = auth.uid()
     and delivery_stage = 'accepted';

  if not found then
    raise exception 'Order is not ready to be marked picked up' using errcode = 'P0001';
  end if;
end;
$$;

-- 5c. picked_up -> out_for_delivery
create or replace function public.delivery_mark_out_for_delivery(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_rider() then
    raise exception 'Not an active delivery rider' using errcode = '42501';
  end if;

  update public.orders
     set delivery_stage  = 'out_for_delivery',
         delivery_out_at = now()
   where id = p_order_id
     and delivery_user_id = auth.uid()
     and delivery_stage = 'picked_up';

  if not found then
    raise exception 'Order is not ready to go out for delivery' using errcode = 'P0001';
  end if;
end;
$$;

-- 5d. out_for_delivery -> arrived
create or replace function public.delivery_mark_arrived(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_rider() then
    raise exception 'Not an active delivery rider' using errcode = '42501';
  end if;

  update public.orders
     set delivery_stage      = 'arrived',
         delivery_arrived_at = now()
   where id = p_order_id
     and delivery_user_id = auth.uid()
     and delivery_stage = 'out_for_delivery';

  if not found then
    raise exception 'Order is not out for delivery' using errcode = 'P0001';
  end if;
end;
$$;

-- 5e. out_for_delivery / arrived -> delivered
--     COD orders must record the cash collected (at least the total);
--     the change given back is calculated automatically.
create or replace function public.delivery_mark_delivered(
  p_order_id       bigint,
  p_recipient_name text,
  p_proof_path     text default null,
  p_notes          text default null,
  p_cod_collected  numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_is_cod boolean;
begin
  if not public.is_active_rider() then
    raise exception 'Not an active delivery rider' using errcode = '42501';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
     and delivery_user_id = auth.uid()
   for update;

  if not found then
    raise exception 'Order not found or not assigned to you' using errcode = '42501';
  end if;

  if v_order.delivery_stage not in ('out_for_delivery', 'arrived') then
    raise exception 'Order is not out for delivery' using errcode = 'P0001';
  end if;

  if p_recipient_name is null or length(trim(p_recipient_name)) = 0 then
    raise exception 'Recipient name is required' using errcode = 'P0001';
  end if;

  v_is_cod := (v_order.payment_method = 'cod');

  if v_is_cod and (p_cod_collected is null or p_cod_collected < v_order.total) then
    raise exception 'Cash collected must be at least the order total' using errcode = 'P0001';
  end if;

  update public.orders
     set delivery_stage          = 'delivered',
         delivered_at            = now(),
         delivery_recipient_name = trim(p_recipient_name),
         delivery_proof_path     = p_proof_path,
         delivery_notes          = nullif(trim(coalesce(p_notes, '')), ''),
         cod_amount              = case when v_is_cod then v_order.total end,
         cod_collected_amount    = case when v_is_cod then p_cod_collected end,
         cod_change              = case when v_is_cod then p_cod_collected - v_order.total end
   where id = p_order_id;
end;
$$;

-- 5f. any active stage -> failed (reason required)
create or replace function public.delivery_mark_failed(
  p_order_id bigint,
  p_reason   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_rider() then
    raise exception 'Not an active delivery rider' using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Please give a reason for the failed delivery' using errcode = 'P0001';
  end if;

  update public.orders
     set delivery_stage         = 'failed',
         delivery_failed_reason = trim(p_reason)
   where id = p_order_id
     and delivery_user_id = auth.uid()
     and delivery_stage in ('accepted', 'picked_up', 'out_for_delivery', 'arrived');

  if not found then
    raise exception 'Order cannot be marked as failed' using errcode = 'P0001';
  end if;
end;
$$;

-- Only signed-in riders may call these (the checks above enforce the rest).
revoke all on function public.delivery_accept_order(bigint)                                  from public, anon;
revoke all on function public.delivery_mark_picked_up(bigint)                                from public, anon;
revoke all on function public.delivery_mark_out_for_delivery(bigint)                         from public, anon;
revoke all on function public.delivery_mark_arrived(bigint)                                  from public, anon;
revoke all on function public.delivery_mark_delivered(bigint, text, text, text, numeric)     from public, anon;
revoke all on function public.delivery_mark_failed(bigint, text)                             from public, anon;

grant execute on function public.delivery_accept_order(bigint)                               to authenticated;
grant execute on function public.delivery_mark_picked_up(bigint)                             to authenticated;
grant execute on function public.delivery_mark_out_for_delivery(bigint)                      to authenticated;
grant execute on function public.delivery_mark_arrived(bigint)                               to authenticated;
grant execute on function public.delivery_mark_delivered(bigint, text, text, text, numeric)  to authenticated;
grant execute on function public.delivery_mark_failed(bigint, text)                          to authenticated;


-- ---------------------------------------------------------------------
-- 6. Private storage bucket for proof-of-delivery photos.
--    No policies on purpose (same as design-uploads): uploads and
--    signed links go through server code using the service role key.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('delivery-proofs', 'delivery-proofs', false)
on conflict (id) do nothing;

commit;


-- =====================================================================
-- HOW TO MAKE SOMEONE A RIDER (run separately, AFTER the script above)
--
-- 1) Create the user in Supabase: Authentication -> Users -> Add user
--    (or let them sign up), then use their email below.
-- 2) Give them the 'delivery' role and a profile:
--
--   update auth.users
--      set raw_app_meta_data =
--            coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"delivery"}'::jsonb
--    where email = 'rider@example.com';
--
--   insert into public.delivery_profiles (user_id, display_name, phone, vehicle_type, vehicle_plate)
--   select id, 'Juan Dela Cruz', '09171234567', 'Motorcycle', 'ABC 1234'
--     from auth.users
--    where email = 'rider@example.com'
--   on conflict (user_id) do update
--     set display_name = excluded.display_name, active = true;
--
-- The rider must sign out and back in once so the new role is in their
-- login token.
-- =====================================================================


