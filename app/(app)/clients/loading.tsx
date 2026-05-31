export default function ClientsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-10 w-40 bg-emerald-600/30 rounded-lg animate-pulse" />
      </div>

      {/* Search bar */}
      <div className="h-10 w-full max-w-md bg-slate-800 rounded-lg animate-pulse" />

      {/* Client cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-800 rounded-full animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-36 bg-slate-800/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-slate-800/50 rounded animate-pulse" />
              <div className="h-3 w-20 bg-slate-800/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
