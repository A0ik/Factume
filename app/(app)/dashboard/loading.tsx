export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-800/50 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-xl p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-20 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-slate-900 rounded-xl p-5 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-800/50 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
