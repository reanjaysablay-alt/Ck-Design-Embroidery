'use client';

export default function StaffApprovalButtons({ id, name, approveAction, denyAction }) {
  return (
    <div className="flex items-center gap-2">
      <form action={approveAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="text-xs uppercase tracking-widest bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors"
        >
          Approve
        </button>
      </form>
      <form
        action={denyAction}
        onSubmit={(e) => {
          if (!confirm(`Deny ${name}? They'll have to identify themselves again from scratch.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="text-xs uppercase tracking-widest text-red-600 hover:underline px-1"
        >
          Deny
        </button>
      </form>
    </div>
  );
}
