import Link from 'next/link';
import { redirectIfCashier } from '@/lib/cashier';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { getDeliveryUsers } from '@/app/admin/actions';
import { assignRiderChecked, saveSenderAddress } from './actions';
import AssignRider from '@/components/admin/AssignRider';
import AutoRefresh from '@/components/admin/AutoRefresh';
import SenderAddressCard from '@/components/admin/SenderAddressCard';
import { getLabelData } from '@/lib/label';

export const dynamic = 'force-dynamic';

function PaymentBadge({ payment }) {
  const cod = payment === 'COD';
  return (
    <span
      className={`ml-2 align-middle text-[11px] font-semibold rounded-full px-2 py-0.5 ${
        cod
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
      }`}
    >
      {payment}
    </span>
  );
}

function OrderRow({ o, right, below }) {
  const d = getLabelData(o);
  return (
    <div className="rounded-3xl bg-white dark:bg-[#1c1c1e] ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            #{d.shortId} · {d.customerName || 'Customer'}
            <PaymentBadge payment={d.payment} />
          </p>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {[d.phone, d.address].filter(Boolean).join(' · ') || 'No contact details on order'}
          </p>
        </div>
        {right}
      </div>
      {below}
    </div>
  );
}

function SectionTitle({ children, count }) {
  return (
    <div className="flex items-baseline gap-2 mb-3 px-1">
      <h2 className="text-[20px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {children}
      </h2>
      <span className="text-[14px] text-neutral-400">{count}</span>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-3xl bg-white/60 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 px-5 py-8 text-center text-[14px] text-neutral-400">
      {children}
    </div>
  );
}

export default async function PackingPage() {
  await redirectIfCashier();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canAssign = isAdminEmail(user?.email);

  let riders = [];
  if (canAssign) {
    try {
      riders = await getDeliveryUsers();
    } catch (err) {
      console.error('getDeliveryUsers:', err.message);
    }
  }

  const admin = createAdminClient();

  const [{ data }, { data: setting }] = await Promise.all([
    admin
      .from('orders')
      .select('*')
      .eq('production_stage', 'ready_for_fulfillment')
      .neq('payment_method', 'walkin')
      .is('delivery_user_id', null)
      .not('order_status', 'in', '("cancelled","canceled","completed","picked_up")')
      .order('created_at', { ascending: true }),
    admin.from('shop_settings').select('value').eq('key', 'sender_address').maybeSingle(),
  ]);

  const orders = data || [];
  const needsLabel = orders.filter((o) => !o.label_printed_at);
  const readyForRider = orders.filter((o) => o.label_printed_at);
  const shopName = orders[0] ? getLabelData(orders[0]).shopName : '';

  return (
    <div className="max-w-3xl mx-auto font-sans antialiased">
      <AutoRefresh />

      <div className="flex flex-wrap items-end justify-between gap-3 mb-1 px-1">
        <h1 className="text-[34px] leading-tight font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Packing
        </h1>
        {needsLabel.length > 1 && (
          <Link
            href="/admin/packing/print-all"
            className="rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium px-5 py-2 transition"
          >
            Print all ({needsLabel.length})
          </Link>
        )}
      </div>
      <p className="text-[15px] text-neutral-500 dark:text-neutral-400 mb-8 px-1">
        Print the label and attach it to the package. Once printed, the order is packed and ready
        for a rider.
      </p>

      {canAssign && (
        <div className="mb-10">
          <SenderAddressCard
            shopName={shopName}
            initialAddress={setting?.value || ''}
            action={saveSenderAddress}
          />
        </div>
      )}

      <section className="mb-10">
        <SectionTitle count={needsLabel.length}>Needs label</SectionTitle>
        <div className="space-y-3">
          {needsLabel.map((o) => (
            <OrderRow
              key={o.id}
              o={o}
              right={
                <Link
                  href={`/admin/packing/${o.id}/label`}
                  className="rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium px-5 py-2 transition"
                >
                  Print label
                </Link>
              }
            />
          ))}
          {needsLabel.length === 0 && <Empty>Nothing waiting.</Empty>}
        </div>
      </section>

      <section>
        <SectionTitle count={readyForRider.length}>Ready for rider</SectionTitle>
        <div className="space-y-3">
          {readyForRider.map((o) => (
            <OrderRow
              key={o.id}
              o={o}
              right={
                <div className="text-right">
                  <span className="inline-block text-[12px] font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20 rounded-full px-3 py-1">
                    Ready
                  </span>
                  <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Printed {new Date(o.label_printed_at).toLocaleString()}
                    {o.label_print_count > 1 ? ` · ${o.label_print_count}×` : ''}
                  </p>
                  <Link
                    href={`/admin/packing/${o.id}/label`}
                    className="text-[13px] font-medium text-[#0071e3] hover:underline"
                  >
                    Reprint
                  </Link>
                </div>
              }
              below={
                canAssign ? (
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/10">
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-2">
                      Optional: assign a specific rider, or leave it open for any rider.
                    </p>
                    <AssignRider id={o.id} riders={riders} action={assignRiderChecked} />
                  </div>
                ) : null
              }
            />
          ))}
          {readyForRider.length === 0 && <Empty>Nothing yet.</Empty>}
        </div>
      </section>
    </div>
  );
}