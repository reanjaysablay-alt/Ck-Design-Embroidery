'use client';

import { useState } from 'react';
import AccountOrderCard from './AccountOrderCard';

// Groups this shop's actual order_status values into the three
// Shopee-style stages the customer asked for. "To Pay" stands in for
// "just submitted, nothing's happened yet" — for COD/walk-in orders
// payment itself happens at delivery/pickup, not up front, but
// `pending` is still the earliest stage before the shop has even
// accepted the order, which is the closest equivalent here.
const TABS = [
  {
    key: 'to_pay',
    label: 'To Pay',
    statuses: ['pending'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'to_ship',
    label: 'To Ship',
    statuses: ['preparing', 'to_ship'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 8l9-5 9 5-9 5-9-5z" strokeLinejoin="round" />
        <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
        <path d="M12 13v8" />
      </svg>
    ),
  },
  {
    key: 'to_receive',
    label: 'To Receive',
    statuses: ['to_receive', 'ready_for_pickup'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="10" width="15" height="8" rx="1" />
        <path d="M18 13h2.2a1 1 0 01.9.55L22 15v3h-4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="19" r="1.4" />
        <circle cx="16.5" cy="19" r="1.4" />
      </svg>
    ),
  },
];

export default function PurchasesTabs({ orders }) {
  const [active, setActive] = useState('to_pay');

  const countFor = (statuses) => orders.filter((o) => statuses.includes(o.order_status)).length;

  const activeTab = TABS.find((t) => t.key === active);
  const visible = orders.filter((o) => activeTab.statuses.includes(o.order_status));

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-8">
        {TABS.map((tab) => {
          const count = countFor(tab.statuses);
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`relative flex flex-col items-center gap-1.5 py-3 rounded-sm border transition-colors ${
                isActive
                  ? 'border-gold text-gold bg-gold/10'
                  : 'border-white/10 text-thread/60 hover:text-thread hover:border-white/25'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] uppercase tracking-widest">{tab.label}</span>
              {count > 0 && (
                <span className="absolute top-1.5 right-2 bg-stitchRed text-white text-[10px] font-mono rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="text-thread/60 mb-14">Nothing {activeTab.label.toLowerCase()} right now.</p>
      )}

      {visible.length > 0 && (
        <div className="space-y-6 mb-14">
          {visible.map((order) => (
            <AccountOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
