import { redirectIfCashier } from '@/lib/cashier';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { getDesignDownloadUrl } from '@/lib/upload';
import {
  acceptOrder,
  cancelOrder,
  setCustomizationFee,
  setDeliveryFee,
  setProductionStage,
  reportCodCollected,
  uploadDesignProof,
  getDeliveryUsers,
} from '@/app/admin/actions';
import {
  AcceptButton,
  CancelButton,
} from '@/components/admin/OrderActionButtons';
import OrderCard, { buildDesignUrls } from '@/components/admin/OrderCard';
import AutoRefresh from '@/components/admin/AutoRefresh';
import AssignRider from '@/components/admin/AssignRider';

// Always compute fresh from the database — active orders change
// constantly and must never show a cached/stale snapshot.
export const dynamic = 'force-dynamic';

const ACTIVE_STATUSES = ['pending', 'to_ship', 'to_receive', 'preparing', 'ready_for_pickup'];
const FEE_LOCKED_STATUSES = ['to_receive', 'ready_for_pickup', 'picked_up'];

const TABS = [
  { key: 'all', label: 'All Orders', statuses: ACTIVE_STATUSES },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'production', label: 'In Production', statuses: ['to_ship', 'preparing'] },
  { key: 'ready', label: 'Ready', statuses: ['to_receive', 'ready_for_pickup'] },
];

const STAT_ACCENTS = {
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
  indigo: 'bg-indigo-50 text-indigo-700',
};

// Currency + locale for amounts on this page (UAE dirhams).
// Same format as the rider dashboard: "U+20C3 1,250.00".
// Tip: move this into a shared file (e.g. '@/lib/money') and import it
// everywhere instead of keeping copies.
const CURRENCY_CODE = 'AED';
const LOCALE = 'en-AE';

function money(value) {
  const amount = Number(value || 0);

  return (
    `\u20C3\u00A0` +
    amount.toLocaleString(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1 min-w-[160px] shadow-sm">
      <p className="text-slate-500 text-sm mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-slate-900">{value}</span>
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STAT_ACCENTS[accent]}`}>
          Active
        </span>
      </div>
    </div>
  );
}

// Delivery fee status for COD orders. Shown on the card so staff can see
// at a glance whether the fee is settled before the order goes out.
function DeliveryFeeStatus({ order, feeLocked }) {
  if (order.payment_method !== 'cod') return null;

  const fee = Number(order.delivery_fee || 0);

  if (fee > 0) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
        Delivery fee OK — {money(fee)}
      </div>
    );
  }

  if (feeLocked) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
        No delivery fee was added
      </div>
    );
  }

  return (
    <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
      Delivery fee not set — add it above before this order goes out for delivery
    </div>
  );
}

// An order is ready for delivery as soon as production marks it
// "ready_for_fulfillment" (and it isn't walk-in or already assigned).
// From then on it can be handed to a rider — printing the shipping label
// is optional and does not block anything.
function needsPacking(order) {
  return (
    order.production_stage === 'ready_for_fulfillment' &&
    order.payment_method !== 'walkin' &&
    !order.delivery_user_id
  );
}

function PackingStatus({ order }) {
  if (!needsPacking(order)) return null;

  const printed = Boolean(order.label_printed_at);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Link
        href="/admin/packing"
        className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 w-fit"
      >
        Ready for delivery — can be handed to a rider now →
      </Link>

      {/* Printing the label is optional and never blocks delivery. */}
      <Link
        href={`/admin/packing/${order.id}/label`}
        className="text-xs uppercase tracking-widest text-slate-500 hover:text-indigo-600"
      >
        {printed ? 'Label printed · Reprint' : 'Print label (optional)'}
      </Link>
    </div>
  );
}

// Only active, in-progress orders live here. The moment an order is
// marked Completed, Picked Up, or Canceled it drops off this list
// automatically (it's simply no longer in this query) and shows up on
// the History page instead.
export default async function AdminOrdersPage({ searchParams }) {
  await redirectIfCashier();
  const params = await searchParams;
  const activeTab = TABS.find((t) => t.key === params?.tab) || TABS[0];

  // Only full admins can see the rider list (assignDeliveryUser requires admin).
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
  const riderEmailById = Object.fromEntries(riders.map((r) => [r.id, r.name || r.email]));

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .in('order_status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false });

  const designUrls = await buildDesignUrls(orders, getDesignDownloadUrl);

  const list = orders || [];
  const pendingCount = list.filter((o) => o.order_status === 'pending').length;
  const productionCount = list.filter((o) => ['to_ship', 'preparing'].includes(o.order_status)).length;
  const readyCount = list.filter((o) => ['to_receive', 'ready_for_pickup'].includes(o.order_status)).length;

  // Orders that finished production and are waiting to be handed to a rider.
  const toPackCount = list.filter((o) => needsPacking(o)).length;

  const visibleOrders = list.filter((o) => activeTab.statuses.includes(o.order_status));

  return (
    <div>
      <AutoRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <div className="flex items-center gap-5">
          <Link
            href="/admin/packing"
            className="text-xs uppercase tracking-widest text-slate-500 hover:text-indigo-600"
          >
            Ready for rider{toPackCount > 0 ? ` (${toPackCount})` : ''} →
          </Link>
          <Link
            href="/admin/orders/history"
            className="text-xs uppercase tracking-widest text-slate-500 hover:text-indigo-600"
          >
            View History →
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex flex-wrap gap-4 mb-8">
        <StatCard label="Pending Orders" value={pendingCount} accent="amber" />
        <StatCard label="In Production" value={productionCount} accent="blue" />
        <StatCard label="Ready to Ship / Pickup" value={readyCount} accent="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/orders' : `/admin/orders?tab=${tab.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab.key === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {visibleOrders.map((order) => {
          const feeLocked = FEE_LOCKED_STATUSES.includes(order.order_status);
          const hasRider = Boolean(order.delivery_user_id);

          return (
            <OrderCard
              key={order.id}
              order={order}
              designUrls={designUrls}
              feeAction={feeLocked ? undefined : setCustomizationFee}
              deliveryFeeAction={
                order.payment_method === 'cod' && !feeLocked ? setDeliveryFee : undefined
              }
              stageAction={setProductionStage}
              collectAction={reportCodCollected}
              proofAction={uploadDesignProof}
              actions={
                <>
                  <DeliveryFeeStatus order={order} feeLocked={feeLocked} />

                  {hasRider && (
                    <div className="mt-4 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 w-fit">
                      Rider: {riderEmailById[order.delivery_user_id] || 'assigned'}
                      {order.delivery_stage ? ` — ${order.delivery_stage.replace(/_/g, ' ')}` : ''}
                    </div>
                  )}

                  <PackingStatus order={order} />

                  <div className="flex flex-wrap gap-3 mt-4">
                    {order.order_status === 'pending' && (
                      <AcceptButton id={order.id} action={acceptOrder} label="Accept Order" />
                    )}
                    <CancelButton id={order.id} action={cancelOrder} />
                  </div>
                </>
              }
            />
          );
        })}
        {visibleOrders.length === 0 && (
          <p className="text-slate-500">No orders in this view.</p>
        )}
      </div>
    </div>
  );
}