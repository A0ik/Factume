'use client';

import CrmKanbanView from '@/components/crm/CrmKanbanView';
import { useSubscription } from '@/hooks/useSubscription';
import { Target, Crown } from 'lucide-react';
import Link from 'next/link';

/**
 * /crm — route canonique du Pipeline CRM (Kanban drag & drop).
 *
 * HEPHAISTOS (CIBLE 2 — suivi) : garde plan au niveau page.
 * CRM réservé Pro + Business (et essai actif via canUseCRM → resolveEffectiveTier='pro').
 * Avant : la page rendait CrmKanbanView sans contrôle → un utilisateur free qui tapait
 * /crm manuellement y accédait. Désormais un écran d'upgrade s'affiche si !canUseCRM.
 */
function CrmPaywall() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/25">
          <Target className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pipeline CRM</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Le pipeline CRM (Kanban de clients) est réservé aux abonnements{' '}
          <span className="font-semibold text-foreground">Pro et Business</span>.
        </p>
        <Link
          href="/paywall"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Crown className="w-4 h-4" /> Découvrir les abonnements
        </Link>
      </div>
    </div>
  );
}

export default function CrmPage() {
  const { canUseCRM } = useSubscription();
  if (!canUseCRM) return <CrmPaywall />;
  return <CrmKanbanView />;
}
