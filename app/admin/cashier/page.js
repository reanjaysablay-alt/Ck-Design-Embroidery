import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext, getCashierProfile } from '@/lib/cashier';
import { formatDateTime, toShopTime } from '@/lib/formatDate';
import { formatReceiptNo, paymentModeLabel, customerLabel } from '@/lib/receipt';
import { recordPayment } from '@/app/admin/actions';
import RecordPaymentForm from '@/components/admin/RecordPaymentForm';
import AutoRefresh from '@/components/admin/AutoRefresh';

export const metadata = { title: 'Cashier — Stitchhouse Admin' };
export const dynamic = 'force-dynamic';

const money = (n) => `$${Number(n).toFixed(2)}`;

function itemsSummary(order) {
  const names = (order.items || []).map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`);
  const text = names.join(', ');
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

// Start of "today" in the shop's timezone, as a real UTC instant.
function startOfShopDay() {
  const offset = toShopTime('1970-01-01T00:00:00Z').getTime();
  const shopNow = toShopTime();
  return new Date(
    Date.UTC(shopNow.getUTCFullYear(), shopNow.getUTCMonth(), shopNow.getUTCDate()) - offset
  );
}

function OrderRow({ order, action, children }) {
  const isCod = order.payment_method === 'cod';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-slate-900 font-medium">
            Order #{order.id}{' '}
            <span className="text-slate-400 font-normal">· {customerLabel(order)}</span>
          </div>
          <div className="text-slate-500 text-xs mt-0.5">{itemsSummary(order)}</div>
          {isCod && order.cod_collected_at && (
            <div className="text-xs text-amber-700 mt-1.5">
              Collected by <strong>{order.cod_collected_by || 'delivery staff'}</strong> ·{' '}
              {formatDateTime(order.cod_collected_at)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-slate-400">Amount due</div>
          <div className="text-xl font-semibold text-slate-900">{money(order.total)}</div>
        </div>
      </div>
      {children || <RecordPaymentForm orderId={order.id} total={order.total} isCod={isCod} action={action} />}
    </div>
  );
}

export default async function CashierPage({ searchParams }) {
  const ctx = await getAccessContext();
  if (!ctx.user) redirect('/login?next=/admin/cashier');
  // Only the assigned cashier and the owner (admin) can open this page.
  if (!ctx.isAdmin && !ctx.isCashier) redirect('/admin/orders');

  const params = await searchParams;
  const tab = ['cod', 'walkin', 'records'].includes(params?.tab) ? params.tab : 'cod';

  const admin = createAdminClient();
  const cashier = await getCashierProfile();

  const [{ data: codOrders }, { data: walkinOrders }, { data: records }, { data: todayRecords }] =
    await Promise.all([
      admin
        .from('orders')
        .select('*')
        .eq('payment_method', 'cod')
        .neq('payment_status', 'paid')
        .in('order_status', ['to_receive', 'completed'])
        .order('created_at', { ascending: true }),
      admin
        .from('orders')
        .select('*')
        .eq('payment_method', 'walkin')
        .neq('payment_status', 'paid')
        .not('order_status', 'in', '(pending,canceled)')
        .order('created_at', { ascending: true }),
      admin.from('payment_records').select('*').order('created_at', { ascending: false }).limit(100),
      admin
        .from('payment_records')
        .select('method, amount_received')
        .gte('created_at', startOfShopDay().toISOString()),
    ]);

  // COD: "ready to record" = delivery staff reported the cash (or an old
  // delivered order that never was). The rest are still out for delivery.
  const codReady = (codOrders || [])
    .filter((o) => o.cod_collected_at || o.order_status === 'completed')
    .sort((a, b) => new Date(a.cod_collected_at || a.created_at) - new Date(b.cod_collected_at || b.created_at));
  const codWaiting = (codOrders || []).filter((o) => !o.cod_collected_at && o.order_status === 'to_receive');
  const walkin = walkinOrders || [];

  // Order details for the records table.
  const recordOrderIds = [...new Set((records || []).map((r) => r.order_id))];
  const { data: recordOrders } = recordOrderIds.length
    ? await admin.from('orders').select('id, customer_email, shipping_address').in('id', recordOrderIds)
    : { data: [] };
  const orderById = Object.fromEntries((recordOrders || []).map((o) => [o.id, o]));

  const todayTotal = (todayRecords || []).reduce((sum, r) => sum + Number(r.amount_received), 0);
  const todayCod = (todayRecords || []).filter((r) => r.method === 'cod').reduce((s, r) => s + Number(r.amount_received), 0);
  const todayWalkin = (todayRecords || []).filter((r) => r.method === 'walkin').reduce((s, r) => s + Number(r.amount_received), 0);

  const TABS = [
    { key: 'cod', label: 'COD payments', count: codReady.length },
    { key: 'walkin', label: 'Walk-in payments', count: walkin.length },
    { key: 'records', label: 'Payment records', count: null },
  ];

  return (
    <div>
      <AutoRefresh />
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Cashier</h1>
      <p className="text-slate-500 mb-6">
        {ctx.isCashier
          ? `Signed in as ${ctx.staffName}. Record COD and walk-in payments here.`
          : cashier
          ? `Viewing as admin. Assigned cashier: ${cashier.name}.`
          : 'Viewing as admin. No cashier is assigned yet — assign one under Staff.'}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          ["Today's collections", money(todayTotal)],
          ['COD today', money(todayCod)],
          ['Walk-in today', money(todayWalkin)],
          ['To record now', codReady.length + walkin.length],
        ].map(([label, value]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
            <div className="text-xl font-semibold text-slate-900 mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/cashier?tab=${t.key}`}
            className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
              tab === t.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {t.label}
            {!!t.count && (
              <span
                className={`ml-2 text-[10px] font-mono rounded-full px-1.5 py-0.5 ${
                  tab === t.key ? 'bg-white/20' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {tab === 'cod' && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3">
            Cash handed over — ready to record
          </h2>
          {codReady.length === 0 ? (
            <p className="text-slate-500 mb-10">
              Nothing to record. When a delivery staff member reports cash collected, it appears here.
            </p>
          ) : (
            <div className="space-y-3 mb-10">
              {codReady.map((order) => (
                <OrderRow key={order.id} order={order} action={recordPayment} />
              ))}
            </div>
          )}

          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3">
            Out for delivery — cash not reported yet
          </h2>
          {codWaiting.length === 0 ? (
            <p className="text-slate-500">No COD orders are waiting on a delivery.</p>
          ) : (
            <div className="space-y-2">
              {codWaiting.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3"
                >
                  <div className="text-sm text-slate-700">
                    Order #{order.id} <span className="text-slate-400">· {customerLabel(order)}</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {money(order.total)} · waiting for the delivery staff to report the cash
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'walkin' && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3">
            Walk-in orders awaiting payment
          </h2>
          {walkin.length === 0 ? (
            <p className="text-slate-500">No walk-in payments are waiting.</p>
          ) : (
            <div className="space-y-3">
              {walkin.map((order) => (
                <OrderRow key={order.id} order={order} action={recordPayment} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3">
            Payment records — latest {records?.length || 0}
          </h2>
          {(!records || records.length === 0) ? (
            <p className="text-slate-500">No payments have been recorded yet.</p>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Collected by</th>
                    <th className="px-4 py-3">Recorded by</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const order = orderById[r.order_id];
                    const variance = Number(r.amount_received) - Number(r.amount_expected);
                    return (
                      <tr key={r.id} className="border-b border-slate-50 last:border-0 align-top">
                        <td className="px-4 py-3 font-mono">
                          <Link href={`/admin/cashier/receipt/${r.id}`} className="text-indigo-600 hover:underline">
                            {formatReceiptNo(r.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          #{r.order_id}
                          <div className="text-xs text-slate-400">{order ? customerLabel(order) : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.method === 'cod' ? 'COD' : 'Walk-in'} · {paymentModeLabel(r.payment_mode)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {money(r.amount_received)}
                          {Math.abs(variance) > 0.009 && (
                            <div className="text-[10px] text-amber-600 font-normal">
                              {variance > 0 ? '+' : '−'}
                              {money(Math.abs(variance))} vs order
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.collected_by || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{r.recorded_by}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[14rem]">{r.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
