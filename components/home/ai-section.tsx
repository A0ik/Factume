'use client';

import Link from 'next/link';
import { Sparkles, Mic, Type, Pencil, Check, Zap, Lock } from 'lucide-react';
import { Reveal } from './reveal';

const aiFeatures = [
  { icon: Mic, title: 'Dictée vocale', desc: 'Parlez naturellement, l\'IA remplit tous les champs.' },
  { icon: Type, title: 'Génération textuelle', desc: 'Tapez en langage naturel, descriptions professionnelles automatiques.' },
  { icon: Pencil, title: 'Modification intelligente', desc: '"Ajoute 2 jours" — l\'IA comprend et modifie en conséquence.' },
];

export function AISection() {
  return (
    <section id="ai" className="py-24 sm:py-32 lg:py-40 bg-brand-950 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[500px] lg:w-[800px] h-[500px] lg:h-[800px] bg-brand-500/10 rounded-full blur-[120px] lg:blur-[150px] animate-[blob_15s_ease-in-out_infinite]" />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Visual — chat simulation */}
          <div className="order-2 lg:order-1">
            <Reveal direction="left">
              <div className="bg-brand-900/80 backdrop-blur rounded-2xl overflow-hidden shadow-2xl shadow-brand-500/10 border border-brand-800/50">
                <div className="flex items-center gap-2 px-5 py-3 bg-brand-900 border-b border-brand-800/50">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400/60" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" /><div className="w-2.5 h-2.5 rounded-full bg-green-400/60" /></div>
                  <span className="ml-2 text-xs text-brand-400 font-medium">Factu.me AI</span>
                </div>
                <div className="p-5 sm:p-7 space-y-4 font-mono text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Mic className="w-3.5 h-3.5 text-brand-400" /></div>
                    <div className="bg-brand-800/50 rounded-xl rounded-tl-none px-4 py-3 text-brand-200 max-w-[92%] border border-brand-700/30 text-[12px]">
                      &quot;Facture pour Dupont, 5 jours de dev à 600€ HT, TVA 20%, ajoute 2 jours conseil à 400€&quot;
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5 text-brand-400" /></div>
                    <div className="space-y-2 max-w-[92%]">
                      <div className="bg-brand-800/50 rounded-xl rounded-tl-none px-4 py-2.5 text-brand-300 border border-brand-700/30 text-[12px]"><span className="text-brand-400">Analyse...</span></div>
                      <div className="bg-brand-800/50 rounded-xl rounded-tl-none px-4 py-3.5 text-brand-200 space-y-2 border border-brand-700/30 text-[11px]">
                        <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3" />Client : Dupont Consulting SAS</div>
                        <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3" />Développement — 5j x 600€</div>
                        <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3" />Conseil — 2j x 400€</div>
                        <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3" />TVA 20% appliquée</div>
                        <div className="flex items-center gap-1.5 text-brand-300 font-semibold pt-1 border-t border-brand-700/30"><Zap className="w-3 h-3 text-brand-400" /> FACT-2026-0042 créée</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Text */}
          <div className="space-y-7 lg:space-y-8 order-1 lg:order-2">
            <Reveal direction="right">
              <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-300 mb-2">
                <Sparkles className="w-4 h-4" />Propulsé par l&apos;IA
              </div>
              <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-6">
                Dites-le, l&apos;IA<br />le fait pour vous
              </h2>
              <div className="space-y-5">
                {aiFeatures.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                      <p className="text-sm text-brand-200/50">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
