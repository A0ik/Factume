'use client';

import { Star, MessageCircle } from 'lucide-react';
import { Reveal } from './reveal';
import { GlowingCard } from './glowing-card';

const testimonials = [
  { name: 'Sarah M.', role: 'Développeuse freelance', text: 'Je passais 2h par mois sur mes factures. Depuis Factu.me, je dicte en 10 secondes et c\'est envoyé. Un gain de temps énorme.' },
  { name: 'Thomas L.', role: 'Auto-entrepreneur, transport', text: 'Le scan de reçus est bluffant. Je photographie mes tickets essence et c\'est directement catégorisé. Mon comptable est impressionné.' },
  { name: 'Claire D.', role: 'Directrice, agence digitale', text: 'On était 4 dans l\'agence, chacun avait son outil. Aujourd\'hui on est tous sur Factu.me avec des workspaces séparés.' },
];

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-5">
              <MessageCircle className="w-4 h-4" />Témoignages
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-bold tracking-tight mb-4">Ce qu&apos;ils en disent</h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <GlowingCard className="h-full flex flex-col">
                <div className="flex items-center gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed flex-grow mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">{t.name.charAt(0)}</div>
                  <div><div className="font-bold text-sm">{t.name}</div><div className="text-xs text-slate-400">{t.role}</div></div>
                </div>
              </GlowingCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
