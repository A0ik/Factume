import { Logo } from '@/components/ui/Logo';

export default function GlobalLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950"
      role="status"
      aria-label="Chargement de la page"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing logo */}
        <div className="animate-pulse">
          <Logo size="lg" variant="full" />
        </div>

        {/* Spinner ring */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 dark:border-slate-700" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-[var(--primary)] animate-spin" />
        </div>

        {/* SEO: aria-live pour les lecteurs d'écran, texte invisible pour Googlebot */}
        <span aria-live="polite" className="sr-only">
          Chargement en cours...
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500 animate-pulse" aria-hidden="true">
          Chargement...
        </span>
      </div>
    </div>
  );
}
