'use client';

export function AcceptButton({ id, action }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-black text-white font-medium uppercase tracking-widest text-xs px-5 py-2.5 rounded-md hover:bg-gray-800 transition-colors"
      >
        Accept
      </button>
    </form>
  );
}

export function DeclineButton({ id, action }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Decline this order? If it was paid via PayPal, this refunds the customer automatically.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-red-600 text-red-600 font-medium uppercase tracking-widest text-xs px-5 py-2.5 rounded-md hover:bg-red-600 hover:text-white transition-colors"
      >
        Decline
      </button>
    </form>
  );
}
