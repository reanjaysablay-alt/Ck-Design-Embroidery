import { toShopTime } from '@/lib/formatDate';

// Revenue = money actually received:
//   - PayPal orders that are paid (not canceled / refunded), dated when the
//     order was placed (that is when PayPal captured the payment)
//   - COD and walk-in payments the cashier recorded (payment_records),
//     dated when the cashier recorded them
// Days, weeks (Monday to Sunday) and months are all cut in the shop's
// timezone (Abu Dhabi), not the server's.

export const VIEWS = {
  daily: { label: 'Daily', count: 30, hint: 'Last 30 days' },
  weekly: { label: 'Weekly', count: 12, hint: 'Last 12 weeks (Mon–Sun)' },
  monthly: { label: 'Monthly', count: 12, hint: 'Last 12 months' },
};

const DAY = 86400000;
// Offset of the shop's clock from UTC, in ms (+4h, no daylight saving).
export const SHOP_OFFSET = toShopTime('1970-01-01T00:00:00Z').getTime();

function startOfDay(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function startOfWeek(ms) {
  const s = startOfDay(ms);
  const dow = new Date(s).getUTCDay(); // 0 = Sunday
  return s - ((dow + 6) % 7) * DAY;
}
function startOfMonth(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function bucketStart(view, ms) {
  if (view === 'weekly') return startOfWeek(ms);
  if (view === 'monthly') return startOfMonth(ms);
  return startOfDay(ms);
}

const fmt = (ms, opts) =>
  new Date(ms).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

function bucketLabel(view, start) {
  if (view === 'monthly') return fmt(start, { month: 'long', year: 'numeric' });
  if (view === 'weekly') {
    const end = start + 6 * DAY;
    return `${fmt(start, { month: 'short', day: 'numeric' })} – ${fmt(end, { month: 'short', day: 'numeric' })}`;
  }
  return fmt(start, { weekday: 'short', month: 'short', day: 'numeric' });
}

function shortLabel(view, start) {
  if (view === 'monthly') return fmt(start, { month: 'short' });
  return fmt(start, { month: 'numeric', day: 'numeric' });
}

// The first instant (real UTC, ISO string) we need to load for a view.
export function reportStartISO(view, nowMs = toShopTime().getTime()) {
  const count = (VIEWS[view] || VIEWS.daily).count;
  const buckets = listBucketStarts(view, count, nowMs);
  const earliest = Math.min(buckets[0], startOfMonth(nowMs), startOfWeek(nowMs));
  return new Date(earliest - SHOP_OFFSET).toISOString();
}

function listBucketStarts(view, count, nowMs) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    if (view === 'monthly') {
      const d = new Date(nowMs);
      out.push(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    } else if (view === 'weekly') {
      out.push(startOfWeek(nowMs) - i * 7 * DAY);
    } else {
      out.push(startOfDay(nowMs) - i * DAY);
    }
  }
  return out;
}

const emptyMethods = () => ({ paypal: 0, cod: 0, walkin: 0 });
const round2 = (n) => Math.round(n * 100) / 100;

// records: [{ method: 'paypal'|'cod'|'walkin', amount: number, at: ISO string }]
export function buildReport(records, view, nowMs = toShopTime().getTime()) {
  const cfg = VIEWS[view] || VIEWS.daily;
  const v = VIEWS[view] ? view : 'daily';
  const starts = listBucketStarts(v, cfg.count, nowMs);

  const byStart = new Map(
    starts.map((start) => [
      start,
      { start, label: bucketLabel(v, start), short: shortLabel(v, start), ...emptyMethods(), total: 0, count: 0 },
    ])
  );

  const todayStart = startOfDay(nowMs);
  const weekStart = startOfWeek(nowMs);
  const monthStart = startOfMonth(nowMs);
  const cards = { today: 0, week: 0, month: 0 };

  for (const r of records) {
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) continue;
    const ms = toShopTime(r.at).getTime();

    if (ms >= todayStart) cards.today += amount;
    if (ms >= weekStart) cards.week += amount;
    if (ms >= monthStart) cards.month += amount;

    const bucket = byStart.get(bucketStart(v, ms));
    if (!bucket) continue;
    if (r.method in emptyMethods()) bucket[r.method] += amount;
    bucket.total += amount;
    bucket.count += 1;
  }

  const buckets = starts.map((s) => {
    const b = byStart.get(s);
    return {
      ...b,
      paypal: round2(b.paypal),
      cod: round2(b.cod),
      walkin: round2(b.walkin),
      total: round2(b.total),
    };
  });

  const totals = buckets.reduce(
    (t, b) => ({
      paypal: t.paypal + b.paypal,
      cod: t.cod + b.cod,
      walkin: t.walkin + b.walkin,
      total: t.total + b.total,
      count: t.count + b.count,
    }),
    { paypal: 0, cod: 0, walkin: 0, total: 0, count: 0 }
  );

  return {
    view: v,
    buckets,
    totals: {
      paypal: round2(totals.paypal),
      cod: round2(totals.cod),
      walkin: round2(totals.walkin),
      total: round2(totals.total),
      count: totals.count,
    },
    cards: { today: round2(cards.today), week: round2(cards.week), month: round2(cards.month) },
    max: Math.max(0, ...buckets.map((b) => b.total)),
  };
}


/* ------------------------------------------------------------------ */
/* Calendar view                                                       */
/* ------------------------------------------------------------------ */

export const monthKeyOf = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const dayKeyOf = (ms) => {
  const d = new Date(ms);
  return `${monthKeyOf(ms)}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

// Real-UTC range to load for one calendar month, plus the current week and
// month (the summary cards need those whichever month is being viewed).
export function calendarRangeISO(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return {
    sinceISO: new Date(Date.UTC(y, m - 1, 1) - SHOP_OFFSET).toISOString(),
    untilISO: new Date(Date.UTC(y, m, 1) - SHOP_OFFSET).toISOString(),
  };
}

export function cardsStartISO(nowMs = toShopTime().getTime()) {
  return new Date(Math.min(startOfWeek(nowMs), startOfMonth(nowMs)) - SHOP_OFFSET).toISOString();
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  return monthKeyOf(Date.UTC(y, m - 1 + delta, 1));
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return fmt(Date.UTC(y, m - 1, 1), { month: 'long', year: 'numeric' });
}

export function dayLabel(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return fmt(Date.UTC(y, m - 1, d), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// records: same shape as buildReport, plus optional orderId.
// Returns weeks (Monday to Sunday) of day cells for the month.
export function buildCalendar(records, monthKey, nowMs = toShopTime().getTime()) {
  const [y, m] = monthKey.split('-').map(Number);
  const first = Date.UTC(y, m - 1, 1);
  const next = Date.UTC(y, m, 1);
  const lastDay = next - DAY;
  const gridStart = startOfWeek(first);
  const gridEnd = startOfWeek(lastDay) + 6 * DAY;
  const todayStart = startOfDay(nowMs);

  const days = new Map();
  const payments = new Map();
  for (const r of records) {
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) continue;
    const ms = toShopTime(r.at).getTime();
    if (ms < first || ms >= next) continue;
    const key = dayKeyOf(ms);
    const d = days.get(key) || { total: 0, count: 0, paypal: 0, cod: 0, walkin: 0 };
    d.total += amount;
    d.count += 1;
    if (r.method in emptyMethods()) d[r.method] += amount;
    days.set(key, d);
    const list = payments.get(key) || [];
    list.push({ method: r.method, amount, at: r.at, orderId: r.orderId ?? null });
    payments.set(key, list);
  }

  const weeks = [];
  let monthTotal = 0;
  let monthCount = 0;
  let best = null;
  for (let t = gridStart; t <= gridEnd; t += 7 * DAY) {
    const cells = [];
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const ms = t + i * DAY;
      const inMonth = ms >= first && ms < next;
      const key = dayKeyOf(ms);
      const d = inMonth ? days.get(key) : null;
      const total = d ? round2(d.total) : 0;
      if (inMonth) weekTotal += total;
      if (inMonth && d) {
        monthTotal += d.total;
        monthCount += d.count;
        if (!best || total > best.total) best = { key, total };
      }
      cells.push({
        key,
        date: new Date(ms).getUTCDate(),
        inMonth,
        isToday: ms === todayStart,
        isFuture: ms > todayStart,
        total,
        count: d ? d.count : 0,
        paypal: d ? round2(d.paypal) : 0,
        cod: d ? round2(d.cod) : 0,
        walkin: d ? round2(d.walkin) : 0,
      });
    }
    weeks.push({ cells, total: round2(weekTotal) });
  }

  const max = Math.max(0, ...weeks.flatMap((w) => w.cells.map((c) => c.total)));
  const daysWithSales = weeks.flatMap((w) => w.cells).filter((c) => c.inMonth && c.total > 0).length;

  const dayPayments = (key) =>
    (payments.get(key) || []).sort((a, b) => new Date(a.at) - new Date(b.at));

  return {
    monthKey,
    weeks,
    max,
    monthTotal: round2(monthTotal),
    monthCount,
    daysWithSales,
    bestDay: best,
    dayPayments,
  };
}
