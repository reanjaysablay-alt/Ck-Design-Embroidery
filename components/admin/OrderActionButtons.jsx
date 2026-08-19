'use client';

export function AcceptButton({ id, action, label = 'Accept — To Ship' }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-indigo-600 text-white font-medium text-xs px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
      >
        {label}
      </button>
    </form>
  );
}

export function ShipButton({ id, action }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-indigo-600 text-white font-medium text-xs px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
      >
        Mark Shipped
      </button>
    </form>
  );
}

export function ReceivedButton({ id, action }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-indigo-600 text-white font-medium text-xs px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
      >
        Mark Completed
      </button>
    </form>
  );
}

export function ReadyForPickupButton({ id, action }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-indigo-600 text-white font-medium text-xs px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
      >
        Mark Ready for Pickup
      </button>
    </form>
  );
}

export function PickedUpButton({ id, action }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-indigo-600 text-white font-medium text-xs px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors"
      >
        Mark Picked Up
      </button>
    </form>
  );
}

export function CancelButton({ id, action }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Cancel this order? If it was paid via PayPal, this refunds the customer automatically.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-red-200 text-red-600 bg-red-50 font-medium text-xs px-5 py-2.5 rounded-full hover:bg-red-100 transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}
