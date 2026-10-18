import QRCode from 'qrcode';
import { redirectIfCashier } from '@/lib/cashier';
import { createAdminClient } from '@/lib/supabase/server';
import { getLabelData } from '@/lib/label';
import { markLabelsPrinted } from '../actions';
import PrintLabelControls from '@/components/admin/PrintLabelControls';
import ShippingLabel, { PRINT_CSS } from '@/components/admin/ShippingLabel';

export const dynamic = 'force-dynamic';

// Prints every order that still needs a label, one label per page.
export default async function PrintAllPage() {
  await redirectIfCashier();

  const admin = createAdminClient();

  const [{ data }, { data: setting }] = await Promise.all([
    admin
      .from('orders')
      .select('*')
      .eq('production_stage', 'ready_for_fulfillment')
      .neq('payment_method', 'walkin')
      .is('delivery_user_id', null)
      .is('label_printed_at', null)
      .order('created_at', { ascending: true }),
    admin.from('shop_settings').select('value').eq('key', 'sender_address').maybeSingle(),
  ]);

  const orders = data || [];
  const labels = await Promise.all(
    orders.map(async (o) => {
      const d = getLabelData(o);
      if (setting?.value) d.shopAddress = setting.value;
      return {
        id: o.id,
        d,
        qr: await QRCode.toDataURL(String(o.id), { margin: 1, width: 300 }),
      };
    })
  );

  return (
    <div className="max-w-3xl mx-auto font-sans antialiased">
      <style>{PRINT_CSS}</style>

      {labels.length === 0 ? (
        <div className="no-print rounded-3xl bg-white dark:bg-[#1c1c1e] ring-1 ring-black/5 dark:ring-white/10 px-6 py-12 text-center">
          <p className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            All caught up
          </p>
          <p className="text-[14px] text-neutral-500 dark:text-neutral-400 mt-1">
            No labels waiting to be printed.
          </p>
        </div>
      ) : (
        <>
          <PrintLabelControls
            ids={labels.map((l) => l.id)}
            action={markLabelsPrinted}
            label={`Print all (${labels.length})`}
          />
          <div id="print-area" className="flex flex-col items-center gap-5">
            {labels.map((l) => (
              <ShippingLabel key={l.id} d={l.d} qr={l.qr} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}