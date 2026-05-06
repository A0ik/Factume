import { Logo } from '@/components/ui/Logo';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
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

        <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">
          Chargement...
        </p>
      </div>
    </div>
  );
}
