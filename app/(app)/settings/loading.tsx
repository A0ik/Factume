export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="h-8 w-32 bg-slate-800 rounded-lg animate-pulse" />

      {/* Form sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-24 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-32 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
