-- ---------------------------------------------------------------------------
-- COD remittance for the cashier.
-- One atomic step: the cashier confirms the cash handed over by the rider
-- and the payment is recorded (payment_records + receipt number) together.
-- Safe to re-run. Run in Supabase -> SQL Editor.
-- ---------------------------------------------------------------------------
create or replace function public.cashier_remit_cod(
  p_order_id          bigint,
  p_amount_received   numeric,
  p_note              text,
  p_recorded_by       text,
  p_recorded_by_email text default null,
  p_remitted_by       uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     public.orders%rowtype;
  v_rider     text;
  v_record_id bigint;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.payment_method <> 'cod' then
    raise exception 'This is not a Cash on Delivery order';
  end if;
  if v_order.order_status = 'canceled' then
    raise exception 'This order was canceled';
  end if;
  if v_order.delivery_stage is distinct from 'delivered' and v_order.cod_collected_at is null then
    raise exception 'The rider has not delivered this order yet';
  end if;
  if v_order.payment_status = 'paid'
     or exists (select 1 from public.payment_records where order_id = p_order_id) then
    raise exception 'Payment for this order was already recorded';
  end if;
  if p_amount_received is null or p_amount_received <= 0 then
    raise exception 'Enter the amount received';
  end if;
  if abs(p_amount_received - v_order.total) > 0.009
     and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'A note is required when the amount differs from the order total';
  end if;

  select display_name into v_rider
    from public.delivery_profiles
   where user_id = v_order.delivery_user_id;

  insert into public.payment_records
    (order_id, method, payment_mode, amount_expected, amount_received,
     collected_by, recorded_by, recorded_by_email, note)
  values
    (p_order_id, 'cod', 'cash', v_order.total, p_amount_received,
     coalesce(v_order.cod_collected_by, v_rider), p_recorded_by, p_recorded_by_email,
     nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_record_id;

  update public.orders
     set payment_status   = 'paid',
         cod_collected_at = coalesce(cod_collected_at, now()),
         cod_collected_by = coalesce(cod_collected_by, v_rider),
         cod_remitted_at  = now(),
         cod_remitted_by  = p_remitted_by
   where id = p_order_id;

  return v_record_id;
end;
$$;

revoke all on function public.cashier_remit_cod(bigint, numeric, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.cashier_remit_cod(bigint, numeric, text, text, text, uuid)
  to service_role;
