import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext } from '@/lib/cashier';
import { formatTime, toShopTime } from '@/lib/formatDate';
import {
  VIEWS,
  buildReport,
  buildCalendar,
  reportStartISO,
  calendarRangeISO,
  cardsStartISO,
  monthKeyOf,
  shiftMonth,
  monthLabel,
  dayLabel,
} from '@/lib/revenueReport';
import AutoRefresh from '@/components/admin/AutoRefresh';
import PrintButton from '@/components/admin/PrintButton';

export const metadata = { title: 'Revenue — Stitchhouse Admin' };
export const dynamic = 'force-dynamic';

const money = (n) =>
  `\u20C3\u00A0${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const METHODS = [
  { key: 'paypal', label: 'PayPal', bar: 'bg-indigo-500', dot: 'bg-indigo-500' },
  { key: 'cod', label: 'Cash on Delivery', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'walkin', label: 'Walk-in', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
];
const METHOD_LABEL = { paypal: 'PayPal', cod: 'COD', walkin: 'Walk-in' };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Supabase returns at most 1000 rows per request — read every page.
async function fetchAll(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await makeQuery().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

// Paid PayPal orders + cashier-recorded COD / walk-in payments in
// [sinceISO, untilISO).
async function loadRecords(admin, sinceISO, untilISO) {
  const [paypalOrders, payments] = await Promise.all([
    fetchAll(() => {
      let q = admin
        .from('orders')
        .select('id, total, created_at')
        .eq('payment_method', 'paypal')
        .eq('payment_status', 'paid')
        .neq('order_status', 'canceled')
        .gte('created_at', sinceISO);
      if (untilISO) q = q.lt('created_at', untilISO);
      return q.order('created_at', { ascending: true }).order('id', { ascending: true });
    }),
    fetchAll(() => {
      let q = admin
        .from('payment_records')
        .select('id, order_id, method, amount_received, created_at')
        .gte('created_at', sinceISO);
      if (untilISO) q = q.lt('created_at', untilISO);
      return q.order('created_at', { ascending: true }).order('id', { ascending: true });
    }),
  ]);

  return [
    ...paypalOrders.map((o) => ({ method: 'paypal', amount: o.total, at: o.created_at, orderId: o.id })),
    ...payments.map((p) => ({ method: p.method, amount: p.amount_received, at: p.created_at, orderId: p.order_id })),
  ];
}

export default async function RevenuePage({ searchParams }) {
  const ctx = await getAccessContext();
  if (!ctx.user) redirect('/login?next=/admin/revenue');
  // Admin and staff only — the cashier's dashboard is payments-only.
  if (ctx.isCashier) redirect('/admin/cashier');
  if (!ctx.role) redirect('/');

  const params = await searchParams;
  const isCalendar = params?.view === 'calendar';
  const view = VIEWS[params?.view] ? params.view : 'daily';

  const nowMs = toShopTime().getTime();
  const currentMonth = monthKeyOf(nowMs);
  let monthKey = /^\d{4}-(0[1-9]|1[0-2])$/.test(params?.month || '') ? params.month : currentMonth;
  if (monthKey > currentMonth) monthKey = currentMonth;
  const selectedDay =
    /^\d{4}-\d{2}-\d{2}$/.test(params?.day || '') && params.day.startsWith(monthKey) ? params.day : null;

  const admin = createAdminClient();

  let report = null;
  let calendar = null;
  let cards = null;
  let loadError = '';
  try {
    if (isCalendar) {
      const range = calendarRangeISO(monthKey);
      const [cardRecords, monthRecords] = await Promise.all([
        loadRecords(admin, cardsStartISO(nowMs)),
        loadRecords(admin, range.sinceISO, range.untilISO),
      ]);
      cards = buildReport(cardRecords, 'daily', nowMs).cards;
      calendar = buildCalendar(monthRecords, monthKey, nowMs);
    } else {
      const records = await loadRecords(admin, reportStartISO(view, nowMs));
      report = buildReport(records, view, nowMs);
      cards = report.cards;
    }
  } catch (err) {
    console.error('Revenue report error:', err.message);
    loadError = err.message;
  }

  const cfg = VIEWS[view];
  const TABS = [
    ...Object.entries(VIEWS).map(([key, v]) => ({ key, label: v.label, href: `/admin/revenue?view=${key}` })),
    { key: 'calendar', label: 'Calendar', href: '/admin/revenue?view=calendar' },
  ];
  const activeTab = isCalendar ? 'calendar' : view;

  return (
    <div>
      <AutoRefresh intervalMs={30000} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-1 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-0.5">Revenue report</h1>
          <p className="text-slate-500 text-xs">
            Money actually received: paid PayPal orders plus the COD and walk-in payments the cashier
            recorded. Canceled and refunded orders are not counted.
          </p>
        </div>
        <PrintButton label="Print report" />
      </div>
      <h1 className="hidden print:block text-xl font-semibold mb-1">
        Revenue report — {isCalendar ? `Calendar, ${monthLabel(monthKey)}` : `${cfg.label} (${cfg.hint})`}
      </h1>

      {loadError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load the revenue report: {loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 mb-5">
            {[
              ['Today', cards.today],
              ['This week', cards.week],
              ['This month', cards.month],
            ].map(([label, value]) => (
              <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
                <div className="text-xl font-semibold text-slate-900 mt-0.5">{money(value)}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4 print:hidden">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  activeTab === t.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {isCalendar ? (
            <CalendarSection calendar={calendar} monthKey={monthKey} currentMonth={currentMonth} selectedDay={selectedDay} />
          ) : (
            <PeriodSection report={report} view={view} cfg={cfg} />
          )}
        </>
      )}
    </div>
  );
}

function CalendarSection({ calendar, monthKey, currentMonth, selectedDay }) {
  const base = `/admin/revenue?view=calendar`;
  const prev = shiftMonth(monthKey, -1);
  const next = shiftMonth(monthKey, 1);
  const canNext = monthKey < currentMonth;
  const detail = selectedDay ? calendar.dayPayments(selectedDay) : [];
  const detailTotal = detail.reduce((s, p) => s + p.amount, 0);

  const navBtn =
    'text-xs font-medium px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200 hover:border-slate-300';

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Calendar</div>
            <div className="text-lg font-semibold text-slate-900">{monthLabel(monthKey)}</div>
          </div>
          <div className="flex items-center gap-1.5 print:hidden">
            <Link href={`${base}&month=${prev}`} className={navBtn} aria-label="Previous month">
              ← Prev
            </Link>
            {monthKey !== currentMonth && (
              <Link href={base} className={navBtn}>
                This month
              </Link>
            )}
            {canNext ? (
              <Link href={`${base}&month=${next}`} className={navBtn} aria-label="Next month">
                Next →
              </Link>
            ) : (
              <span className={`${navBtn} opacity-40 cursor-not-allowed`}>Next →</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Month total</div>
            <div className="text-sm font-semibold text-slate-900">{money(calendar.monthTotal)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Days with sales</div>
            <div className="text-sm font-semibold text-slate-900">
              {calendar.daysWithSales} · {calendar.monthCount} payment{calendar.monthCount === 1 ? '' : 's'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Best day</div>
            <div className="text-sm font-semibold text-slate-900">
              {calendar.bestDay ? `${money(calendar.bestDay.total)} · ${calendar.bestDay.key.slice(8)}` : '—'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.1fr)] gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-[10px] uppercase tracking-wider text-slate-400 text-center">
                  {d}
                </div>
              ))}
              <div className="text-[10px] uppercase tracking-wider text-slate-400 text-center">Week</div>
            </div>

            <div className="space-y-1">
              {calendar.weeks.map((week) => (
                <div
                  key={week.cells[0].key}
                  className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.1fr)] gap-1"
                >
                  {week.cells.map((c) => {
                    if (!c.inMonth) {
                      return <div key={c.key} className="min-h-[4.5rem] rounded-lg bg-slate-50/40" />;
                    }
                    const alpha = calendar.max ? 0.08 + (c.total / calendar.max) * 0.3 : 0;
                    const selected = selectedDay === c.key;
                    return (
                      <Link
                        key={c.key}
                        href={`${base}&month=${monthKey}&day=${c.key}`}
                        scroll={false}
                        className={`min-h-[4.5rem] rounded-lg border px-1.5 py-1 flex flex-col justify-between transition-colors ${
                          selected
                            ? 'border-indigo-600 ring-2 ring-indigo-200'
                            : c.isToday
                            ? 'border-indigo-400'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ backgroundColor: c.total > 0 ? `rgba(79, 70, 229, ${alpha})` : '#fff' }}
                      >
                        <span
                          className={`text-[11px] font-medium ${
                            c.isToday ? 'text-indigo-700' : c.isFuture ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {c.date}
                        </span>
                        {c.total > 0 && (
                          <span>
                            <span className="block text-[11px] sm:text-xs font-semibold text-slate-900 leading-tight">
                              {money(c.total)}
                            </span>
                            <span className="block text-[9px] text-slate-500 leading-tight">
                              {c.count} payment{c.count === 1 ? '' : 's'}
                            </span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  <div className="min-h-[4.5rem] rounded-lg bg-slate-50 px-1.5 py-1 flex flex-col justify-end text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Week</span>
                    <span className="text-xs font-semibold text-slate-900">{money(week.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 print:hidden">
          Click a day to see the payments that make it up. Darker days earned more.
        </p>
      </div>

      {selectedDay && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Payments on</div>
              <div className="text-sm font-semibold text-slate-900">{dayLabel(selectedDay)}</div>
            </div>
            <div className="text-sm font-semibold text-slate-900">{money(detailTotal)}</div>
          </div>
          {detail.length === 0 ? (
            <p className="text-sm text-slate-500 px-4 py-6 text-center">No payments were received on this day.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((p, i) => (
                  <tr key={`${p.orderId}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-1.5 text-slate-500 whitespace-nowrap">{formatTime(p.at)}</td>
                    <td className="px-4 py-1.5 text-slate-700">{p.orderId ? `#${p.orderId}` : '—'}</td>
                    <td className="px-4 py-1.5 text-slate-600">{METHOD_LABEL[p.method] || p.method}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-slate-900">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

function PeriodSection({ report, view, cfg }) {
  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              {cfg.label} · {cfg.hint}
            </div>
            <div className="text-2xl font-semibold text-slate-900">{money(report.totals.total)}</div>
            <div className="text-xs text-slate-500">
              {report.totals.count} payment{report.totals.count === 1 ? '' : 's'}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {METHODS.map((m) => (
              <div key={m.key} className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${m.dot}`} />
                {m.label}: <span className="font-medium text-slate-900">{money(report.totals[m.key])}</span>
              </div>
            ))}
          </div>
        </div>

        {report.totals.total === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No revenue recorded in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-48 min-w-[480px] pt-2">
              {report.buckets.map((b) => {
                const pct = report.max ? (b.total / report.max) * 100 : 0;
                return (
                  <div key={b.start} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <div
                      className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                      style={{ height: `${pct}%`, minHeight: b.total > 0 ? 2 : 0 }}
                      title={`${b.label}: ${money(b.total)}`}
                    >
                      {METHODS.map((m) =>
                        b[m.key] > 0 ? (
                          <div key={m.key} className={m.bar} style={{ height: `${(b[m.key] / b.total) * 100}%` }} />
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 min-w-[480px] mt-1">
              {report.buckets.map((b, i) => (
                <div key={b.start} className="flex-1 text-center text-[9px] text-slate-400 truncate">
                  {view === 'daily' && i % 2 === 1 ? '' : b.short}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2 text-right">Payments</th>
              <th className="px-3 py-2 text-right">PayPal</th>
              <th className="px-3 py-2 text-right">COD</th>
              <th className="px-3 py-2 text-right">Walk-in</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...report.buckets].reverse().map((b) => (
              <tr key={b.start} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{b.label}</td>
                <td className="px-3 py-1.5 text-right text-slate-500">{b.count}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{money(b.paypal)}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{money(b.cod)}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{money(b.walkin)}</td>
                <td className="px-3 py-1.5 text-right font-medium text-slate-900">{money(b.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{report.totals.count}</td>
              <td className="px-3 py-2 text-right">{money(report.totals.paypal)}</td>
              <td className="px-3 py-2 text-right">{money(report.totals.cod)}</td>
              <td className="px-3 py-2 text-right">{money(report.totals.walkin)}</td>
              <td className="px-3 py-2 text-right">{money(report.totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
