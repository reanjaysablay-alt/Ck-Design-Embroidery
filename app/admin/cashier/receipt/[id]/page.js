import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessContext } from '@/lib/cashier';
import { getSiteSettings } from '@/lib/settings';
import { formatDateTime } from '@/lib/formatDate';
import { formatReceiptNo, paymentModeLabel, customerLabel } from '@/lib/receipt';
import PrintButton from '@/components/admin/PrintButton';

export const metadata = { title: 'Payment Receipt — Stitchhouse Admin' };
export const dynamic = 'force-dynamic';

const money = (n) => `$${Number(n).toFixed(2)}`;

export default async function ReceiptPage({ params }) {
  const ctx = await getAccessContext();
  if (!ctx.user) redirect('/login?next=/admin/cashier');
  if (!ctx.isAdmin && !ctx.isCashier) redirect('/admin/orders');

  const { id } = await params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId)) notFound();

  const admin = createAdminClient();
  const { data: record } = await admin.from('payment_records').select('*').eq('id', recordId).maybeSingle();
  if (!record) notFound();

  const { data: order } = await admin.from('orders').select('*').eq('id', record.order_id).single();
  const settings = await getSiteSettings();
  const variance = Number(record.amount_received) - Number(record.amount_expected);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <Link href="/admin/cashier" className="text-sm text-indigo-600 hover:underline">
          ← Back to payments
        </Link>
        <PrintButton />
      </div>

      <div className="print:hidden mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
        Payment recorded. The customer has been notified.
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 print:shadow-none print:border-0">
        <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
          <div className="text-lg font-semibold text-slate-900">{settings.site_title}</div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 mt-1">Payment Receipt</div>
        </div>

        <dl className="text-sm space-y-1.5">
          {[
            ['Receipt no.', formatReceiptNo(record.id)],
            ['Date', formatDateTime(record.created_at)],
            ['Order', `#${record.order_id}`],
            ['Customer', order ? customerLabel(order) : '—'],
            ['Payment type', record.method === 'cod' ? 'Cash on Delivery' : 'Walk-in'],
            ['Paid by', paymentModeLabel(record.payment_mode)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-900 text-right">{value}</dd>
            </div>
          ))}
        </dl>

        {order?.items?.length > 0 && (
          <div className="border-t border-dashed border-slate-300 mt-4 pt-4 text-sm space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span className="text-slate-600">
                  {item.name}
                  {item.size ? ` (${item.size})` : ''} × {item.quantity}
                </span>
                <span className="text-slate-800">{money(Number(item.price) * Number(item.quantity))}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-dashed border-slate-300 mt-4 pt-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Order total</span>
            <span className="text-slate-900">{money(record.amount_expected)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span className="text-slate-900">Amount received</span>
            <span className="text-slate-900">{money(record.amount_received)}</span>
          </div>
          {Math.abs(variance) > 0.009 && (
            <div className="flex justify-between text-amber-700">
              <span>Difference</span>
              <span>
                {variance > 0 ? '+' : '−'}
                {money(Math.abs(variance))}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-slate-300 mt-4 pt-4 text-xs text-slate-500 space-y-1">
          {record.collected_by && <div>Cash collected by: {record.collected_by}</div>}
          <div>Received &amp; recorded by: {record.recorded_by}</div>
          {record.note && <div>Note: {record.note}</div>}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">Thank you for your order!</p>
      </div>
    </div>
  );
}
