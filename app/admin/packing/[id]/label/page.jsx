import QRCode from 'qrcode';
import { notFound } from 'next/navigation';
import { redirectIfCashier } from '@/lib/cashier';
import { createAdminClient } from '@/lib/supabase/server';
import { getLabelData } from '@/lib/label';
import { markLabelsPrinted } from '../../actions';
import PrintLabelControls from '@/components/admin/PrintLabelControls';
import ShippingLabel, { PRINT_CSS } from '@/components/admin/ShippingLabel';

export const dynamic = 'force-dynamic';

export default async function LabelPage({ params }) {
  await redirectIfCashier();
  const { id } = await params;

  const admin = createAdminClient();

  const [{ data: order, error }, { data: setting }] = await Promise.all([
    admin.from('orders').select('*').eq('id', id).single(),
    admin.from('shop_settings').select('value').eq('key', 'sender_address').maybeSingle(),
  ]);

  if (error || !order) notFound();

  const d = getLabelData(order);
  if (setting?.value) d.shopAddress = setting.value;

  const qr = await QRCode.toDataURL(String(order.id), { margin: 1, width: 300 });

  return (
    <div className="max-w-3xl mx-auto font-sans antialiased">
      <style>{PRINT_CSS}</style>
      <PrintLabelControls ids={[order.id]} action={markLabelsPrinted} />
      <div id="print-area" className="flex justify-center">
        <ShippingLabel d={d} qr={qr} />
      </div>
    </div>
  );
}