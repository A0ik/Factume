'use client';

import { FileText, Sparkles, Send, Users, Calculator, LayoutGrid, Calendar, Package, Truck, FileClock } from 'lucide-react';
import { Reveal } from './reveal';
import { GlowingCard } from './glowing-card';
import { cn } from '@/lib/cn';

const features = [
  { icon: FileText, title: 'Facturation multi-documents', desc: 'Factures, devis, avoirs, bons de commande, bons de livraison, factures d\'acompte.', span: 'col-span-1 md:col-span-2' },
  { icon: Sparkles, title: 'Intelligence Artificielle', desc: 'Dictez ou décrivez votre facture. L\'IA remplit tout et comprend les modifications.', span: 'col-span-1' },
  { icon: Send, title: 'Envoi et suivi', desc: 'E-mail avec PDF, liens de paiement, portail client, relances automatiques.', span: 'col-span-1' },
  { icon: Users, title: 'CRM intégré', desc: 'Fiches clients, import CSV, auto-complétion SIRET, tags et historique.', span: 'col-span-1' },
  { icon: Calculator, title: 'Comptabilité', desc: 'Export officiel pour les impôts, suivi des dépenses, scan de reçus, rapprochement bancaire.', span: 'col-span-1 md:col-span-2' },
  { icon: LayoutGrid, title: 'Espace collaboratif', desc: 'Jusqu\'à 10 espaces isolés, rôles, flux d\'activité et notifications.', span: 'col-span-1' },
  { icon: Calendar, title: 'Planning', desc: 'Calendrier intégré pour suivre vos échéances et relances.', span: 'col-span-1' },
  { icon: Package, title: 'Catalogue produits', desc: 'Créez votre catalogue pour une facturation plus rapide.', span: 'col-span-1' },
  { icon: Truck, title: 'Fournisseurs', desc: 'Gérez vos dépenses et fournisseurs en un seul endroit.', span: 'col-span-1' },
  { icon: FileClock, title: 'Factures récurrentes', desc: 'Automatisez vos factures récurrentes avec un seul clic.', span: 'col-span-1' },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 lg:py-40 bg-white">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-16 lg:mb-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-5">
              <LayoutGrid className="w-4 h-4" />Fonctionnalités
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-4">
              Tout en un<br />
              <span className="text-brand-500">seul endroit</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed">
              Remplacez vos 5 outils par une seule plateforme. Conçue pour les entrepreneurs français.
            </p>
          </Reveal>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <Reveal key={i} delay={0.03 * i} className={cn(f.span)}>
              <GlowingCard className="h-full">
                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-500" />
                </div>
                <h3 className="text-base font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </GlowingCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
