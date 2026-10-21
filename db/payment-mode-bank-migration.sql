-- Run this ONCE in the Supabase SQL editor.
-- Adds 'bank' as a payment mode for cashier receipts. The old values stay
-- allowed so receipts that were already recorded are not affected.
alter table public.payment_records
  drop constraint if exists payment_records_payment_mode_check;

alter table public.payment_records
  add constraint payment_records_payment_mode_check
  check (payment_mode in ('cash', 'bank', 'gcash', 'card', 'other'));
