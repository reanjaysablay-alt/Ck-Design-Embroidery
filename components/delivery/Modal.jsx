'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Full-screen popup that sits in front of the whole page. Used for the
// "Complete delivery" and "Can't deliver" forms in the rider dashboard.
// - Dims the page behind it and stops the page from scrolling
// - On phones it slides up from the bottom; on larger screens it is centered
// - Tapping the dark area or pressing Esc closes it (unless `locked`,
//   which the caller sets while a submit is in progress)
export default function Modal({ title, onClose, locked = false, children }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape' && !locked) onClose();
    }
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [locked, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            className="rounded-full px-3 py-1 text-xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-40"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
