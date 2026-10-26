'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadCodRemittances, verifyCodRemittance } from './actions';
import QrScannerModal from '@/components/admin/QrScannerModal';

// Currency + locale for amounts and dates on this page (UAE dirhams).
// Same format as the rider dashboard: "U+20C3 1,250.00".
const CURRENCY_CODE = 'AED';
const LOCALE = 'en-AE';

function formatMoney(value) {
  return `\u20C3\u00A0${Number(value || 0).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/*
 * The rider's dashboard shows a QR containing "COD:<riderId>".
 * We also accept an order label QR (the order id) and find the rider
 * who is holding that order.
 */
function findRiderForCode(riders, raw) {
  const text = String(raw || '').trim();
  if (!text) return { rider: null, riderId: '' };

  if (/^cod:/i.test(text)) {
    const riderId = text.slice(4).trim();
    return {
      rider: riders.find((r) => String(r.riderId) === riderId) || null,
      riderId,
    };
  }

  const code = text.includes('/')
    ? text.split(/[/?#]/).filter(Boolean).pop() || ''
    : text;
  const upper = code.toUpperCase();

  const rider =
    riders.find((r) => r.orders.some((o) => String(o.id) === code)) ||
    (code.length >= 6
      ? riders.find((r) =>
          r.orders.some((o) => String(o.id).toUpperCase().startsWith(upper))
        )
      : null) ||
    null;

  return { rider, riderId: '' };
}

function QrIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <rect x="7" y="7" width="4" height="4" rx="0.5" />
      <rect x="13" y="7" width="4" height="4" rx="0.5" />
      <rect x="7" y="13" width="4" height="4" rx="0.5" />
      <path d="M13 13h4v4" />
    </svg>
  );
}

export default function CodRemittancePage() {
  const [riders, setRiders] = useState([]);
  const [totals, setTotals] = useState({ amount: 0, orders: 0, riders: 0 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

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
        setTotals({ amount: 0, orders: 0, riders: 0 });
        setError(result?.error || 'Unable to load COD remittances.');
        return;
      }

      setRiders(result.riders || []);
      setTotals(result.totals || { amount: 0, orders: 0, riders: 0 });
    } catch (err) {
      setError(err?.message || 'Unable to load COD remittances.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scanned a rider QR (or an order label): jump straight to the confirm window.
  async function handleScanned(raw) {
    setScanOpen(false);
    setError('');
    setSuccess('');
    setNotice('');

    // Make sure we match against the freshest list.
    let list = riders;

    try {
      const fresh = await loadCodRemittances();
      if (fresh?.ok) {
        list = fresh.riders || [];
        setRiders(list);
        setTotals(fresh.totals || { amount: 0, orders: 0, riders: 0 });
      }
    } catch {
      // Fall back to the list we already have.
    }

    const { rider, riderId } = findRiderForCode(list, raw);

    if (rider) {
      setSelectedRider(rider);
      return;
    }

    if (riderId) {
      setNotice('This rider has no COD cash waiting to be received.');
    } else {
      setError(
        'No pending COD was found for that code. Check that it is a rider QR or an order label that is still waiting for remittance.'
      );
    }
  }

  async function confirmReceived() {
    if (!selectedRider) return;

    const orderIds = selectedRider.orders.map((order) => order.id);

    if (orderIds.length === 0) {
      setError('No COD orders were found.');
      return;
    }

    setVerifying(true);
    setError('');
    setSuccess('');
    setNotice('');

    try {
      const result = await verifyCodRemittance({
        riderId: selectedRider.riderId,
        orderIds,
      });

      if (!result || !result.ok) {
        setError(result?.error || 'Unable to confirm the COD remittance.');
        return;
      }

      const amount = formatMoney(result.total);

      setSelectedRider(null);
      setSuccess(`${amount} received and recorded.`);

      if (result.failed?.length) {
        setError(
          `${result.failed.length} order(s) could not be recorded: ${result.failed
            .map((f) => `#${f.id} (${f.error})`)
            .join('; ')}`
        );
      }

      await loadData(true);
    } catch (err) {
      setError(err?.message || 'Unable to confirm the COD remittance.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Finance
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
              COD Remittance
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Cash collected by delivery riders that still needs to be turned over
              to staff. Scan the rider&apos;s QR to confirm it in seconds.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setNotice('');
                setScanOpen(true);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <QrIcon />
              Scan QR
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
            <p className="font-semibold text-red-800 dark:text-red-300">
              COD remittance error
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {notice && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {notice}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Remittance received
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Amount to Remit
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-slate-100">
              {formatMoney(totals.amount)}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Outstanding delivered COD
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              COD Orders
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-slate-100">
              {totals.orders}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Waiting for staff acceptance
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Delivery Riders
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-slate-100">
              {totals.riders}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              With outstanding COD
            </p>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-700 sm:px-6">
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Pending Rider Remittances
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Confirm the cash after the rider hands it over to staff.
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Loading COD remittances...
              </p>
            </div>
          ) : riders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
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

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                No COD remittances pending
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                There are currently no delivered COD orders waiting for staff to
                receive the cash.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {riders.map((rider) => (
                <div
                  key={rider.riderId}
                  className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-slate-950 dark:text-slate-100">
                        {rider.riderName}
                      </h3>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        {rider.orderCount}{' '}
                        {rider.orderCount === 1 ? 'COD order' : 'COD orders'}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-xs text-slate-400">
                      Rider ID: {rider.riderId}
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {rider.orders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Order #{order.id}
                            </p>

                            <p className="text-sm font-bold text-slate-950 dark:text-slate-100">
                              {formatMoney(order.amount)}
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

                      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-100">
                        {formatMoney(rider.amount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRider(rider);
                        setError('');
                        setSuccess('');
                        setNotice('');
                      }}
                      className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
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

      {scanOpen && (
        <QrScannerModal
          title="Scan rider QR"
          hint="Ask the rider to open the COD Remittance tab and show their QR. An order label QR works too."
          placeholder="Or type an order number"
          onResult={handleScanned}
          onClose={() => setScanOpen(false)}
        />
      )}

      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  COD Remittance
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
                  Confirm cash received
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRider(null)}
                disabled={verifying}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
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

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Delivery rider
              </p>

              <p className="mt-1 font-semibold text-slate-950 dark:text-slate-100">
                {selectedRider.riderName}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    COD orders
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-100">
                    {selectedRider.orderCount}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Cash received
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-100">
                    {formatMoney(selectedRider.amount)}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Confirm only after the rider has handed over the full COD cash amount
              to staff.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRider(null)}
                disabled={verifying}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmReceived}
                disabled={verifying}
                className="h-11 flex-1 rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
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
