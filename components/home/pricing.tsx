'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tag, Check, ShieldCheck } from 'lucide-react';
import { Reveal } from './reveal';
import { cn } from '@/lib/cn';

const plans = [
  {
    name: 'Starter', monthlyPrice: 'Gratuit', yearlyPrice: 'Gratuit', yearlySavings: '0€',
    tagline: 'Pour démarrer et tester',
    features: ['5 factures & devis/mois', 'E-facturation certifiée', '1 cabinet', '10 clients CRM', '5 commandes vocales/mois', 'Support email'],
    popular: false,
  },
  {
    name: 'Pro', monthlyPrice: '14,99€', yearlyPrice: '12,42€', yearlySavings: '31€',
    tagline: 'Le couteau suisse des indépendants',
    features: ['Factures & devis illimités', 'URSSAF One-Click', 'Voice Expense illimité', 'Copilot Factu IA', 'Export FEC', 'Contrats & signatures', 'CRM illimité', 'Sans watermark'],
    popular: true,
  },
  {
    name: 'Business', monthlyPrice: '39,99€', yearlyPrice: '33,25€', yearlySavings: '81€',
    tagline: 'Pour les PME & experts-comptables',
    features: ['Tout le plan Pro inclus', '5 cabinets', 'Comptable Connect', 'Copilot IA avancé', 'Multi-utilisateur (5)', 'API & Webhooks', 'Support dédié'],
    popular: false,
  },
];

export function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="tarifs" className="py-24 sm:py-32 lg:py-40 bg-slate-50">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-8">
        <div className="text-center mb-14">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-5">
              <Tag className="w-4 h-4" />Tarifs transparents
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-bold tracking-tight mb-4">Choisissez votre plan</h2>
            <p className="text-base sm:text-lg text-slate-500">Sans engagement. Évoluez quand vous voulez.</p>
          </Reveal>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setBilling('monthly')} className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all', billing === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              Mensuel
            </button>
            <button onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')} className={cn('relative w-16 h-10 rounded-full transition-all', billing === 'yearly' ? 'bg-brand-500' : 'bg-slate-200')}>
              <motion.div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-md" animate={{ left: billing === 'yearly' ? 'calc(100% - 28px)' : '4px' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </button>
            <button onClick={() => setBilling('yearly')} className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all', billing === 'yearly' ? 'bg-green-600 text-white shadow-md' : 'bg-green-100 text-green-700 hover:bg-green-200')}>
              Annuel <span className="hidden sm:inline text-xs opacity-80">(-17%)</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-5xl">
            {plans.map((plan, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className={cn('relative h-full', plan.popular && 'pricing-popular')}>
                  <div className={cn(
                    'bg-white rounded-2xl p-6 sm:p-7 lg:p-8 border h-full flex flex-col relative z-10',
                    plan.popular ? 'border-brand-300 shadow-xl' : 'border-slate-100 hover:shadow-lg transition-shadow duration-500'
                  )}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">Populaire</span>
                      </div>
                    )}
                    <div className="mb-5 mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        {plan.popular && <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Top</span>}
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{plan.tagline}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold tracking-tight">{billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}</span>
                        {plan.monthlyPrice !== 'Gratuit' && <span className="text-sm text-slate-500">{billing === 'monthly' ? '/mois' : '/mois (annuel)'}</span>}
                      </div>
                      {billing === 'yearly' && plan.yearlySavings !== '0€' && <p className="text-xs text-green-600 font-medium mt-1">Économisez {plan.yearlySavings} par an</p>}
                    </div>
                    <ul className="space-y-2.5 mb-6 flex-grow">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-brand-500 flex-shrink-0" /><span className="text-slate-600">{f}</span></li>
                      ))}
                    </ul>
                    <Link
                      href={plan.name === 'Starter' ? '/register' : `/register?plan=${plan.name.toLowerCase()}&trial=14&billing=${billing}`}
                      className={cn(
                        'block text-center font-semibold py-3 rounded-xl transition-all text-sm active:scale-[0.97]',
                        plan.popular ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-slate-900 hover:bg-slate-800 text-white'
                      )}
                    >
                      {plan.name === 'Starter' ? 'Commencer gratuitement' : 'Essai 14 jours gratuit'}
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <Reveal>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />Données hébergées en France · Connexion sécurisée · Annulation en un clic
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
