import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext } from '@/lib/cashier';
import { formatDateTime } from '@/lib/formatDate';
import { remitCod } from '@/app/admin/cashier/remit-actions';
import RemitCodForm from './RemitCodForm';

// Drop this into the cashier page: <CodRemittanceQueue />
// Lists COD orders a rider has marked delivered whose cash has not been
// handed to the cashier yet. Renders nothing for anyone but the cashier
// or an admin.
export default async function CodRemittanceQueue() {
  const ctx = await getAccessContext();
  if (!ctx.isAdmin && !ctx.isCashier) return null;

  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from('orders')
    .select(
      'id, total, customer_email, shipping_address, delivered_at, delivery_user_id, cod_collected_amount, cod_change'
    )
    .eq('payment_method', 'cod')
    .eq('delivery_stage', 'delivered')
    .neq('payment_status', 'paid')
    .neq('order_status', 'canceled')
    .order('delivered_at', { ascending: true });

  if (error) {
    return <p className="text-sm text-red-600">Could not load COD remittance: {error.message}</p>;
  }

  const riderIds = [...new Set((orders || []).map((o) => o.delivery_user_id).filter(Boolean))];
  const riderNames = {};
  if (riderIds.length) {
    const { data: riders } = await admin
      .from('delivery_profiles')
      .select('user_id, display_name')
      .in('user_id', riderIds);
    (riders || []).forEach((r) => (riderNames[r.user_id] = r.display_name));
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">COD remittance</h2>
      <p className="text-sm text-slate-500 mb-4">
        Delivered Cash on Delivery orders. Count the cash the rider hands over, then record it in
        one step.
      </p>

      {!orders?.length ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-5">
          No delivered COD orders are waiting for remittance.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-slate-400">Order #{o.id}</span>
                  <div className="text-slate-900 font-medium">
                    {o.shipping_address?.fullName || o.customer_email}
                  </div>
                  <div className="text-xs text-slate-400">
                    Delivered {formatDateTime(o.delivered_at)}
                  </div>
                </div>
                <span className="font-mono text-slate-900 font-semibold">
                  &#x20C3;&nbsp;{Number(o.total).toFixed(2)}
                </span>
              </div>
              <RemitCodForm
                orderId={o.id}
                total={o.total}
                riderName={riderNames[o.delivery_user_id]}
                collected={o.cod_collected_amount}
                change={o.cod_change}
                action={remitCod}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
