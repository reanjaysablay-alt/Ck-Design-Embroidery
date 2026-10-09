/*
  DELIVERY MIGRATION  (run once in the Supabase SQL Editor)

  Rider flow:
    ready_for_delivery
      -> Accept          delivery_stage = accepted,          order_status = to_receive
      -> Picked up       delivery_stage = picked_up
      -> On the way      delivery_stage = out_for_delivery
      -> Arrived         delivery_stage = arrived
      -> Delivered       delivery_stage = delivered,         order_status = completed
         (photo + recipient name, COD cash and change recorded)
      -> or Failed       delivery_stage = failed + reason
*/

/* 1. New columns ---------------------------------------------------- */

alter table public.orders
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
  add column if not exists cod_collected_amount    numeric(12,2),
  add column if not exists cod_change              numeric(12,2),
  -- Optional: exact drop-off coordinates. When filled, the map pins them
  -- instead of searching the typed address.
  add column if not exists shipping_lat            double precision,
  add column if not exists shipping_lng            double precision;

/* 2. Backfill orders accepted under the old flow --------------------- */

update public.orders
set delivery_stage = 'accepted'
where delivery_user_id is not null
  and order_status = 'to_receive'
  and delivery_stage is null;

update public.orders
set delivery_stage = 'delivered'
where delivery_user_id is not null
  and order_status = 'completed'
  and delivery_stage is null;

/* 3. Private bucket for proof-of-delivery photos --------------------- */
/* Uploads and signed links go through the server (service-role), so no
   storage policies are needed and the photos are never public. */

insert into storage.buckets (id, name, public)
values ('delivery-proofs', 'delivery-proofs', false)
on conflict (id) do nothing;

/* 4. Row level security for riders ----------------------------------- */
/* Skip this block if you already have equivalent policies. */

drop policy if exists "Delivery users can view available deliveries" on public.orders;
drop policy if exists "Delivery users can view their deliveries" on public.orders;

create policy "Delivery users can view available deliveries"
on public.orders
for select
to authenticated
using (
  production_stage = 'ready_for_delivery'
  and delivery_user_id is null
);

create policy "Delivery users can view their deliveries"
on public.orders
for select
to authenticated
using (
  delivery_user_id = auth.uid()
);

/* 5. Realtime (optional) --------------------------------------------- */
/* Lets the dashboard update instantly. The page also polls every 30s,
   so it still works without this. Ignore the error if already added. */

alter publication supabase_realtime add table public.orders;
