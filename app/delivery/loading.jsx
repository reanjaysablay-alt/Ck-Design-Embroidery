export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl animate-pulse space-y-4 px-4 py-6">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-8 w-48 rounded bg-slate-200" />

        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white shadow-sm" />
          ))}
        </div>

        <div className="h-64 rounded-3xl bg-white shadow-sm" />
        <div className="h-40 rounded-3xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
