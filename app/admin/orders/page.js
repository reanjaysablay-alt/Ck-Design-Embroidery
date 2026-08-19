import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getDesignDownloadUrl } from '@/lib/upload';
import {
  acceptOrder,
  markShipped,
  markCompleted,
  markReadyForPickup,
  markPickedUp,
  cancelOrder,
  setCustomizationFee,
} from '@/app/admin/actions';
import {
  AcceptButton,
  ShipButton,
  ReceivedButton,
  ReadyForPickupButton,
  PickedUpButton,
  CancelButton,
} from '@/components/admin/OrderActionButtons';
import OrderCard, { buildDesignUrls } from '@/components/admin/OrderCard';

const TABS = [
  { key: 'all', label: 'All Orders', statuses: ['pending', 'to_ship', 'to_receive', 'preparing', 'ready_for_pickup'] },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'production', label: 'In Production', statuses: ['to_ship', 'preparing'] },
  { key: 'ready', label: 'Ready', statuses: ['to_receive', 'ready_for_pickup'] },
];

function StatCard({ label, value, accent }) {
  const accents = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1 min-w-[160px] shadow-sm">
      <p className="text-slate-500 text-sm mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-slate-900">{value}</span>
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${accents[accent]}`}>Active</span>
      </div>
    </div>
  );
}

// Only active, in-progress orders live here. The moment an order is
// marked Completed, Picked Up, or Canceled it drops off this list
// automatically (it's simply no longer in this query) and shows up on
// the History page instead.
export default async function AdminOrdersPage({ searchParams }) {
  const params = await searchParams;
  const activeTab = TABS.find((t) => t.key === params?.tab) || TABS[0];

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .in('order_status', ['pending', 'to_ship', 'to_receive', 'preparing', 'ready_for_pickup'])
    .order('created_at', { ascending: false });

  const designUrls = await buildDesignUrls(orders, getDesignDownloadUrl);

  const pendingCount = orders?.filter((o) => o.order_status === 'pending').length || 0;
  const productionCount = orders?.filter((o) => ['to_ship', 'preparing'].includes(o.order_status)).length || 0;
  const readyCount = orders?.filter((o) => ['to_receive', 'ready_for_pickup'].includes(o.order_status)).length || 0;

  const visibleOrders = orders?.filter((o) => activeTab.statuses.includes(o.order_status)) || [];

  return (
    <div>
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
          const feeLocked = ['to_receive', 'ready_for_pickup', 'picked_up'].includes(order.order_status);
          return (
            <OrderCard
              key={order.id}
              order={order}
              designUrls={designUrls}
              feeAction={feeLocked ? undefined : setCustomizationFee}
              actions={
                <>
                  {order.order_status === 'pending' && (
                    <div className="flex flex-wrap gap-3">
                      <AcceptButton
                        id={order.id}
                        action={acceptOrder}
                        label={order.payment_method === 'walkin' ? 'Accept — Prepare Order' : 'Accept — To Ship'}
                      />
                      <CancelButton id={order.id} action={cancelOrder} />
                    </div>
                  )}
                  {order.order_status === 'to_ship' && (
                    <div className="flex flex-wrap gap-3">
                      <ShipButton id={order.id} action={markShipped} />
                      <CancelButton id={order.id} action={cancelOrder} />
                    </div>
                  )}
                  {order.order_status === 'to_receive' && (
                    <div className="flex flex-wrap gap-3">
                      <ReceivedButton id={order.id} action={markCompleted} />
                      <CancelButton id={order.id} action={cancelOrder} />
                    </div>
                  )}
                  {order.order_status === 'preparing' && (
                    <div className="flex flex-wrap gap-3">
                      <ReadyForPickupButton id={order.id} action={markReadyForPickup} />
                      <CancelButton id={order.id} action={cancelOrder} />
                    </div>
                  )}
                  {order.order_status === 'ready_for_pickup' && (
                    <div className="flex flex-wrap gap-3">
                      <PickedUpButton id={order.id} action={markPickedUp} />
                      <CancelButton id={order.id} action={cancelOrder} />
                    </div>
                  )}
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
