-- Re-queue delivered COD orders that the rider app wrongly marked 'paid'
-- before the cashier recorded the cash. Run in Supabase -> SQL Editor.
--
-- STEP 1 (preview):
-- select id, total, payment_status, delivered_at
--   from public.orders o
--  where payment_method = 'cod'
--    and delivery_stage = 'delivered'
--    and payment_status = 'paid'
--    and cod_remitted_at is null
--    and order_status <> 'canceled'
--    and not exists (select 1 from public.payment_records pr where pr.order_id = o.id);

-- STEP 2 (fix): sets them back to unpaid so they show in Cashier > COD payments.
update public.orders o
   set payment_status = 'pending'
 where o.payment_method = 'cod'
   and o.delivery_stage = 'delivered'
   and o.payment_status = 'paid'
   and o.cod_remitted_at is null
   and o.order_status <> 'canceled'
   and not exists (select 1 from public.payment_records pr where pr.order_id = o.id);
