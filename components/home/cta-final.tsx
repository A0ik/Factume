'use client';

import Link from 'next/link';
import { ArrowRight, Zap, LogIn } from 'lucide-react';
import { Reveal } from './reveal';
import { ShimmerButton } from './shimmer-button';

export function CTAFinal() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-brand-950 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] lg:w-[1000px] h-[500px] sm:h-[800px] lg:h-[1000px] bg-brand-500/10 rounded-full blur-[150px] lg:blur-[200px] animate-[blob_15s_ease-in-out_infinite]" />
      </div>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
        <Reveal direction="scale">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-brand-500 rounded-2xl sm:rounded-3xl mb-8 shadow-2xl shadow-brand-500/30">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-extrabold tracking-tight leading-[1.1] mb-6">
            Prêt à en finir avec<br />
            <span className="gradient-text-light">la paperasse ?</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-brand-200/50 max-w-2xl mx-auto mb-10">
            Rejoignez les 2 000+ entrepreneurs qui ont repris le contrôle de leur facturation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <ShimmerButton href="/register" className="bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 text-base shadow-xl shadow-brand-500/30 hover:shadow-2xl">
              Commencer gratuitement <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </ShimmerButton>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium px-8 py-4 rounded-2xl transition-all border border-white/10 hover:border-white/20 text-base backdrop-blur">
              <LogIn className="w-4 h-4 text-brand-400" />Se connecter
            </Link>
          </div>
          <p className="text-xs text-brand-200/25 mt-8">Sans engagement · Annulation en un clic</p>
        </Reveal>
      </div>
    </section>
  );
}
