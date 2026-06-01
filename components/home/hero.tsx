'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, Zap, ShieldCheck, Lock, CheckCircle, Star, Sparkles, Check, Mic, CheckCircle as Paid } from 'lucide-react';
import { Reveal } from './reveal';
import { ShimmerButton } from './shimmer-button';
import { AnimatedGrid } from './animated-grid';

const easeOut = [0.16, 1, 0.3, 1] as const;

function HeroVisual() {
  return (
    <div className="relative w-full max-w-[440px] lg:max-w-[500px] xl:max-w-[540px]">
      {/* Glow */}
      <div className="absolute -inset-6 bg-brand-500/10 rounded-[2rem] blur-[60px] animate-[blob_15s_ease-in-out_infinite]" />

      {/* Floating invoice card */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
      >
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 50px rgba(16,185,129,.2)) drop-shadow(0 25px 50px rgba(0,0,0,.12))' }}
        >
          <div
            className="relative bg-white rounded-2xl overflow-visible"
            style={{ transform: 'perspective(1200px) rotateY(-10deg) rotateX(2deg)', transformStyle: 'preserve-3d' }}
          >
            {/* Accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

            {/* Browser chrome */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-4 py-2 flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 bg-slate-700/80 rounded-lg px-3 py-1 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span className="text-[10px] text-slate-400 font-mono truncate">factu.me/invoice/FACT-2026-0042</span>
              </div>
            </div>

            {/* Invoice body */}
            <div className="p-5 space-y-4 bg-gradient-to-b from-white to-slate-50/50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">Martin Consulting</div>
                    <div className="text-[9px] text-slate-400">12 rue de la Paix, 75002</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Facture</div>
                  <div className="text-[10px] font-mono text-slate-600 font-semibold">FACT-2026-0042</div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                <div>
                  <div className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Client</div>
                  <div className="font-semibold text-[11px] text-slate-800">Dupont Consulting SAS</div>
                </div>
                <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold px-2 py-1 rounded-full border border-green-200">
                  <Paid className="w-3 h-3" />Payée
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 grid grid-cols-12 gap-1">
                  <span className="col-span-5 text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Description</span>
                  <span className="col-span-2 text-right text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Qté</span>
                  <span className="col-span-2 text-right text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Prix</span>
                  <span className="col-span-3 text-right text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { desc: 'Développement web', sub: 'Site vitrine React', qty: '5 j', price: '600 €', total: '3 000 €' },
                    { desc: 'Conseil UX/UI', sub: 'Design système', qty: '2 j', price: '400 €', total: '800 €' },
                  ].map((row, i) => (
                    <div key={i} className="px-4 py-2.5 grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-5">
                        <div className="text-[11px] font-medium text-slate-800">{row.desc}</div>
                        <div className="text-[9px] text-slate-400">{row.sub}</div>
                      </div>
                      <span className="col-span-2 text-right text-[10px] text-slate-500">{row.qty}</span>
                      <span className="col-span-2 text-right text-[10px] text-slate-500">{row.price}</span>
                      <span className="col-span-3 text-right text-[11px] font-bold text-slate-800">{row.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-[48%] space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 px-1"><span>Total HT</span><span className="text-slate-600">3 800,00 €</span></div>
                  <div className="flex justify-between text-[10px] text-slate-400 px-1"><span>TVA 20%</span><span className="text-slate-600">760,00 €</span></div>
                  <div className="flex justify-between items-center bg-brand-500 text-white rounded-xl px-3 py-2 mt-1">
                    <span className="text-[11px] font-bold">Total TTC</span>
                    <span className="text-sm font-extrabold">4 560 €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating badges */}
        <motion.div
          className="absolute -bottom-3 -left-3 z-20"
          animate={{ y: [4, -4, 4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg shadow-green-500/25 px-3 py-2 flex items-center gap-2 border border-green-100/50">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-md shadow-green-500/30">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-800 dark:text-slate-100">Payée</div>
              <div className="text-[7px] text-green-500 font-semibold">via Stripe</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-brand-950 pt-28 pb-20 lg:pt-0 lg:pb-0">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute top-[-30%] left-[-20%] w-[1200px] lg:w-[2000px] h-[1200px] lg:h-[2000px] bg-brand-500/12 rounded-full blur-[250px] lg:blur-[300px] animate-[blob_15s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[1000px] lg:w-[1800px] h-[1000px] lg:h-[1800px] bg-brand-400/10 rounded-full blur-[200px] lg:blur-[280px] animate-[blob_15s_ease-in-out_infinite]" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[30%] left-[30%] w-[600px] lg:w-[1400px] h-[600px] lg:h-[1400px] bg-brand-500/6 rounded-full blur-[150px] lg:blur-[250px] animate-[blob_15s_ease-in-out_infinite]" style={{ animationDelay: '-10s' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-950/20 to-brand-950/40" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <AnimatedGrid />
      </div>

      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 relative z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* LEFT — Text (col-span-7 = 58%) */}
          <div className="lg:col-span-7 space-y-7 lg:space-y-9 text-center lg:text-left">
            <Reveal direction="down" delay={0}>
              <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-2 text-xs sm:text-sm font-medium text-brand-300">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" /></span>
                100% Français <Zap className="w-3.5 h-3.5 text-brand-400" />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-[clamp(2.2rem,6vw,5rem)] leading-[1.05] font-extrabold tracking-tight">
                <span className="text-white font-light">Contrats + Facturation</span>
                <br />
                <span className="gradient-text-light">propulsés</span>
                <span className="text-white font-light"> par</span>
                <br />
                <span className="gradient-text-light">l&apos;IA</span>
                <Zap className="inline-block w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-brand-400 ml-2 animate-[wiggle_2s_ease-in-out_infinite]" />
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-base sm:text-lg lg:text-xl text-brand-200/60 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Le seul outil qui gère vos salariés <span className="text-brand-300 font-semibold">ET</span> vos clients. Créez des CDI/CDD conformes et facturez en 30 secondes.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mx-auto lg:mx-0 max-w-sm sm:max-w-none">
                <ShimmerButton
                  href="/register"
                  className="bg-brand-500 hover:bg-brand-400 text-white px-7 py-4 text-sm sm:text-base shadow-xl shadow-brand-500/30 hover:shadow-2xl"
                >
                  Créer votre première facture en 30 secondes <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </ShimmerButton>
                <Link href="/demo" className="group inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium px-7 py-4 rounded-2xl transition-all border border-white/10 hover:border-white/20 text-sm sm:text-base backdrop-blur">
                  <PlayCircle className="w-4 h-4 text-brand-400" />Essayer la démo IA
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-[11px] text-brand-200/30 pt-2">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />France</span>
                <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" />SSL</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />RGPD</span>
              </div>
            </Reveal>

            {/* Social proof avatars */}
            <Reveal delay={0.5}>
              <div className="flex items-center gap-4 pt-1 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {['M', 'S', 'A', 'L'].map((initial, i) => {
                    const colors = ['bg-blue-500/30 text-blue-300', 'bg-purple-500/30 text-purple-300', 'bg-emerald-500/30 text-emerald-300', 'bg-amber-500/30 text-amber-300'];
                    return <div key={i} className={`w-8 h-8 rounded-full border-2 border-brand-950 ${colors[i]} font-bold text-[10px] flex items-center justify-center`}>{initial}</div>;
                  })}
                  <div className="w-8 h-8 rounded-full border-2 border-brand-950 bg-brand-500/20 flex items-center justify-center text-[9px] font-bold text-brand-300">+2k</div>
                </div>
                <div>
                  <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3 h-3 text-white fill-white" />)}</div>
                  <div className="text-[10px] text-brand-300/40 mt-0.5">2 000+ entrepreneurs</div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT — Visual (col-span-5 = 42%) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <HeroVisual />
          </div>
        </div>
      </div>

      {/* Wave transition */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 30C360 60 720 60 1080 40C1260 30 1380 25 1440 30V60H0V30Z" fill="white" /></svg>
      </div>
    </section>
  );
}
