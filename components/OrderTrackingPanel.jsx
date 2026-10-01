'use client';

import { useState } from 'react';

// ONE order tracker for the whole My Purchases page. It shows where the
// selected order is in production; tapping a different order in the list
// below switches the tracker to that order. The tracker and detail cards
// are rendered on the server and passed in, this component only decides
// which one is visible.
export default function OrderTrackingPanel({ summaries, trackers, details }) {
  const [selected, setSelected] = useState(summaries[0]?.id);

  // If the selected order disappears (e.g. it just completed and moved
  // to history after an auto-refresh), fall back to the newest one.
  const activeId = summaries.some((s) => s.id === selected) ? selected : summaries[0]?.id;
  const current = summaries.find((s) => s.id === activeId);
  if (!current) return null;

  return (
    <div className="mb-14">
      <div className="bg-canvas2 border border-white/5 rounded-sm p-6 mb-6">
        <div className="flex justify-between items-start gap-3 mb-5">
          <div>
            <div className="font-mono text-xs text-thread/40">Tracking order #{current.id}</div>
            <div className="text-thread/60 text-sm">{current.dateLabel}</div>
          </div>
          <span className="font-mono text-sm text-gold">${current.total}</span>
        </div>
        {trackers[activeId]}
      </div>

      <p className="font-mono text-xs uppercase tracking-widest text-thread/40 mb-3">
        Your orders — tap one to track it
      </p>

      <div className="space-y-3">
        {summaries.map((s) => {
          const isActive = s.id === activeId;
          return (
            <div key={s.id}>
              <button
                type="button"
                onClick={() => setSelected(s.id)}
                aria-pressed={isActive}
                className={`w-full flex items-center justify-between gap-3 text-left px-4 py-3 rounded-sm border transition-colors ${
                  isActive
                    ? 'border-gold/60 bg-gold/5'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="font-mono text-xs text-thread/50">
                    Order #{s.id} · {s.dateLabel}
                  </div>
                  <div className={`text-sm ${isActive ? 'text-gold' : 'text-thread/70'}`}>{s.stageLabel}</div>
                </div>
                <span className="font-mono text-sm text-gold">${s.total}</span>
              </button>

              {isActive && <div className="mt-3">{details[s.id]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
