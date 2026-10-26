-- ---------------------------------------------------------------------------
-- Backfill: COD remittances confirmed on /admin/cod-remittance BEFORE the fix.
--
-- Those orders were stamped cod_remitted_at but never got a payment_records
-- row and stayed payment_status <> 'paid', so the Revenue report missed the
-- cash. This creates the missing records, dated when the remittance was
-- confirmed (so each amount lands on the day the cash was actually received),
-- and marks the orders paid.
--
-- Safe to re-run: only touches remitted COD orders that have no record yet.
-- Run in Supabase -> SQL Editor.
--
-- STEP 1 (optional): preview what will be added.
-- select o.id, o.total, coalesce(o.cod_amount, o.total) as amount, o.cod_remitted_at
--   from public.orders o
--  where o.payment_method = 'cod'
--    and o.cod_remitted_at is not null
--    and o.order_status <> 'canceled'
--    and o.payment_status is distinct from 'paid'
--    and not exists (select 1 from public.payment_records pr where pr.order_id = o.id)
--  order by o.cod_remitted_at;
--
-- STEP 2: run the statement below.
-- ---------------------------------------------------------------------------
with candidates as (
  select o.id,
         o.total,
         coalesce(o.cod_amount, o.total)               as amount,
         o.cod_remitted_at,
         coalesce(o.cod_collected_by, dp.display_name) as collector
    from public.orders o
    left join public.delivery_profiles dp on dp.user_id = o.delivery_user_id
   where o.payment_method = 'cod'
     and o.cod_remitted_at is not null
     and o.order_status <> 'canceled'
     and o.payment_status is distinct from 'paid'
     and not exists (select 1 from public.payment_records pr where pr.order_id = o.id)
), inserted as (
  insert into public.payment_records
    (order_id, method, payment_mode, amount_expected, amount_received,
     collected_by, recorded_by, note, created_at)
  select id, 'cod', 'cash', total, amount,
         collector, 'COD remittance backfill',
         case when abs(amount - total) > 0.009
              then 'Backfilled: COD amount differed from order total' end,
         cod_remitted_at
    from candidates
  returning order_id
)
update public.orders
   set payment_status = 'paid'
 where id in (select order_id from inserted);
