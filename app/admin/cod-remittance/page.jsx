'use client';

import { useCallback, useEffect, useState } from 'react';
import {
loadCodRemittances,
verifyCodRemittance,
} from './actions';

function formatPeso(value) {
return `$${Number(value || 0).toLocaleString('en-Dollar', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
if (!value) return '—';

const date = new Date(value);

if (Number.isNaN(date.getTime())) return '—';

return date.toLocaleString('en-PH', {
dateStyle: 'medium',
timeStyle: 'short',
});
}

export default function CodRemittancePage() {
const [riders, setRiders] = useState([]);
const [totals, setTotals] = useState({
amount: 0,
orders: 0,
riders: 0,
});

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const [selectedRider, setSelectedRider] = useState(null);
const [verifying, setVerifying] = useState(false);

const loadData = useCallback(async (refresh = false) => {
if (refresh) {
setRefreshing(true);
} else {
setLoading(true);
}


setError('');

try {
  const result = await loadCodRemittances();

  if (!result || !result.ok) {
    setRiders([]);
    setTotals({
      amount: 0,
      orders: 0,
      riders: 0,
    });

    setError(
      result?.error || 'Unable to load COD remittances.'
    );

    return;
  }

  setRiders(result.riders || []);

  setTotals(
    result.totals || {
      amount: 0,
      orders: 0,
      riders: 0,
    }
  );
} catch (err) {
  setError(
    err?.message || 'Unable to load COD remittances.'
  );
} finally {
  setLoading(false);
  setRefreshing(false);
}


}, []);

useEffect(() => {
loadData();
}, [loadData]);

async function confirmReceived() {
if (!selectedRider) return;


const orderIds = selectedRider.orders.map(
  (order) => order.id
);

if (orderIds.length === 0) {
  setError('No COD orders were found.');
  return;
}

setVerifying(true);
setError('');
setSuccess('');

try {
  const result = await verifyCodRemittance({
    riderId: selectedRider.riderId,
    orderIds,
  });

  if (!result || !result.ok) {
    setError(
      result?.error ||
        'Unable to confirm the COD remittance.'
    );
    return;
  }

  const amount = formatPeso(result.total);

  setSelectedRider(null);
  setSuccess(`${amount} received and recorded.`);

  await loadData(true);
} catch (err) {
  setError(
    err?.message ||
      'Unable to confirm the COD remittance.'
  );
} finally {
  setVerifying(false);
}


}

return ( <main className="min-h-screen bg-slate-50 text-slate-900"> <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">


    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-amber-700">
          Finance
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          COD Remittance
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Cash collected by delivery riders that still needs
          to be turned over to staff.
        </p>
      </div>

      <button
        type="button"
        onClick={() => loadData(true)}
        disabled={loading || refreshing}
        className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>

    {error && (
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-800">
          COD remittance error
        </p>

        <p className="mt-1 text-sm text-red-700">
          {error}
        </p>
      </div>
    )}

    {success && (
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-800">
          Remittance received
        </p>

        <p className="mt-1 text-sm text-emerald-700">
          {success}
        </p>
      </div>
    )}

    <div className="grid gap-4 md:grid-cols-3">

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Amount to Remit
        </p>

        <p className="mt-3 text-3xl font-bold text-slate-950">
          {formatPeso(totals.amount)}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Outstanding delivered COD
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          COD Orders
        </p>

        <p className="mt-3 text-3xl font-bold text-slate-950">
          {totals.orders}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Waiting for staff acceptance
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Delivery Riders
        </p>

        <p className="mt-3 text-3xl font-bold text-slate-950">
          {totals.riders}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          With outstanding COD
        </p>
      </div>

    </div>

    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-slate-950">
          Pending Rider Remittances
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Confirm the cash after the rider hands it over to staff.
        </p>
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-500">
            Loading COD remittances...
          </p>
        </div>
      ) : riders.length === 0 ? (
        <div className="px-6 py-16 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6 text-slate-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-9h4.5a2.5 2.5 0 010 5H10.5a2.5 2.5 0 010 5H15M7 9h8"
              />
            </svg>
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No COD remittances pending
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            There are currently no delivered COD orders waiting
            for staff to receive the cash.
          </p>

        </div>
      ) : (
        <div className="divide-y divide-slate-100">

          {riders.map((rider) => (
            <div
              key={rider.riderId}
              className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
            >

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-bold text-slate-950">
                    {rider.riderName}
                  </h3>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {rider.orderCount}{' '}
                    {rider.orderCount === 1
                      ? 'COD order'
                      : 'COD orders'}
                  </span>
                </div>

                <p className="mt-2 break-all text-xs text-slate-400">
                  Rider ID: {rider.riderId}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">

                  {rider.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Order #{order.id}
                        </p>

                        <p className="text-sm font-bold text-slate-950">
                          {formatPeso(order.amount)}
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        Delivered {formatDate(order.deliveredAt)}
                      </p>
                    </div>
                  ))}

                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 lg:items-end">

                <div className="lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Amount to Remit
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {formatPeso(rider.amount)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRider(rider);
                    setError('');
                    setSuccess('');
                  }}
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Confirm Received
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </section>
  </div>

  {selectedRider && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">

      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-sm font-semibold text-amber-700">
              COD Remittance
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Confirm cash received
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setSelectedRider(null)}
            disabled={verifying}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>

        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">

          <p className="text-sm text-slate-500">
            Delivery rider
          </p>

          <p className="mt-1 font-semibold text-slate-950">
            {selectedRider.riderName}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">

            <div>
              <p className="text-sm text-slate-500">
                COD orders
              </p>

              <p className="mt-1 text-lg font-bold text-slate-950">
                {selectedRider.orderCount}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">
                Cash received
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950">
                {formatPeso(selectedRider.amount)}
              </p>
            </div>

          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          Confirm only after the rider has handed over the full
          COD cash amount to staff.
        </p>

        <div className="mt-6 flex gap-3">

          <button
            type="button"
            onClick={() => setSelectedRider(null)}
            disabled={verifying}
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirmReceived}
            disabled={verifying}
            className="h-11 flex-1 rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? 'Confirming...' : 'Confirm Received'}
          </button>

        </div>

      </div>
    </div>
  )}
</main>


);
}
