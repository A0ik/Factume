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
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    description: "L'essentiel pour démarrer et tester.",
    recommended: false,
    features: [
      '3 factures et devis par mois',
      'E-facturation certifiée',
      '1 cabinet, 10 clients CRM',
      'Dictée vocale IA activée',
      { label: 'URSSAF One-Click', included: false },
      { label: 'Copilot Factu IA', included: false },
    ],
    ctaText: 'Commencer gratuitement',
    ctaVariant: 'outline',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 14.99,
    description: 'Le couteau suisse des indépendants & TPE.',
    recommended: true,
    features: [
      'Factures & devis illimités',
      'URSSAF One-Click',
      'Voice Expense illimité',
      'Copilot Factu IA',
      'Export FEC & Comptabilité',
      'Contrats & Signatures',
      'CRM illimité',
      'Sans watermark PDF',
    ],
    ctaText: "Démarrer l'essai gratuit",
    ctaVariant: 'default',
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 39.99,
    description: "Pour les PME & experts-comptables.",
    recommended: false,
    features: [
      'Tout le plan Pro inclus',
      '1 cabinet',
      'Comptable Connect',
      'Copilot IA avancé',
      'Multi-utilisateur (5)',
      'API & Webhooks',
      'Support dédié',
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
    <div className="flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 p-0.5">
      <X className="h-3 w-3 text-gray-400 dark:text-gray-500" strokeWidth={3} />
    </div>
  );
}

function FeatureList({
  features,
  textClass = 'text-gray-600 dark:text-gray-300',
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
            <span className={cn(textClass, !included && 'text-gray-400 dark:text-gray-500 line-through')}>
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

  const [starter, pro, business] = PLANS;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {/* Starter */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900',
        )}
      >
        <div className="flex items-center gap-2 p-5 pb-3">
          <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-600 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {starter.name.toUpperCase()}
          </span>
        </div>

        <div className="px-5 pb-3">
          <div className="font-mono text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Gratuit
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{starter.description}</p>
        </div>

        <div className="flex-1 px-5 pb-5">
          <FeatureList features={starter.features} />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => handleClick(starter.id)}
            className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 transition-all hover:border-gray-900 dark:hover:border-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {starter.ctaText}
          </button>
        </div>
      </div>

      {/* Pro (featured) */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-primary/30 bg-gray-950 dark:bg-gray-950',
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
            {pro.name.toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
            <Sparkles className="h-3 w-3 text-primary" />
            Recommandé
          </span>
        </div>

        <div className="relative z-10 px-5 pb-3">
          <div className="flex items-end gap-1.5">
            <span className="font-mono text-4xl font-bold tracking-tight text-white">
              {pro.priceMonthly}€
            </span>
            <span className="pb-1.5 text-sm text-gray-400">/mois</span>
          </div>
          <p className="mt-1 text-sm text-gray-400">{pro.description}</p>
        </div>

        <div className="relative z-10 flex-1 p-5">
          <FeatureList features={pro.features} textClass="text-gray-300" />
        </div>

        <div className="relative z-10 px-5 pb-5">
          <button
            onClick={() => handleClick(pro.id)}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
          >
            {pro.ctaText}
          </button>
        </div>
      </div>

      {/* Business */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900',
        )}
      >
        <div className="flex items-center gap-2 p-5 pb-3">
          <span className="inline-flex items-center rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-400">
            {business.name.toUpperCase()}
          </span>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-end gap-1.5">
            <span className="font-mono text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {business.priceMonthly}€
            </span>
            <span className="pb-1.5 text-sm text-gray-400 dark:text-gray-500">/mois</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{business.description}</p>
        </div>

        <div className="flex-1 px-5 pb-5">
          <FeatureList features={business.features} />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => handleClick(business.id)}
            className="w-full rounded-xl border-2 border-gray-900 dark:border-gray-100 px-6 py-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 transition-all hover:bg-gray-900 dark:hover:bg-gray-100 hover:text-white dark:hover:text-gray-900 active:scale-95"
          >
            {business.ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
