export default function InvoicesLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-emerald-600/30 rounded-lg animate-pulse" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Invoice rows */}
      <div className="bg-slate-900 rounded-xl divide-y divide-slate-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-6 w-20 bg-slate-800 rounded-full animate-pulse ml-auto" />
            <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
