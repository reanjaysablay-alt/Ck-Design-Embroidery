'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/*
 * Shown on the rider's COD Remittance tab. Staff scan this QR on the admin
 * COD Remittance page and the confirm-cash window opens for this rider.
 * The QR only contains "COD:<riderId>" — no amounts or personal details.
 */
export default function RiderRemitQr({ riderId, amount, count, money }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!riderId) return undefined;

    QRCode.toDataURL(`COD:${riderId}`, { margin: 1, width: 360 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });

    return () => {
      cancelled = true;
    };
  }, [riderId]);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* White tile so the QR stays scannable in dark mode */}
        <div
          className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl p-3"
          style={{ backgroundColor: '#ffffff' }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Remittance QR" width={168} height={168} />
          ) : (
            <span className="text-xs" style={{ color: '#64748b' }}>
              Making QR…
            </span>
          )}
        </div>

        <div className="text-center sm:text-left">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Show this to staff
          </div>

          <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Remittance QR
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Hand over{' '}
            <span className="font-semibold text-slate-900">
              {money ? money(amount) : amount}
            </span>{' '}
            for {count} {count === 1 ? 'order' : 'orders'}. Staff scan this code
            to confirm the cash instantly.
          </p>
        </div>
      </div>
    </div>
  );
}