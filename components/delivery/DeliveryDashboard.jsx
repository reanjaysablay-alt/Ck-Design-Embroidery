'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { money, getStage, formatDateTime, isToday } from '@/lib/delivery';
import AvailableCard from './AvailableCard';
import ActiveDelivery from './ActiveDelivery';

const supabase = createClient();

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-3xl" aria-hidden="true">{icon}</p>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function HistoryCard({ order }) {
  const isCod = order.payment_method === 'cod';
  const net =
    Number(order.cod_collected_amount || 0) - Number(order.cod_change || 0);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Order #{order.id}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Delivered {formatDateTime(order.delivered_at)}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Delivered
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Customer</p>
          <p className="mt-0.5 text-slate-800">{order.customer_name || 'Customer'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Received by</p>
          <p className="mt-0.5 text-slate-800">{order.delivery_recipient_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Order total</p>
          <p className="mt-0.5 text-slate-800">{money(order.total_amount)}</p>
        </div>
        {isCod && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">COD collected</p>
            <p className="mt-0.5 text-slate-800">{money(net)}</p>
          </div>
        )}
      </div>

      {order.proof_url && (
        <a
          href={order.proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-blue-600"
        >
          View proof photo
        </a>
      )}
    </article>
  );
}

export default function DeliveryDashboard({
  user,
  availableOrders,
  myOrders,
  initialError,
}) {
  const router = useRouter();

  const activeOrders = useMemo(
    () => myOrders.filter((o) => getStage(o) !== 'delivered'),
    [myOrders]
  );

  const deliveredOrders = useMemo(
    () => myOrders.filter((o) => getStage(o) === 'delivered'),
    [myOrders]
  );

  const deliveredToday = useMemo(
    () => deliveredOrders.filter((o) => isToday(o.delivered_at)),
    [deliveredOrders]
  );

  const codToday = useMemo(
    () =>
      deliveredToday
        .filter((o) => o.payment_method === 'cod')
        .reduce(
          (sum, o) =>
            sum + Number(o.cod_collected_amount || 0) - Number(o.cod_change || 0),
          0
        ),
    [deliveredToday]
  );

  const [tab, setTab] = useState(activeOrders.length > 0 ? 'active' : 'available');

  // Live updates: refresh server data instead of reloading the whole page.
  const timer = useRef(null);

  useEffect(() => {
    function scheduleRefresh() {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    }

    const channel = supabase
      .channel(`delivery-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        scheduleRefresh
      )
      .subscribe();

    // Fallback in case realtime is not enabled for the orders table.
    const poll = setInterval(() => router.refresh(), 30000);

    return () => {
      clearTimeout(timer.current);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user.id, router]);

  const tabs = [
    { key: 'available', label: 'Available', count: availableOrders.length },
    { key: 'active', label: 'My Deliveries', count: activeOrders.length },
    { key: 'history', label: 'History', count: deliveredOrders.length },
  ];

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Rider</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Deliveries
            </h1>
            <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            Refresh
          </button>
        </header>

        {initialError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{initialError}</p>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Available</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{availableOrders.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">In progress</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{activeOrders.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Delivered today</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{deliveredToday.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">COD collected today</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{money(codToday)}</p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {tab === 'available' && (
            <>
              {availableOrders.length === 0 ? (
                <EmptyState
                  icon="📦"
                  title="No orders waiting"
                  text="New orders show up here as soon as packing is finished."
                />
              ) : (
                availableOrders.map((order) => (
                  <AvailableCard
                    key={order.id}
                    order={order}
                    onAccepted={() => setTab('active')}
                  />
                ))
              )}
            </>
          )}

          {tab === 'active' && (
            <>
              {activeOrders.length === 0 ? (
                <EmptyState
                  icon="🛵"
                  title="No active deliveries"
                  text="Accept an order from the Available tab to get started."
                />
              ) : (
                activeOrders.map((order) => (
                  <ActiveDelivery key={order.id} order={order} />
                ))
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {deliveredOrders.length === 0 ? (
                <EmptyState
                  icon="✅"
                  title="No completed deliveries yet"
                  text="Finished deliveries and their proof photos appear here."
                />
              ) : (
                deliveredOrders.map((order) => (
                  <HistoryCard key={order.id} order={order} />
                ))
              )}
            </>
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-3 px-2 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative px-2 py-3.5 text-sm font-medium transition ${
                tab === t.key ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                    tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-slate-900" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
