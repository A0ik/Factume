'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles } from 'lucide-react';

type Feature = string | { label: string; included: boolean };

type PlanConfig = {
  id: string;
  name: string;
  priceMonthly: number;
  description: string;
  recommended: boolean;
  features: Feature[];
  ctaText: string;
  ctaVariant: 'default' | 'outline';
};

const PLANS: PlanConfig[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    priceMonthly: 0,
    description: "L'essentiel pour tester l'outil.",
    recommended: false,
    features: [
      '10 factures et devis par mois',
      '10 clients enregistrés',
      '1 template basique',
      { label: 'Envoi par email', included: false },
      { label: 'Lien de paiement en ligne', included: false },
    ],
    ctaText: 'Commencer gratuitement',
    ctaVariant: 'outline',
  },
  {
    id: 'solo',
    name: 'Solo',
    priceMonthly: 14.99,
    description: 'Pour les freelances qui veulent être pros et sereins.',
    recommended: true,
    features: [
      'Facturation & Devis illimités',
      'Clients illimités',
      'Tous les templates pro',
      'Envoi par Email',
      'Encaissez en ligne (Stripe/SumUp)',
      'Relances automatiques',
    ],
    ctaText: "Démarrer l'essai gratuit",
    ctaVariant: 'default',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29.99,
    description: 'Pour grandir avec l\'IA et les contrats.',
    recommended: false,
    features: [
      'Tout le plan Solo inclus',
      'Contrats & Signatures électroniques',
      'Factur-X (Conforme 2026)',
      'IA & Relances automatiques',
      'Export FEC & Comptabilité',
      'Pipeline CRM intégré',
      'Factures récurrentes',
      'Notes de frais',
    ],
    ctaText: 'Essayer Pro gratuitement',
    ctaVariant: 'default',
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 59.99,
    description: "L'arsenal complet pour automatiser tout.",
    recommended: false,
    features: [
      'Tout le plan Pro inclus',
      'Scan IA de reçus (Dext-like)',
      'Export FEC automatique',
      'CRM & Pipeline intégré',
      '10 espaces de travail',
      'Multi-utilisateurs & Équipes',
      'API & Webhooks avancés',
      'Support prioritaire',
    ],
    ctaText: 'Choisir Business',
    ctaVariant: 'outline',
  },
];

function FilledCheck() {
  return (
    <div className="flex-shrink-0 rounded-full bg-primary p-0.5">
      <Check className="h-3 w-3 text-white" strokeWidth={3} />
    </div>
  );
}

function FilledX() {
  return (
    <div className="flex-shrink-0 rounded-full bg-gray-200 p-0.5">
      <X className="h-3 w-3 text-gray-400" strokeWidth={3} />
    </div>
  );
}

function FeatureList({
  features,
  textClass = 'text-gray-600',
}: {
  features: Feature[];
  textClass?: string;
}) {
  return (
    <ul className="grid gap-3 text-sm">
      {features.map((f, i) => {
        const isObj = typeof f === 'object';
        const label = isObj ? f.label : f;
        const included = isObj ? f.included : true;
        return (
          <li key={i} className="flex items-center gap-3">
            {included ? <FilledCheck /> : <FilledX />}
            <span className={cn(textClass, !included && 'text-gray-400 line-through')}>
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function BentoPricing({ onSelect }: { onSelect?: (planId: string) => void }) {
  const handleClick = (planId: string) => {
    onSelect?.(planId);
  };

  const [decouverte, solo, pro, business] = PLANS;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {/* Découverte */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white',
        )}
      >
        <div className="flex items-center gap-2 p-5 pb-3">
          <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {decouverte.name.toUpperCase()}
          </span>
        </div>

        <div className="px-5 pb-3">
          <div className="font-mono text-4xl font-bold tracking-tight text-gray-900">
            Gratuit
          </div>
          <p className="mt-1 text-sm text-gray-500">{decouverte.description}</p>
        </div>

        <div className="flex-1 px-5 pb-5">
          <FeatureList features={decouverte.features} />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => handleClick(decouverte.id)}
            className="w-full rounded-xl border-2 border-gray-300 py-2.5 text-sm font-bold text-gray-700 transition-all hover:border-gray-900 hover:text-gray-900"
          >
            {decouverte.ctaText}
          </button>
        </div>
      </div>

      {/* Solo (featured) */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-primary/30 bg-gray-950',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(29,158,117,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3 p-5 pb-3">
          <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {solo.name.toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
            <Sparkles className="h-3 w-3 text-primary" />
            Recommandé
          </span>
        </div>

        <div className="relative z-10 px-5 pb-3">
          <div className="flex items-end gap-1.5">
            <span className="font-mono text-4xl font-bold tracking-tight text-white">
              {solo.priceMonthly}€
            </span>
            <span className="pb-1.5 text-sm text-gray-400">/mois</span>
          </div>
          <p className="mt-1 text-sm text-gray-400">{solo.description}</p>
        </div>

        <div className="relative z-10 flex-1 p-5">
          <FeatureList features={solo.features} textClass="text-gray-300" />
        </div>

        <div className="relative z-10 px-5 pb-5">
          <button
            onClick={() => handleClick(solo.id)}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
          >
            {solo.ctaText}
          </button>
        </div>
      </div>

      {/* Pro */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white',
        )}
      >
        <div className="flex items-center gap-2 p-5 pb-3">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            {pro.name.toUpperCase()}
          </span>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-end gap-1.5">
            <span className="font-mono text-4xl font-bold tracking-tight text-gray-900">
              {pro.priceMonthly}€
            </span>
            <span className="pb-1.5 text-sm text-gray-400">/mois</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{pro.description}</p>
        </div>

        <div className="flex-1 px-5 pb-5">
          <FeatureList features={pro.features} />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => handleClick(pro.id)}
            className="w-full rounded-xl border-2 border-gray-900 px-6 py-2.5 text-sm font-bold text-gray-900 transition-all hover:bg-gray-900 hover:text-white active:scale-95"
          >
            {pro.ctaText}
          </button>
        </div>
      </div>

      {/* Business */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white',
        )}
      >
        <div className="flex items-center gap-2 p-5 pb-3">
          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
            {business.name.toUpperCase()}
          </span>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-end gap-1.5">
            <span className="font-mono text-4xl font-bold tracking-tight text-gray-900">
              {business.priceMonthly}€
            </span>
            <span className="pb-1.5 text-sm text-gray-400">/mois</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{business.description}</p>
        </div>

        <div className="flex-1 px-5 pb-5">
          <FeatureList features={business.features} />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => handleClick(business.id)}
            className="w-full rounded-xl border-2 border-gray-900 px-6 py-2.5 text-sm font-bold text-gray-900 transition-all hover:bg-gray-900 hover:text-white active:scale-95"
          >
            {business.ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
