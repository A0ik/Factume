'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Menu, X, Zap, Play, Sparkles, FileText,
  Send, Users, Calculator, LayoutGrid, Calendar, Package,
  Truck, FileClock, Mic, Type, Pencil, ShieldCheck, Lock,
  CheckCircle, Check, CreditCard, Link as LinkIcon, Star,
  Building2, Code2, Store, Briefcase, Palette, HeartPulse,
  ChevronDown, LogIn, Shield, Eye, Share2,
  Twitter, Linkedin, Github,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Marquee } from '@/components/ui/marquee';

const ease = [0.16, 1, 0.3, 1] as const;
const LC = 'max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32';

/* ═══ 2026 PHYSICS — Spring config for Reveal animations ═══ */
const springReveal = { type: 'spring' as const, stiffness: 280, damping: 24, mass: 0.8 };

function R({ children, delay = 0, x = 0, y = 20, className }: { children: React.ReactNode; delay?: number; x?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ ...springReveal, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WAVE COMPONENT — Vague SVG organique entre deux sections
   fromColor = couleur de la section AU-DESSUS (fond du div)
   toColor   = couleur de la section EN-DESSOUS (fill du SVG)
   variant   = forme différente pour varier visuellement
   ═══════════════════════════════════════════════════════════ */
function Wave({ fromColor, toColor, variant = 0 }: { fromColor: string; toColor: string; variant?: number }) {
  // Chaque path : courbe organique en haut, bas plat
  // Le SVG fait 80px de haut, la courbe occupe le haut, le reste est rempli par toColor
  const paths = [
    // Variant 0 : vague douce symétrique
    `M0 40L80 32C160 24 320 8 480 4C640 0 800 8 960 16C1120 24 1280 32 1360 36L1440 40V80H0Z`,
    // Variant 1 : vague asymétrique (creux à gauche)
    `M0 20C160 40 320 56 480 52C640 48 800 16 960 8C1120 0 1280 12 1440 28V80H0Z`,
    // Variant 2 : double vague
    `M0 48C120 20 240 4 360 12C480 20 600 48 720 44C840 40 960 8 1080 4C1200 0 1320 20 1440 40V80H0Z`,
    // Variant 3 : vague large et douce
    `M0 16L180 28C360 40 540 52 720 52C900 52 1080 40 1260 28C1350 22 1395 18 1440 16V80H0Z`,
  ];
  return (
    <div className="w-full leading-[0]" style={{ background: fromColor }}>
      <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '80px' }}>
        <path d={paths[variant % paths.length]} fill={toColor} />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */
const features = [
  { icon: Mic, title: 'Dictée vocale IA', desc: 'Parlez naturellement. "Facture pour Dupont, 5 jours à 600€…" L\'IA comprend, remplit les champs, calcule la TVA et génère le PDF.', highlight: true },
  { icon: CreditCard, title: 'Encaissement Stripe & Sumup', desc: 'Envoyez un lien de paiement avec votre facture. Votre client paie par carte, vous encaissez instantanément.' },
  { icon: FileText, title: 'Facturation multi-documents', desc: 'Factures, devis, avoirs, bons de commande, bons de livraison, factures d\'acompte.' },
  { icon: Send, title: 'Envoi et suivi', desc: 'E-mail avec PDF, liens de paiement, portail client, relances automatiques, signature.' },
  { icon: Users, title: 'CRM intégré', desc: 'Fiches clients, import CSV, auto-complétion SIRET, tags, historique et pipeline de vente.' },
  { icon: Calculator, title: 'Comptabilité', desc: 'Export officiel pour les impôts, suivi des dépenses, scan de reçus, rapprochement bancaire.' },
  { icon: LayoutGrid, title: 'Espace collaboratif', desc: 'Jusqu\'à 10 espaces de travail isolés, rôles, flux d\'activité et notifications.' },
  { icon: Calendar, title: 'Gestion de planning', desc: 'Calendrier intégré pour suivre vos échéances et relances.' },
  { icon: Package, title: 'Catalogue produits', desc: 'Créez votre catalogue de produits/services pour une facturation plus rapide.' },
  { icon: FileClock, title: 'Factures récurrentes', desc: 'Automatisez vos factures récurrentes avec un seul clic.' },
];

const steps = [
  { num: '01', title: 'Dictez votre facture', desc: 'Dites "Facture pour Dupont, 5 jours à 600€". L\'IA comprend et remplit tout.' },
  { num: '02', title: 'Vérifiez et envoyez', desc: 'Relisez en un coup d\'œil. Envoyez par e-mail avec un lien de paiement.' },
  { num: '03', title: 'Encaissez instantanément', desc: 'Votre client paie par carte via Stripe ou Sumup. Vous recevez l\'argent.' },
  { num: '04', title: 'Gérez vos contrats', desc: 'CDI, CDD, freelance — générez et signez électroniquement en 5 minutes.' },
];

const testimonials = [
  { name: 'Sarah M.', role: 'Développeuse freelance', text: 'Je passais 2h par mois sur mes factures. Depuis Factu.me, je dicte en 10 secondes et c\'est envoyé. Un gain de temps énorme.' },
  { name: 'Thomas L.', role: 'Auto-entrepreneur, transport', text: 'Le scan de reçus est bluffant. Je photographie mes tickets essence et c\'est directement catégorisé. Mon comptable est impressionné.' },
  { name: 'Claire D.', role: 'Directrice, agence digitale', text: 'On était 4 dans l\'agence, chacun avait son outil. Aujourd\'hui on est tous sur Factu.me avec des workspaces séparés.' },
];

const plans = [
  { name: 'Solo', price: '14,99€', yearly: '12€', tag: 'Freelances & Auto-entrepreneurs', features: ['Factures illimitées', 'Dictée vocale IA', 'Templates personnalisables', 'Agenda intégré', 'Support email'], popular: false },
  { name: 'Pro', price: '29,99€', yearly: '24€', tag: 'Contrats + Facturation', features: ['Tout Solo inclus', 'Contrats CDI/CDD intégrés', 'Signature électronique', 'CRM Pipeline', 'Notes de frais', '3 espaces de travail', 'Factures récurrentes'], popular: true },
  { name: 'Business', price: '59,99€', yearly: '48€', tag: 'PME qui embauchent', features: ['Tout Pro inclus', 'OCR et analyse IA', 'Espaces illimités', 'API & Webhooks', 'Support prioritaire', 'Multi-utilisateurs', 'Rapports avancés'], popular: false },
];

const faqItems = [
  { q: 'Est-ce vraiment gratuit ?', a: 'Oui, le plan Découverte est 100% gratuit (3 factures/mois). Pour tester les plans payants, profitez de 7 jours d\'essai complet avec carte bancaire requise, sans engagement.' },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Absolument. Vos données sont chiffrées, hébergées en France, et chaque utilisateur ne peut accéder qu\'à ses propres données.' },
  { q: 'Puis-je récupérer mes données si je veux quitter ?', a: 'Oui, conformément au RGPD vous pouvez télécharger l\'intégralité de vos données ou demander la suppression totale de votre compte.' },
  { q: 'L\'IA comprend-elle vraiment ce que je dis ?', a: 'Oui, l\'IA est entraînée pour comprendre le français naturel. Dites "5 jours de dev à 600€" et elle créera la facture complète.' },
  { q: 'Est-ce conforme pour les impôts français ?', a: 'Oui, les mentions légales sont ajoutées automatiquement. L\'export officiel pour les impôts est disponible sur les plans Pro et Business.' },
];

const trustItems = [
  { icon: Building2, label: 'Auto-entrepreneurs' },
  { icon: Code2, label: 'Freelances' },
  { icon: Store, label: 'TPE / PME' },
  { icon: Briefcase, label: 'Consultants' },
  { icon: Palette, label: 'Agences' },
  { icon: HeartPulse, label: 'Santé' },
];

/*
  COULEURS :
  Dark  = #020617 (slate-950)
  White = #ffffff
*/

export default function LandingPageClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  return (
    <div className="bg-slate-950 text-white antialiased overflow-x-hidden">

      {/* ════════════ NAVBAR ════════════ */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      )}>
        <div className={`${LC} flex items-center justify-between h-16 md:h-20`}>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" priority />
            <span className="text-lg font-bold tracking-tight text-white">Factu<span className="text-emerald-400">.me</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[{ label: 'Fonctionnalités', href: '#features' }, { label: 'IA', href: '#ai' }, { label: 'Tarifs', href: '#pricing' }].map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200">{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-white transition-colors"><LogIn className="w-3.5 h-3.5" />Connexion</Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-400 px-4 py-2 rounded-full transition-colors duration-200 ">
              Commencer gratuitement<ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-1">{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease }} className="md:hidden bg-slate-950/95 backdrop-blur-xl overflow-hidden">
              <div className="px-6 py-4 space-y-1">
                {[{ label: 'Fonctionnalités', href: '#features' }, { label: 'IA', href: '#ai' }, { label: 'Tarifs', href: '#pricing' }].map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="block py-3 text-sm font-medium text-slate-300 hover:text-white">{l.label}</a>
                ))}
                <Link href="/login" className="flex items-center gap-2 py-3 text-sm text-slate-400"><LogIn className="w-4 h-4" />Se connecter</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ════════════ HERO — DARK ════════════ */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-20 pb-8">
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className={`relative z-10 ${LC} py-16 md:py-24 2xl:py-40 w-full`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 2xl:gap-20 items-center">
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 2xl:space-y-10">
              <R delay={0}>
                <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs 2xl:text-sm font-medium text-slate-300">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />Dictée vocale + Paiement intégré
                </div>
              </R>
              <R delay={0.08}>
                <h1 className="text-[clamp(2rem,6vw,4rem)] md:text-7xl 2xl:text-[6.5rem] font-bold tracking-tight text-white leading-[1.08]">
                  Votre facture électronique,<br />
                  <span className="text-emerald-400">dictée là,</span> c&apos;est encaissé.
                </h1>
              </R>
              <R delay={0.16}>
                <p className="text-base sm:text-lg 2xl:text-xl 2xl:leading-relaxed text-slate-300 max-w-lg 2xl:max-w-xl">
                  Dites simplement ce que vous avez facturé, l&apos;IA s&apos;occupe du reste. Votre client paie en <span className="text-white font-medium">1 clic</span> via Stripe ou Sumup.
                </p>
              </R>
              <R delay={0.24}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                    <Link href="/register" className="inline-flex items-center justify-center gap-2 font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-full px-7 py-3.5 2xl:px-9 2xl:py-4 text-sm 2xl:text-base transition-colors duration-200">
                      Essayer gratuitement <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                    </Link>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                    <Link href="/demo" className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white px-7 py-3.5 2xl:px-9 2xl:py-4 rounded-full text-sm 2xl:text-base font-medium transition-colors duration-200 hover:bg-white/[0.04]">
                      <Play className="w-4 h-4 text-emerald-400" />Voir la démo
                    </Link>
                  </motion.div>
                </div>
              </R>
              <R delay={0.32}>
                <div className="flex items-center gap-5 pt-3">
                  <div className="flex -space-x-2">
                    {['M', 'S', 'A', 'L'].map((c, i) => (
                      <div key={i} className="w-8 2xl:w-10 h-8 2xl:h-10 rounded-full border-2 border-slate-950 bg-slate-700 text-[10px] 2xl:text-xs font-bold text-slate-300 flex items-center justify-center">{c}</div>
                    ))}
                    <div className="w-8 2xl:w-10 h-8 2xl:h-10 rounded-full border-2 border-slate-950 bg-slate-800 text-[9px] 2xl:text-[10px] font-bold text-slate-400 flex items-center justify-center">+2k</div>
                  </div>
                  <div>
                    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3 h-3 text-white fill-white" />)}</div>
                    <div className="text-[10px] 2xl:text-xs text-slate-400 mt-0.5">2 000+ entrepreneurs</div>
                  </div>
                </div>
              </R>
            </div>

            <div className="lg:col-span-5 flex justify-center mt-4 lg:mt-0">
              <R delay={0.2} y={0} x={30}>
                <div className="relative w-full max-w-[220px] sm:max-w-[280px] md:max-w-[320px] 2xl:max-w-[380px]">
                  <div style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.5)) drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}>
                    <Image src="/iphone-hero.png" alt="Factu.me — Application de facturation sur iPhone" width={500} height={1000} className="w-full h-auto object-contain" priority quality={95} />
                  </div>
                  <motion.div className="absolute -top-3 -left-6 md:-left-10 z-20 hidden lg:block" animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                    <div className="bg-white/10 backdrop-blur-lg border border-white/10 text-white rounded-xl px-3 py-2 flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-semibold whitespace-nowrap">Dictée vocale IA</span>
                    </div>
                  </motion.div>
                  <motion.div className="absolute -bottom-3 -right-6 md:-right-10 z-20 hidden lg:block" animate={{ y: [4, -4, 4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                    <div className="bg-white/10 backdrop-blur-lg border border-white/10 text-white rounded-xl px-3 py-2 flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-semibold whitespace-nowrap">Paiement Stripe</span>
                    </div>
                  </motion.div>
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : DARK → BLANC ═══ */}
      <Wave fromColor="#020617" toColor="#ffffff" variant={0} />

      {/* ════════════ ENCAISSEMENT — BLANC ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <R x={-30} y={0}>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><LinkIcon className="w-5 h-5 text-emerald-500" /></div>
                  <div><div className="font-bold text-sm text-gray-900">Lien de paiement envoyé</div><div className="text-xs text-gray-400">factu.me/pay/inv-0042</div></div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Conception site web</span><span className="font-semibold text-gray-900">3 000€</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Conseil UX/UI</span><span className="font-semibold text-gray-900">800€</span></div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2"><span className="font-semibold text-gray-900">Total TTC</span><span className="font-bold text-emerald-600">4 560€</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-center"><span className="text-sm font-bold text-gray-500 tracking-wide">stripe</span></div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-center"><span className="text-sm font-bold text-gray-500 tracking-wide">sumup</span></div>
                </div>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div><div className="text-sm font-semibold text-gray-900">Paiement reçu</div><div className="text-xs text-gray-500">4 560€ · Il y a 2 minutes</div></div>
                </div>
              </div>
            </R>
            <div className="space-y-8">
              <R x={30} y={0}>
                <p className="text-[11px] 2xl:text-xs text-emerald-600 uppercase tracking-[0.2em] font-medium mb-3">Encaissement</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
                  De la facture à votre compte bancaire en <span className="text-emerald-500">1 lien</span>
                </h2>
                <p className="text-base 2xl:text-lg 2xl:leading-relaxed text-gray-500 mb-8">
                  Connectez votre compte Stripe ou Sumup en 2 clics. Envoyez un lien de paiement sécurisé avec votre facture. Vos clients paient par carte, vous encaissez instantanément.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: CreditCard, text: 'Paiement par carte bancaire' },
                    { icon: ShieldCheck, text: 'Transactions sécurisées et conformes' },
                    { icon: Zap, text: 'Encaissement instantané, statut mis à jour' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-emerald-600" /></div>
                      <span className="text-sm 2xl:text-base text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : BLANC → DARK ═══ */}
      <Wave fromColor="#ffffff" toColor="#020617" variant={1} />

      {/* ════════════ SOCIAL PROOF — DARK ════════════ */}
      <section className="relative py-16 2xl:py-20 overflow-hidden bg-slate-950">
        <div className={`${LC}`}>
          <R>
            <p className="text-center text-[11px] 2xl:text-xs text-slate-400 uppercase tracking-[0.2em] font-medium mb-8">Ils nous font confiance</p>
          </R>
        </div>
        <Marquee pauseOnHover className="[--duration:30s]" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' } as React.CSSProperties}>
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-slate-400 flex-shrink-0 px-3">
              <Icon className="w-4 h-4" />
              <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* ═══ VAGUE : DARK → BLANC ═══ */}
      <Wave fromColor="#020617" toColor="#ffffff" variant={2} />

      {/* ════════════ FEATURES — BLANC ════════════ */}
      <section id="features" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-600 uppercase tracking-[0.2em] font-medium mb-4">Fonctionnalités</p></R>
            <R delay={0.05}><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">Tout ce dont vous avez besoin, <span className="text-emerald-500">en un seul endroit</span></h2></R>
            <R delay={0.1}><p className="text-base 2xl:text-lg 2xl:leading-relaxed text-gray-500 mt-4">Remplacez vos 5 outils par une seule plateforme.</p></R>
          </div>
          <div className="space-y-5 2xl:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-6">
              <R delay={0}>
                <div className="md:col-span-2 group bg-gray-50 border border-emerald-200 rounded-2xl p-7 2xl:p-10 transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-50/50 h-full">
                  <div className="w-12 h-12 2xl:w-14 2xl:h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-5"><Mic className="w-6 h-6 2xl:w-7 2xl:h-7 text-emerald-600" /></div>
                  <h3 className="text-lg 2xl:text-xl font-semibold text-gray-900 mb-2">Dictée vocale IA</h3>
                  <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-gray-500">
                    Parlez naturellement. <span className="text-gray-700">&ldquo;Facture pour Dupont, 5 jours à 600€&hellip;&rdquo;</span> L&apos;IA comprend, remplit les champs, calcule la TVA et génère le PDF.
                  </p>
                </div>
              </R>
              <R delay={0.06}>
                <div className="group bg-gray-50 border border-gray-200 rounded-2xl p-7 2xl:p-10 transition-all duration-300 hover:border-gray-300 h-full">
                  <div className="w-12 h-12 2xl:w-14 2xl:h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-5"><CreditCard className="w-6 h-6 2xl:w-7 2xl:h-7 text-gray-400 group-hover:text-emerald-500 transition-colors duration-300" /></div>
                  <h3 className="text-lg 2xl:text-xl font-semibold text-gray-900 mb-2">Encaissement Stripe & Sumup</h3>
                  <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-gray-500">Envoyez un lien de paiement avec votre facture. Votre client paie par carte, vous encaissez instantanément.</p>
                </div>
              </R>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 2xl:gap-6">
              {features.slice(2, 6).map((f, i) => (
                <R key={i} delay={i * 0.04}>
                  <div className="group bg-gray-50 border border-gray-200 rounded-2xl p-6 2xl:p-8 transition-all duration-300 hover:border-gray-300 h-full">
                    <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4"><f.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-gray-400 group-hover:text-emerald-500 transition-colors duration-300" /></div>
                    <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                    <p className="text-xs 2xl:text-sm 2xl:leading-relaxed text-gray-500">{f.desc}</p>
                  </div>
                </R>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 2xl:gap-6">
              {features.slice(6, 10).map((f, i) => (
                <R key={i} delay={i * 0.04}>
                  <div className="group bg-gray-50 border border-gray-200 rounded-2xl p-6 2xl:p-8 transition-all duration-300 hover:border-gray-300 h-full">
                    <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4"><f.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-gray-400 group-hover:text-emerald-500 transition-colors duration-300" /></div>
                    <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                    <p className="text-xs 2xl:text-sm 2xl:leading-relaxed text-gray-500">{f.desc}</p>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : BLANC → DARK ═══ */}
      <Wave fromColor="#ffffff" toColor="#020617" variant={3} />

      {/* ════════════ AI SECTION — DARK ════════════ */}
      <section id="ai" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC} relative z-10`}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <R x={-30} y={0}>
              <div className="bg-slate-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-700" /><div className="w-2.5 h-2.5 rounded-full bg-slate-700" /><div className="w-2.5 h-2.5 rounded-full bg-slate-700" /></div>
                  <span className="text-[10px] 2xl:text-xs text-emerald-400 font-medium ml-2">Factu.me AI</span>
                </div>
                <div className="p-5 2xl:p-7 space-y-4 font-mono text-xs 2xl:text-sm">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 bg-white/[0.05] rounded-lg flex items-center justify-center flex-shrink-0"><Mic className="w-3.5 h-3.5 text-slate-400" /></div>
                    <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2.5 text-slate-300 max-w-[90%] border border-white/[0.04]">
                      &quot;Facture pour Dupont, 5 jours de dev à 600€ HT, TVA 20%, ajoute 2 jours conseil à 400€&quot;
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 bg-white/[0.05] rounded-lg flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-slate-400" /></div>
                    <div className="space-y-2 max-w-[90%]">
                      <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2 text-emerald-400 border border-white/[0.04]">Analyse en cours...</div>
                      <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-3 text-slate-300 space-y-1.5 border border-white/[0.04]">
                        {['Client : Dupont Consulting SAS', 'Développement — 5j x 600€', 'Conseil — 2j x 400€', 'TVA 20% appliquée'].map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-400"><Check className="w-3 h-3 text-emerald-500" /><span className="text-[11px] 2xl:text-xs">{t}</span></div>
                        ))}
                        <div className="flex items-center gap-1.5 text-white font-semibold pt-1 border-t border-white/[0.06]"><Zap className="w-3 h-3 text-emerald-400" /><span className="text-[11px] 2xl:text-xs">FACT-2026-0042 créée</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </R>
            <div className="space-y-8">
              <R x={30} y={0}>
                <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-3">Propulsé par l&apos;IA</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">Dites-le, l&apos;IA<br />le fait pour vous</h2>
                <div className="space-y-5">
                  {[
                    { icon: Mic, title: 'Dictée vocale', desc: 'Parlez naturellement, l\'IA remplit tous les champs.' },
                    { icon: Type, title: 'Génération textuelle', desc: 'Tapez en langage naturel, descriptions automatiques.' },
                    { icon: Pencil, title: 'Modification intelligente', desc: '"Ajoute 2 jours" — l\'IA comprend et modifie.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-white/[0.05] rounded-xl flex items-center justify-center flex-shrink-0"><item.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-slate-400" /></div>
                      <div><h3 className="font-semibold text-sm 2xl:text-base text-white mb-1">{item.title}</h3><p className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-400">{item.desc}</p></div>
                    </div>
                  ))}
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : DARK → BLANC ═══ */}
      <Wave fromColor="#020617" toColor="#ffffff" variant={0} />

      {/* ════════════ CONTRATS — BLANC ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <div className="space-y-8">
              <R x={-30} y={0}>
                <p className="text-[11px] 2xl:text-xs text-emerald-600 uppercase tracking-[0.2em] font-medium mb-3">Contrats de travail</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
                  Même vos contrats de travail, en <span className="text-emerald-500">5 minutes</span>
                </h2>
                <p className="text-base 2xl:text-lg 2xl:leading-relaxed text-gray-500 mb-8">
                  CDI, CDD, freelance : générez des contrats conformes au droit français et signez-les électroniquement.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: FileText, title: 'CDI & CDD conformes', desc: 'Clauses légales, conventions collectives' },
                    { icon: Shield, title: 'Signature eIDAS incluse', desc: 'Niveau Avancé gratuit, valeur légale' },
                    { icon: Users, title: 'Suivi des salariés', desc: 'Avenants, renouvellements, dates d\'expiration' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0"><item.icon className="w-5 h-5 text-emerald-600" /></div>
                      <div><h3 className="font-semibold text-sm text-gray-900 mb-0.5">{item.title}</h3><p className="text-sm text-gray-500">{item.desc}</p></div>
                    </div>
                  ))}
                </div>
              </R>
            </div>
            <R x={30} y={0}>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contrat de travail</div>
                    <div className="text-sm font-bold text-gray-900">CDI — Développeur Full Stack</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" />Conforme</div>
                </div>
                <div className="space-y-3 mb-4">
                  {[['Type de contrat', 'CDI'], ['Salaire brut', '3 500€/mois'], ['Convention collective', 'SYNTEC'], ['Période d\'essai', '4 mois'], ['Lieu de travail', 'Paris + Télétravail']].map(([label, value], i) => (
                    <div key={i} className="flex justify-between text-sm"><span className="text-gray-500">{label}</span><span className="font-semibold text-gray-900">{value}</span></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white text-gray-700 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-gray-200"><Eye className="w-4 h-4 text-gray-400" />Aperçu</div>
                  <div className="flex-1 bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"><Share2 className="w-4 h-4" />Faire signer</div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-400"><Shield className="w-3.5 h-3.5 text-emerald-500" />Signature eIDAS Avancé gratuite · Valeur légale</div>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : BLANC → DARK ═══ */}
      <Wave fromColor="#ffffff" toColor="#020617" variant={1} />

      {/* ════════════ TIMELINE — DARK ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Comment ça marche</p></R>
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">Opérationnel en quelques minutes</h2></R>
          </div>
          <div className="relative max-w-4xl 2xl:max-w-5xl mx-auto">
            <div className="absolute left-[23px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-slate-800" />
            <div className="space-y-12 md:space-y-16 2xl:space-y-20">
              {steps.map((step, i) => (
                <div key={i} className={cn('relative flex items-start gap-8', i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse')}>
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-950 z-10" />
                  <R delay={i * 0.1} x={i % 2 === 0 ? -30 : 30} y={0} className={cn('ml-12 md:ml-0 md:w-[calc(50%-2rem)]', i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left')}>
                    <span className="text-emerald-400 font-mono text-xs 2xl:text-sm font-bold">{step.num}</span>
                    <h3 className="text-lg 2xl:text-xl font-semibold text-white mt-1 mb-2">{step.title}</h3>
                    <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-400">{step.desc}</p>
                  </R>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : DARK → BLANC ═══ */}
      <Wave fromColor="#020617" toColor="#ffffff" variant={2} />

      {/* ════════════ TESTIMONIALS — BLANC ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-600 uppercase tracking-[0.2em] font-medium mb-4">Témoignages</p></R>
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">Ce qu&apos;ils en disent</h2></R>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7">
            {testimonials.map((t, i) => (
              <R key={i} delay={i * 0.08}>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8 2xl:p-10 h-full flex flex-col transition-colors duration-300 hover:border-gray-300">
                  <div className="flex gap-0.5 mb-4">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-amber-400 fill-amber-400" />)}</div>
                  <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-gray-600 flex-grow mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="w-9 h-9 2xl:w-11 2xl:h-11 rounded-full bg-gray-200 text-gray-600 font-bold text-xs 2xl:text-sm flex items-center justify-center">{t.name.charAt(0)}</div>
                    <div><div className="font-semibold text-sm 2xl:text-base text-gray-900">{t.name}</div><div className="text-[11px] 2xl:text-xs text-gray-400">{t.role}</div></div>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : BLANC → DARK ═══ */}
      <Wave fromColor="#ffffff" toColor="#020617" variant={3} />

      {/* ════════════ PRICING — DARK ════════════ */}
      <section id="pricing" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC}`}>
          <div className="text-center mb-14 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Tarifs transparents</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white mb-4">Choisissez votre plan</h2>
              <p className="text-base 2xl:text-lg text-slate-400">Sans engagement. Évoluez quand vous voulez.</p>
            </R>
            <div className="flex items-center justify-center gap-3 mt-8">
              <motion.button whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} onClick={() => setBilling('monthly')} className={cn('px-4 py-2 rounded-xl text-sm 2xl:text-base font-semibold transition-colors duration-200', billing === 'monthly' ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white')}>Mensuel</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} onClick={() => setBilling('yearly')} className={cn('px-4 py-2 rounded-xl text-sm 2xl:text-base font-semibold transition-colors duration-200', billing === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white')}>
                Annuel <span className="text-xs opacity-70">(-20%)</span>
              </motion.button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7 max-w-5xl 2xl:max-w-6xl mx-auto items-start">
            {plans.map((plan, i) => (
              <R key={i} delay={i * 0.06}>
                <div className={cn(
                  'relative bg-slate-900/40 border rounded-2xl p-7 2xl:p-9 flex flex-col h-full transition-colors duration-300',
                  plan.popular ? 'border-emerald-500/50 scale-100 md:scale-105 z-10' : 'border-white/[0.06] hover:border-white/10'
                )}>
                  {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-emerald-500 text-white text-[10px] 2xl:text-xs font-bold px-3 py-1 rounded-full">Populaire</span></div>}
                  <div className="mb-6">
                    <h3 className="text-xl 2xl:text-2xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-xs 2xl:text-sm text-slate-400 mb-4">{plan.tag}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl 2xl:text-5xl font-extrabold text-white tracking-tight">{billing === 'monthly' ? plan.price : plan.yearly}</span>
                      <span className="text-sm 2xl:text-base text-slate-400">/mois</span>
                    </div>
                    {billing === 'yearly' && <p className="text-xs 2xl:text-sm text-emerald-400 font-medium mt-1">Économisez sur l&apos;annuel</p>}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm 2xl:text-base"><Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-500 flex-shrink-0" /><span className="text-slate-400">{f}</span></li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.name.toLowerCase()}&billing=${billing}`} className={cn('block text-center font-semibold py-3 2xl:py-3.5 rounded-xl text-sm 2xl:text-base transition-colors duration-200 ', plan.popular ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]')}>
                    Essai 7 jours gratuit
                  </Link>
                </div>
              </R>
            ))}
          </div>
          <R>
            <p className="text-center text-xs 2xl:text-sm text-slate-400 mt-8 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />Données en France · SSL · RGPD · Annulation en un clic
            </p>
          </R>
        </div>
      </section>

      {/* ═══ VAGUE : DARK → BLANC ═══ */}
      <Wave fromColor="#020617" toColor="#ffffff" variant={0} />

      {/* ════════════ FAQ — BLANC ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32`}>
          <div className="mb-14 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-600 uppercase tracking-[0.2em] font-medium mb-4">FAQ</p></R>
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900">Questions fréquentes</h2></R>
          </div>
          <div className="space-y-3 2xl:space-y-4">
            {faqItems.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VAGUE : BLANC → DARK ═══ */}
      <Wave fromColor="#ffffff" toColor="#020617" variant={1} />

      {/* ════════════ CTA FINAL — DARK ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32 text-center relative z-10`}>
          <R y={0}>
            <h2 className="text-4xl md:text-6xl 2xl:text-8xl font-bold tracking-tight text-white leading-[1.1] mb-6 2xl:mb-8">
              Votre facture est à<br /><span className="text-emerald-400">un mot.</span>
            </h2>
            <p className="text-lg 2xl:text-xl 2xl:leading-relaxed text-slate-400 mb-10 2xl:mb-12 max-w-lg 2xl:max-w-2xl mx-auto">Dictez. Encaissez. Gérez. Rejoignez 2 000+ entrepreneurs qui ont simplifié leur facturation.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                <Link href="/register" className="inline-flex items-center justify-center gap-2 font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-full px-8 py-4 2xl:px-10 2xl:py-5 text-base 2xl:text-lg transition-colors duration-200">
                  Commencer gratuitement <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </Link>
              </motion.div>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white px-8 py-4 2xl:px-10 2xl:py-5 rounded-full text-base 2xl:text-lg font-medium transition-colors duration-200">
                Se connecter
              </Link>
            </div>
            <p className="text-xs 2xl:text-sm text-slate-500 mt-8">Sans engagement · Annulation en un clic</p>
          </R>
        </div>
      </section>

      {/* ════════════ FOOTER — DARK ════════════ */}
      <footer className="relative py-14 md:py-20 2xl:py-24 overflow-hidden bg-slate-950 border-t border-white/[0.04]">
        <div className={`${LC}`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 2xl:gap-12 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" />
                <span className="text-lg 2xl:text-xl font-bold text-white">Factu<span className="text-emerald-400">.me</span></span>
              </Link>
              <p className="text-xs 2xl:text-sm text-slate-400 max-w-xs leading-relaxed mb-4">La plateforme de facturation 100% française, propulsée par l&apos;IA.</p>
              <div className="flex gap-2">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 2xl:w-9 2xl:h-9 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors duration-200"><Icon className="w-3.5 h-3.5 text-slate-400" /></a>
                ))}
              </div>
            </div>
            {[
              { title: 'Produit', links: [['Fonctionnalités', '#features'], ['Tarifs', '#pricing'], ['IA', '#ai']] },
              { title: 'Ressources', links: [['Démo', '/demo'], ['Blog', '/blog'], ['Modèles', '/modeles-facture'], ['Mentions obligatoires', '/mentions-obligatoires-facture']] },
              { title: 'Par statut', links: [['Auto-entrepreneur', '/comment-facturer/auto-entrepreneur'], ['SASU', '/comment-facturer/sasu'], ['EURL', '/comment-facturer/eurl'], ['Tous', '/comment-facturer']] },
              { title: 'Confiance', links: [['Sécurité', '/securite'], ['Mentions légales', '/legal/mentions-legales'], ['CGU', '/legal/cgu'], ['Confidentialité', '/legal/confidentialite']] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-xs 2xl:text-sm text-slate-300 mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('#') ? (
                        <a href={href} onClick={(e) => scrollTo(e, href)} className="text-xs 2xl:text-sm text-slate-400 hover:text-white transition-colors duration-200">{label}</a>
                      ) : (
                        <Link href={href} className="text-xs 2xl:text-sm text-slate-400 hover:text-white transition-colors duration-200">{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs 2xl:text-sm text-slate-500">2026 Factu.me. Fait en France.</p>
            <div className="flex items-center gap-1.5 text-[11px] 2xl:text-xs text-slate-500"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Opérationnel</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FAQ ITEM
   ═══════════════════════════════════════════════════════════ */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden transition-colors duration-300 hover:border-gray-300">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 2xl:p-6 text-left">
        <span className="font-semibold text-sm 2xl:text-base text-gray-900 pr-4">{question}</span>
        <ChevronDown className={cn('w-4 h-4 2xl:w-5 2xl:h-5 text-gray-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div className={cn('overflow-hidden transition-all duration-200', open ? 'max-h-40 px-5 2xl:px-6 pb-5 2xl:pb-6' : 'max-h-0')}>
        <p className="text-sm 2xl:text-base text-gray-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
