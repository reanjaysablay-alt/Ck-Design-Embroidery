'use client';

export default function DeleteProductButton({ id, name, action }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-stitchRed text-xs uppercase tracking-widest hover:underline"
      >
        Delete
      </button>
    </form>
  );
}
