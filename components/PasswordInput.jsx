'use client';

import { useState } from 'react';

// Wraps a plain <input>, always rendered as type="password" or "text"
// depending on the toggle — every other prop (value, onChange,
// placeholder, required, autoComplete, inputMode, maxLength...) passes
// straight through to the underlying input, so this drops in wherever
// a type="password" input used to be. `inputClassName` is the same
// className the input would have had; `toggleClassName` styles just
// the eye icon button so it can match each theme (storefront vs the
// slate/indigo admin theme).
export default function PasswordInput({ inputClassName = '', toggleClassName = '', ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${inputClassName} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className={`absolute inset-y-0 right-0 flex items-center px-3 z-10 ${toggleClassName}`}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              d="M9.9 4.24A9.12 9.12 0 0112 4c5 0 9 4.5 10 7-0.53 1.32-1.55 3.07-3.07 4.55M6.6 6.6C4.5 8 2.9 9.9 2 12c1 2.5 5 7 10 7a9.7 9.7 0 004-.85M9.5 9.5a3 3 0 004.24 4.24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M2 2l20 20" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
