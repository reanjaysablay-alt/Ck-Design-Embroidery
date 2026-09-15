'use client';

export default function ResetStaffPinButton({ id, name, action }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            `Reset ${name}'s PIN? They'll need to set a new one next time they identify themselves.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-red-600 text-xs uppercase tracking-widest hover:underline"
      >
        Reset PIN
      </button>
    </form>
  );
}
