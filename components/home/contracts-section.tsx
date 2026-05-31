'use client';

import { FileText, Shield, Users, CheckCircle, Eye, Share2 } from 'lucide-react';
import { Reveal } from './reveal';

export function ContractsSection() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Text */}
          <div className="space-y-6">
            <Reveal direction="left">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3.5 py-1.5 text-xs font-medium text-primary mb-2">
                <FileText className="w-4 h-4" />Contrats de travail
              </div>
              <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight leading-[1.1] mb-4">
                CDI, CDD, Freelance<span className="text-primary"> — générez et signez en 5 minutes</span>
              </h2>
              <p className="text-base text-slate-500 leading-relaxed mb-6">
                Le seul outil qui combine facturation et gestion RH. Créez des contrats conformes au droit français, faites-les signer électroniquement.
              </p>
              <div className="space-y-4">
                {[
                  { icon: FileText, title: 'CDI & CDD conformes', desc: 'Clauses légales, SMIC actualisé, conventions collectives' },
                  { icon: Shield, title: 'Signature eIDAS incluse', desc: 'Niveau Avancé gratuit, valeur légale en France' },
                  { icon: Users, title: 'Suivi des salariés', desc: 'Avenants, renouvellements, dates d\'expiration' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div><div className="font-bold text-sm mb-0.5">{item.title}</div><div className="text-xs text-slate-500">{item.desc}</div></div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Visual */}
          <Reveal direction="right">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xl shadow-primary/5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contrat de travail</div>
                  <div className="text-sm font-bold text-slate-900">CDI — Développeur Full Stack</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />Conforme
                </div>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  ['Type de contrat', 'CDI'],
                  ['Salaire brut', '3 500€/mois'],
                  ['Convention collective', 'SYNTEC'],
                  ['Période d\'essai', '4 mois'],
                  ['Lieu de travail', 'Paris + Télétravail'],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-primary/10 text-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />Aperçu
                </button>
                <button className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-2.5 rounded-xl text-sm hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />Faire signer
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Signature eIDAS Avancé gratuite · Valeur légale
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
