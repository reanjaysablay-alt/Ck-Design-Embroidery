'use client';

export default function PrintButton({ label = 'Print receipt' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-indigo-600 text-white font-medium text-sm px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
    >
      {label}
    </button>
  );
}
