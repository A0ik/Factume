export default function DocumentsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-10 w-40 bg-emerald-600/30 rounded-lg animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Document rows */}
      <div className="bg-slate-900 rounded-xl divide-y divide-slate-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-44 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-6 w-20 bg-slate-800 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-slate-800/50 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
