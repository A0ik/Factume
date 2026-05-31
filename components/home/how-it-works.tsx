'use client';

import { Rocket } from 'lucide-react';
import { Reveal } from './reveal';

const steps = [
  { num: 1, title: 'Créez votre compte', desc: 'Inscription en 2 minutes. Choisissez votre template de facture préféré.' },
  { num: 2, title: 'Décrivez votre facture', desc: 'Dites-la à voix haute ou tapez-la. L\'IA fait le reste.' },
  { num: 3, title: 'Recevez votre paiement', desc: 'Envoyez par e-mail, votre client paie en un clic.' },
];

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-16 lg:mb-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-5">
              <Rocket className="w-4 h-4" />Comment ça marche
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-bold tracking-tight mb-4">Opérationnel en 3 étapes</h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 relative">
          {/* Connector line */}
          <div className="hidden sm:block absolute top-12 left-[16%] right-[16%] h-px bg-brand-200" />

          {steps.map((step, i) => (
            <Reveal key={i} delay={0.05 + i * 0.12}>
              <div className="text-center relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/20 relative z-10">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">{step.num}</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 max-w-[260px] mx-auto leading-relaxed">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
