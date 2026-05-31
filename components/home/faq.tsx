'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Reveal } from './reveal';
import { cn } from '@/lib/cn';

const faqItems = [
  { q: 'Est-ce vraiment gratuit ?', a: 'Oui, le plan Découverte est 100% gratuit (3 factures/mois). Pour tester les plans payants, profitez de 7 jours d\'essai complet avec carte bancaire requise, sans engagement.' },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Absolument. Vos données sont chiffrées, hébergées en France, et chaque utilisateur ne peut accéder qu\'à ses propres données. Vous pouvez exporter ou supprimer vos données à tout moment.' },
  { q: 'Puis-je récupérer mes données si je veux quitter ?', a: 'Oui, conformément au RGPD vous pouvez télécharger l\'intégralité de vos données à tout moment ou demander la suppression totale de votre compte.' },
  { q: 'L\'IA comprend-elle vraiment ce que je dis ?', a: 'Oui, l\'IA est entraînée pour comprendre le français naturel. Vous pouvez dire "5 jours de dev à 600€" et elle créera la facture complète.' },
  { q: 'Est-ce conforme pour les impôts français ?', a: 'Oui, les mentions légales sont ajoutées automatiquement. L\'export officiel pour les impôts est disponible sur les plans Pro et Business.' },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-500 hover:border-brand-200/50">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/50 transition-colors">
        <span className="font-semibold text-sm sm:text-base pr-4">{question}</span>
        <ChevronDown className={cn('w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cn('overflow-hidden transition-all duration-400 ease-out', open ? 'max-h-40 px-5 pb-5' : 'max-h-0')}>
        <p className="text-sm text-slate-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-14">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-5">
              <HelpCircle className="w-4 h-4" />Questions fréquentes
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-bold tracking-tight">Tout ce que vous voulez savoir</h2>
          </Reveal>
        </div>
        <Reveal>
          <div className="space-y-3 sm:space-y-4">
            {faqItems.map((item, i) => <FAQItem key={i} question={item.q} answer={item.a} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
