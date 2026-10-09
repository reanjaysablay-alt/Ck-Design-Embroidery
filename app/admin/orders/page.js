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
  assignDeliveryUser,
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
        Delivery fee OK — ${fee.toFixed(2)}
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

// Only active, in-progress orders live here. The moment an order is
// marked Completed, Picked Up, or Canceled it drops off this list
// automatically (it's simply no longer in this query) and shows up on
// the History page instead.
export default async function AdminOrdersPage({ searchParams }) {
  await redirectIfCashier();
  const params = await searchParams;
  const activeTab = TABS.find((t) => t.key === params?.tab) || TABS[0];

  // Only full admins can assign riders (assignDeliveryUser requires admin).
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
  const riderEmailById = Object.fromEntries(riders.map((r) => [r.id, r.email]));

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

  const visibleOrders = list.filter((o) => activeTab.statuses.includes(o.order_status));

  return (
    <div>
      <AutoRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <Link
          href="/admin/orders/history"
          className="text-xs uppercase tracking-widest text-slate-500 hover:text-indigo-600"
        >
          View History →
        </Link>
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

                  {canAssign &&
                    !hasRider &&
                    order.production_stage === 'ready_for_fulfillment' &&
                    order.payment_method !== 'walkin' && (
                      <AssignRider
                        id={order.id}
                        riders={riders}
                        action={assignDeliveryUser}
                      />
                    )}

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