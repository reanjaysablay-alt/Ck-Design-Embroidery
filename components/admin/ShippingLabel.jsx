// One 100x150mm shipping label. Pure presentational (server-safe).
// Shows: order number + QR, then the customer's name, phone and address.
// No amounts are printed on the label.
export default function ShippingLabel({ d, qr }) {
  return (
    <div className="shipping-label bg-white text-black border-2 border-black w-[380px] max-w-full text-sm flex flex-col">
      {/* Order number + QR */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-black p-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest">Order</p>
          <p className="text-2xl font-bold tracking-wider leading-tight">#{d.shortId}</p>
          {d.payment === 'COD' && (
            <p className="mt-1 inline-block px-2 py-0.5 text-[11px] font-bold bg-black text-white">
              COD
            </p>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Order QR" width={120} height={120} className="flex-shrink-0" />
      </div>

      {/* Customer details */}
      <div className="p-4 border-b-2 border-black flex-1">
        <p className="text-[10px] uppercase tracking-widest mb-2">Ship to</p>
        <p className="text-2xl font-bold leading-tight break-words">{d.customerName || '—'}</p>
        <p className="mt-1 text-lg font-semibold">{d.phone || '—'}</p>
        <p className="mt-2 text-base leading-snug whitespace-pre-line break-words">
          {d.address || '—'}
        </p>
      </div>

      {/* Sender */}
      <div className="p-3 text-xs leading-snug">
        <p className="text-[10px] uppercase tracking-widest mb-1">From</p>
        <p className="font-semibold">{d.shopName}</p>
        {d.shopAddress && <p>{d.shopAddress}</p>}
        {d.shopPhone && <p>{d.shopPhone}</p>}
        {d.item && <p className="mt-2">Item: {d.item}</p>}
        {d.notes && <p>Note: {d.notes}</p>}
      </div>
    </div>
  );
}

// Shared print CSS: prints only #print-area, one label per page.
export const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area { position: absolute; left: 0; top: 0; width: 100%; }
  #print-area .shipping-label { break-after: page; page-break-after: always; margin: 0; width: 100%; }
  #print-area .shipping-label:last-child { break-after: auto; page-break-after: auto; }
  .no-print { display: none !important; }
  @page { size: 100mm 150mm; margin: 4mm; }
}`;