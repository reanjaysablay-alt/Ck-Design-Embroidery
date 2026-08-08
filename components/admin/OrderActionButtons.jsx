'use client';

export function AcceptButton({ id, action }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-gold text-ink font-body uppercase tracking-widest text-xs px-5 py-2.5 rounded-sm hover:bg-thread transition-colors"
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
        className="border border-stitchRed text-stitchRed font-body uppercase tracking-widest text-xs px-5 py-2.5 rounded-sm hover:bg-stitchRed hover:text-thread transition-colors"
      >
        Decline
      </button>
    </form>
  );
}
