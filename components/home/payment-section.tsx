'use client';

import Link from 'next/link';
import { CreditCard, ShieldCheck, Link as LinkIcon, Check } from 'lucide-react';
import { Reveal } from './reveal';

export function PaymentSection() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Visual */}
          <Reveal direction="left">
            <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center"><LinkIcon className="w-5 h-5 text-brand-600" /></div>
                <div><div className="font-bold text-sm">Lien de paiement envoyé</div><div className="text-xs text-slate-400">factu.me/pay/inv-0042</div></div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Conception site web</span><span className="font-semibold">3 000€</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Conseil UX/UI</span><span className="font-semibold">800€</span></div>
                <div className="flex justify-between text-sm border-t border-slate-100 pt-2"><span className="font-semibold">Total TTC</span><span className="font-bold text-brand-600">4 560€</span></div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-brand-500" />Paiement sécurisé par Stripe</div>
              <Link href="/login" className="block w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm text-center hover:bg-brand-600 transition-colors">
                <span className="flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />Payer maintenant</span>
              </Link>
            </div>
          </Reveal>

          {/* Text */}
          <div className="space-y-6">
            <Reveal direction="right">
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-2">
                <CreditCard className="w-4 h-4" />Paiement en ligne
              </div>
              <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-bold tracking-tight leading-[1.1] mb-4">
                Envoyez un lien,<br />votre client paie directement
              </h2>
              <p className="text-base text-slate-500 leading-relaxed mb-6">
                Plus besoin d&apos;attendre un virement. Votre client clique, paie par carte, et le statut se met à jour instantanément.
              </p>
              <div className="space-y-3">
                {['Paiement par carte ou virement instantané', 'Statut mis à jour en temps réel', 'Relances automatiques si impayé'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-brand-500" /></div>
                    <span className="text-sm text-slate-600">{item}</span>
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
