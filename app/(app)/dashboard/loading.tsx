// ASTRÉE (CIBLE 5) — Skeleton theme-aware (plus de bg-slate-900/800 qui rendaient des
// cases noires en mode clair) et dont la structure (hero + grille 3+2) echoe le vrai
// dashboard pour éviter le saut visuel au chargement.
export default function DashboardLoading() {
  return (
    <div className="space-y-5 p-5 lg:px-8 lg:py-6">
      {/* Hero skeleton (éméraude, accent unique) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6">
        <div className="h-3 w-24 rounded bg-white/30 mb-3 animate-pulse" />
        <div className="h-9 w-56 rounded bg-white/40 mb-2 animate-pulse" />
        <div className="h-3 w-40 rounded bg-white/20 animate-pulse" />
      </div>

      {/* Grille 3+2 — Action requise + Top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-4 space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
              <div className="h-3 flex-1 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] p-4 space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
              <div className="h-3 flex-1 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
