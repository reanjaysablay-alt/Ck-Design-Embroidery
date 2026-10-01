'use client';

import { useState } from 'react';

// Shopee-style order tracking: a row of clickable stage icons. Each icon
// shows how many of the customer's orders are at that stage; tapping one
// shows those orders below. No horizontal scrolling: the icons wrap into
// a grid that fits the screen. The order cards are rendered on the
// server and passed in as `panels`; this only decides which is visible.
export default function OrderTrackingTabs({ tabs, panels, defaultKey }) {
  const [picked, setPicked] = useState(null);
  // Until the customer taps an icon, follow their newest order's stage,
  // so the page keeps pointing at it as staff move it along.
  const active = picked ?? defaultKey;
  const total = tabs.reduce((sum, t) => sum + t.count, 0);
  const activeTab = tabs.find((t) => t.key === active);

  return (
    <div className="mb-14">
      <div className="bg-canvas2 border border-white/5 rounded-sm p-4 sm:p-6">
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-x-1 gap-y-4">
          {tabs.map((t) => {
            const isActive = t.key === active;
            const hasOrders = t.count > 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setPicked(t.key)}
                aria-pressed={isActive}
                className="flex flex-col items-center text-center focus:outline-none"
              >
                <span
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive
                      ? 'border-gold text-gold bg-gold/10'
                      : hasOrders
                      ? 'border-gold/60 text-gold/70 hover:border-gold'
                      : 'border-white/15 text-thread/35 hover:border-white/30'
                  }`}
                >
                  {t.icon}
                  {hasOrders && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-stitchRed text-white text-[10px] leading-[18px] font-mono">
                      {t.count}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wide mt-1.5 leading-tight ${
                    isActive ? 'text-gold' : hasOrders ? 'text-thread/70' : 'text-thread/35'
                  }`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {panels[active] ? (
          panels[active]
        ) : (
          <p className="text-thread/60 text-sm px-1">
            {total === 0
              ? 'No active orders yet — once you place an order, its progress will show here step by step.'
              : `No orders in ${activeTab?.label || 'this stage'} right now.`}
          </p>
        )}
      </div>
    </div>
  );
}
