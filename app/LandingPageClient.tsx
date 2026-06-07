'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Menu, X, Zap, Play, Sparkles, FileText,
  Check, CreditCard, Link as LinkIcon, Star,
  Building2, Code2, Store, Briefcase, Palette, HeartPulse,
  ChevronDown, LogIn, Shield, Eye, Share2,
  Twitter, Linkedin, Github, Brain, Mic, Type, Pencil,
  ShieldCheck, Lock, CheckCircle, Calculator, FileClock,
  LayoutGrid, Crown, Hammer, Globe, Plug,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Marquee } from '@/components/ui/marquee';

const ease = [0.16, 1, 0.3, 1] as const;
const LC = 'max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32';

/* ─── Reveal animation wrapper — CSS-only, zero JS ───
   Uses @keyframes reveal so content is ALWAYS visible.
   If CSS animations work: smooth fade-in.
   If CSS animations fail: element defaults to opacity 1 → visible.
   No useState, no useEffect, no IntersectionObserver.
*/
function R({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; x?: number; y?: number; className?: string }) {
  return (
    <div
      className={cn('animate-[reveal_0.7s_ease-out_both]', className)}
      style={{ animationDelay: `${delay * 1000}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Wave transition between sections ─── */
function Wave({ fromColor, toColor, variant = 0 }: { fromColor: string; toColor: string; variant?: number }) {
  const paths = [
    `M0 40L80 32C160 24 320 8 480 4C640 0 800 8 960 16C1120 24 1280 32 1360 36L1440 40V80H0Z`,
    `M0 20C160 40 320 56 480 52C640 48 800 16 960 8C1120 0 1280 12 1440 28V80H0Z`,
    `M0 48C120 20 240 4 360 12C480 20 600 48 720 44C840 40 960 8 1080 4C1200 0 1320 20 1440 40V80H0Z`,
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

/* ─── Voice Waveform — signature visuelle IA ─── */
function VoiceWaveform() {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[3px] h-12" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const center = bars / 2;
        const distFromCenter = Math.abs(i - center) / center;
        const maxH = 40;
        const minH = 6;
        const baseH = maxH * (1 - distFromCenter * 0.6);
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-emerald-500 to-teal-300"
            animate={{ height: [`${minH}px`, `${baseH}px`, `${minH + 8}px`, `${baseH * 0.7}px`, `${minH}px`] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

/* ─── Scroll Trail — ruban vectoriel qui se dessine au scroll ───
   Positionné sur le tiers droit de l'écran, bande étroite.
   mix-blend-mode: screen → invisible sur fond blanc, visible sur fond sombre.
*/
function ScrollTrail() {
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const glow = glowRef.current;
    if (!path) return;

    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;

    let glowLen = 0;
    if (glow) {
      glowLen = glow.getTotalLength();
      glow.style.strokeDasharray = `${glowLen}`;
      glow.style.strokeDashoffset = `${glowLen}`;
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const p = Math.min(window.scrollY / docHeight, 1);
          path.style.strokeDashoffset = `${len * (1 - p)}`;
          if (glow) glow.style.strokeDashoffset = `${glowLen * (1 - p)}`;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const d = [
    'M60,0',
    'C30,5 10,10 50,15',
    'C90,20 95,25 40,30',
    'C5,35 15,40 65,45',
    'C95,50 90,55 30,60',
    'C10,65 15,70 70,75',
    'C95,80 85,85 35,90',
    'C20,94 40,98 60,100',
  ].join(' ');

  return (
    <div
      className="fixed top-0 right-[5%] w-[20%] h-full pointer-events-none z-[5]"
      style={{ mixBlendMode: 'screen' }}
      aria-hidden="true"
    >
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="4%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.5" />
            <stop offset="92%" stopColor="#34d399" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Glow */}
        <path
          ref={glowRef}
          d={d}
          stroke="url(#stGrad)"
          strokeWidth="16"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          fill="none"
          opacity="0.14"
        />
        {/* Trait principal */}
        <path
          ref={pathRef}
          d={d}
          stroke="url(#stGrad)"
          strokeWidth="4"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const secondaryFeatures = [
  { icon: CreditCard, title: 'Encaissement Stripe & Sumup', desc: 'Envoyez un lien de paiement avec votre facture. Encaissez par carte, instantanément.' },
  { icon: Brain, title: 'CRM intelligent', desc: 'Clients auto-complétés via SIRET. Pipeline visuel qui se met à jour à chaque facture.' },
  { icon: FileText, title: 'Contrats CDI & CDD', desc: 'Générés conformes au droit français et signés électroniquement en 5 minutes.' },
  { icon: Calculator, title: 'Notes de frais + OCR', desc: 'Photographiez un reçu, l\'IA catégorise tout. Export FEC pour les impôts.' },
  { icon: FileClock, title: 'Factures récurrentes', desc: 'Automatisez vos factures mensuelles en 1 clic. Jamais plus d\'oubli.' },
  { icon: LayoutGrid, title: 'Comptabilité exportable', desc: 'Export officiel pour les impôts, suivi URSSAF, déclaration TVA intégrée.' },
];

const steps = [
  { num: '01', title: 'Dictez votre facture', desc: 'Dites "Facture pour Dupont, 5 jours à 600€". L\'IA comprend et remplit tout.' },
  { num: '02', title: 'Vérifiez et envoyez', desc: 'Relisez en un coup d\'œil. Envoyez par e-mail avec un lien de paiement.' },
  { num: '03', title: 'Encaissez instantanément', desc: 'Votre client paie par carte via Stripe ou Sumup. Vous recevez l\'argent.' },
];

const testimonials = [
  { name: 'Sarah M.', role: 'Développeuse freelance', text: 'Je passais 2h par mois sur mes factures. Depuis Factu.me, je dicte en 10 secondes et c\'est envoyé. Un gain de temps énorme.' },
  { name: 'Thomas L.', role: 'Auto-entrepreneur, transport', text: 'Le scan de reçus est bluffant. Je photographie mes tickets essence et c\'est directement catégorisé. Mon comptable est impressionné.' },
  { name: 'Claire D.', role: 'Directrice, agence digitale', text: 'On était 4 dans l\'agence, chacun avait son outil. Aujourd\'hui on est tous sur Factu.me avec des workspaces séparés.' },
];

const plans = [
  { name: 'Solo', price: '14,99€', yearly: '12€', tag: 'Freelances & Auto-entrepreneurs', features: ['Facture électronique conforme 2026', 'Factures illimitées', 'Dictée vocale IA', 'Templates personnalisables', 'Agenda intégré', 'Support email'], popular: false },
  { name: 'Pro', price: '29,99€', yearly: '24€', tag: 'TPE & PME', features: ['Facture électronique conforme 2026', 'Tout Solo inclus', 'Contrats CDI/CDD intégrés', 'Signature électronique', 'CRM Pipeline', 'Notes de frais', '3 espaces de travail'], popular: true },
  { name: 'Business', price: '59,99€', yearly: '48€', tag: 'PME en croissance', features: ['Facture électronique conforme 2026', 'Tout Pro inclus', 'OCR et analyse IA', 'Espaces illimités', 'API & Webhooks', 'Multi-utilisateurs', 'Rapports avancés'], popular: false },
];

const faqItems = [
  { q: 'Est-ce vraiment gratuit ?', a: 'Oui, le plan Découverte est 100% gratuit (3 factures/mois). Pour tester les plans payants, profitez de 7 jours d\'essai complet, sans engagement.' },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Absolument. Vos données sont chiffrées, hébergées en France, et chaque utilisateur ne peut accéder qu\'à ses propres données.' },
  { q: 'L\'IA comprend-elle vraiment ce que je dis ?', a: 'Oui, l\'IA comprend parfaitement le français naturel. Dites "5 jours de dev à 600€" et elle crée la facture complète. Vous n\'avez qu\'à vérifier et envoyer.' },
  { q: 'Est-ce conforme pour les impôts français ?', a: 'Oui, les mentions légales sont ajoutées automatiquement. Vos factures électroniques sont conformes et prêtes pour l\'obligation 2026. L\'export officiel pour les impôts est disponible sur tous les plans.' },
  { q: 'Puis-je récupérer mes données si je veux quitter ?', a: 'Oui, conformément au RGPD vous pouvez télécharger l\'intégralité de vos données ou demander la suppression totale de votre compte.' },
];

const trustItems = [
  { icon: Building2, label: 'Auto-entrepreneurs' },
  { icon: Code2, label: 'Freelances' },
  { icon: Store, label: 'TPE / PME' },
  { icon: Briefcase, label: 'Consultants' },
  { icon: Palette, label: 'Agences' },
  { icon: HeartPulse, label: 'Santé' },
];



const targetAudience = [
  { icon: Building2, title: 'Auto-entrepreneur', copy: 'Vos factures en 10 secondes, sans prise de tête.', color: 'from-emerald-500 to-teal-500' },
  { icon: Hammer, title: 'Artisan', copy: "Entre deux chantiers, dictez et c'est envoyé.", color: 'from-amber-500 to-orange-500' },
  { icon: Store, title: 'TPE / PME', copy: 'Gérez votre équipe et vos factures au même endroit.', color: 'from-blue-500 to-cyan-500' },
  { icon: Code2, title: 'Freelance', copy: 'Facturation, CRM et contrats — un seul outil.', color: 'from-violet-500 to-purple-500' },
  { icon: Briefcase, title: 'Consultant', copy: 'Devis signés et factures encaissées en 1 clic.', color: 'from-rose-500 to-pink-500' },
  { icon: Palette, title: 'Agence', copy: 'Workspaces séparés pour chaque client.', color: 'from-indigo-500 to-blue-500' },
];

const integrations = [
  { name: 'Stripe' }, { name: 'Sumup' }, { name: 'Google' }, { name: 'CSV' }, { name: 'PDF' },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LandingPageClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [navLight, setNavLight] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Navbar adaptive : observe la section visible pour changer la couleur */
  useEffect(() => {
    const sections = document.querySelectorAll('section[data-nav-theme]');
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setNavLight(entry.target.getAttribute('data-nav-theme') === 'light');
          break;
        }
      }
    }, { threshold: 0.3 });
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  }, []);

  /* Navbar text colors based on background */
  const navText = navLight ? 'text-slate-600' : 'text-slate-400';
  const navLogo = navLight ? 'text-slate-900' : 'text-white';
  const navBg = scrolled
    ? navLight
      ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200'
      : 'bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.06]'
    : 'bg-transparent';

  const navLinks = [
    { label: 'Facturation', href: '#features' },
    { label: 'IA Vocale', href: '#ai' },
    { label: 'Tarifs', href: '#pricing' },
  ];

  return (
    <div id="landing" className="bg-slate-950 text-white antialiased overflow-x-hidden">

      {/* ═══ SCROLL TRAIL — ruban vectoriel qui se dessine au scroll ═══ */}
      <ScrollTrail />

      {/* ═══ NAVBAR ═══ */}
      <nav className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300', navBg)}>
        <div className={`${LC} flex items-center justify-between h-16 md:h-20`}>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" priority />
            <span className={cn('text-lg font-bold tracking-tight transition-colors duration-300', navLogo)}>Factu<span className="text-emerald-400">.me</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className={cn('text-[13px] font-medium transition-colors duration-300 hover:text-emerald-500', navText)}>{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className={cn('hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-300 hover:text-emerald-500', navText)}>
              <LogIn className="w-3.5 h-3.5" />Connexion
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1 text-[11px] sm:text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-colors duration-200 active:scale-[0.97] whitespace-nowrap">
              <span className="hidden sm:inline">Commencer gratuitement</span><span className="sm:hidden">Commencer</span><ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className={cn('md:hidden p-1 transition-colors duration-300', navLight ? 'text-slate-700' : 'text-white')}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease }} className={cn('md:hidden backdrop-blur-xl overflow-hidden', navLight ? 'bg-white/95' : 'bg-slate-950/95')}>
              <div className="px-6 py-4 space-y-1">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className={cn('block py-3 text-sm font-medium transition-colors', navLight ? 'text-slate-700 hover:text-emerald-600' : 'text-slate-300 hover:text-white')}>{l.label}</a>
                ))}
                <Link href="/login" className={cn('flex items-center gap-2 py-3 text-sm', navLight ? 'text-slate-500' : 'text-slate-400')}><LogIn className="w-4 h-4" />Se connecter</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ════════════ HERO — Pattern Stripe/Linear ════════════ */}
      <section data-nav-theme="dark" className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[200px] animate-[blob_15s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-500/[0.06] rounded-full blur-[180px] animate-[blob_15s_ease-in-out_infinite]" style={{ animationDelay: '-5s' }} />
        </div>

        <div className={`relative z-10 ${LC} py-16 sm:py-24 md:py-32 2xl:py-40 w-full`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 2xl:gap-20 items-center">
            <div className="lg:col-span-7 space-y-8 2xl:space-y-10">
              {/* H1 — UN headline, RIEN d'autre au-dessus */}
              <R delay={0.08}>
                <h1 className="text-3xl sm:text-5xl md:text-7xl 2xl:text-[6.5rem] font-bold tracking-tight text-white leading-[1.05]">
                  Dictez votre facture<br />électronique.{' '}
                  <span className="text-emerald-400">
                    <span className="relative inline">
                      Encaissez
                      {/* Brush stroke underline — hand-drawn feel */}
                      <svg
                        className="absolute left-0 w-full overflow-visible pointer-events-none"
                        style={{ bottom: '-4px', height: '14px' }}
                        viewBox="0 0 200 16"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M2,9 C25,4 55,14 80,8 C105,3 135,13 160,7 C180,3 194,11 198,6"
                          stroke="white"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.7"
                          style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: 'brushDraw 1s ease-out 0.8s forwards' }}
                        />
                      </svg>
                    </span>
                    <br className="sm:hidden" />{' '}en 5 secondes.
                  </span>
                </h1>
              </R>

              {/* Double CTA — Loi 1 : ancrage + secondaire */}
              <R delay={0.2}>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link href="/register" className="group relative inline-flex items-center justify-center gap-3 font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-full px-10 py-5 2xl:px-12 2xl:py-6 text-base 2xl:text-lg transition-all duration-300 active:scale-[0.97] shadow-[0_0_40px_rgba(16,185,129,0.35)] hover:shadow-[0_0_60px_rgba(16,185,129,0.45)]">
                    <Mic className="w-5 h-5 2xl:w-6 2xl:h-6" />
                    Essayer gratuitement
                    <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a href="#features" onClick={(e) => scrollTo(e, '#features')} className="group inline-flex items-center justify-center gap-2 text-white/70 hover:text-white font-medium px-6 py-5 2xl:px-8 2xl:py-6 text-base 2xl:text-lg transition-colors duration-300 underline underline-offset-4 decoration-white/20 hover:decoration-white/60">
                    <Play className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-400" />
                    Découvrir la plateforme
                  </a>
                </div>
              </R>

              {/* Preuve sociale immédiate — Loi 5 */}
              <R delay={0.3}>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex -space-x-2">
                    {['M', 'S', 'A', 'L'].map((initial, i) => {
                      const colors = ['bg-blue-500/30 text-blue-300', 'bg-purple-500/30 text-purple-300', 'bg-emerald-500/30 text-emerald-300', 'bg-amber-500/30 text-amber-300'];
                      return <div key={i} className={'w-7 h-7 rounded-full border-2 border-slate-950 ' + colors[i] + ' font-bold text-[9px] flex items-center justify-center'}>{initial}</div>;
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />)}</div>
                    <span className="text-[10px] text-slate-400">2 000+ entrepreneurs nous font confiance</span>
                  </div>
                </div>
              </R>
            </div>

            {/* iPhone mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <R delay={0.2} y={0} x={30}>
                <div className="relative w-full max-w-[280px] md:max-w-[320px] 2xl:max-w-[380px]">
                  <div style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.5)) drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}>
                    <Image src="/iphone-hero.png" alt="Factu.me — Facturation intelligente sur iPhone" width={500} height={1000} className="w-full h-auto object-contain" priority quality={95} />
                  </div>
                  <motion.div className="absolute -top-3 -left-6 md:-left-10 z-20 hidden lg:block" animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                    <div className="bg-white/10 backdrop-blur-lg border border-white/10 text-white rounded-xl px-3 py-2 flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-semibold whitespace-nowrap">Écoute en cours…</span>
                    </div>
                  </motion.div>
                  <motion.div className="absolute -bottom-3 -right-6 md:-right-10 z-20 hidden lg:block" animate={{ y: [4, -4, 4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                    <div className="bg-white/10 backdrop-blur-lg border border-white/10 text-white rounded-xl px-3 py-2 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-semibold whitespace-nowrap">4 560€ encaissé</span>
                    </div>
                  </motion.div>
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#020617" toColor="#ffffff" variant={0} />

      {/* ════════════ UNE SOLUTION POUR TOUS — Loi 2 ════════════ */}
      <section data-nav-theme="light" className="relative py-20 md:py-28 2xl:py-36 overflow-hidden bg-white">
        <div className={LC}>
          <div className="text-center mb-14 2xl:mb-20">
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">Une solution pour <span className="text-emerald-500">tous</span></h2></R>
            <R delay={0.1}><p className="text-base 2xl:text-lg text-gray-500 mt-4 max-w-xl mx-auto">Quel que soit votre métier, Factu.me s'adapte à votre quotidien.</p></R>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 2xl:gap-5 max-w-6xl 2xl:max-w-7xl mx-auto">
            {targetAudience.map((item, i) => (
              <R key={item.title} delay={i * 0.06}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group bg-gray-50 border border-gray-200 rounded-2xl p-5 2xl:p-6 text-center hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 h-full cursor-default"
                >
                  <div className={"w-12 h-12 2xl:w-14 2xl:h-14 bg-gradient-to-br " + item.color + " rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300"}>
                    <item.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-white" />
                  </div>
                  <h3 className="text-sm 2xl:text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-[11px] 2xl:text-xs text-gray-500 leading-relaxed">{item.copy}</p>
                </motion.div>
              </R>
            ))}
          </div>
        </div>
      </section>

      <Wave fromColor="#ffffff" toColor="#020617" variant={2} />

      {/* ════════════ CORE FEATURE — Facture électronique + IA ════════════ */}
      <section data-nav-theme="dark" id="features" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC} relative z-10`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Facturation électronique</p></R>
            <R delay={0.05}><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">Votre facture,<br /><span className="text-emerald-400">dictée et conforme</span></h2></R>
          </div>

          {/* Hero Feature — 2 colonnes */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center mb-20 2xl:mb-28">
            <R x={-30} y={0}>
              <div className="bg-slate-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-700" /><div className="w-2.5 h-2.5 rounded-full bg-slate-700" /><div className="w-2.5 h-2.5 rounded-full bg-slate-700" /></div>
                  <span className="text-[10px] 2xl:text-xs text-emerald-400 font-medium ml-2">Factu.me AI</span>
                </div>
                <div className="p-5 2xl:p-7 space-y-4 font-mono text-xs 2xl:text-sm">
                  {/* Voice Waveform */}
                  <div className="bg-slate-800/60 rounded-2xl px-4 py-3 border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Mic className="w-3 h-3 text-emerald-400" /></div>
                      <span className="text-[10px] text-emerald-400 font-semibold">Écoute…</span>
                    </div>
                    <VoiceWaveform />
                  </div>
                  {/* Transcription */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 bg-white/[0.05] rounded-lg flex items-center justify-center flex-shrink-0"><Mic className="w-3.5 h-3.5 text-slate-400" /></div>
                    <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2.5 text-slate-300 max-w-[90%] border border-white/[0.04]">
                      &quot;Facture pour Dupont, 5 jours de dev à 600€ HT, TVA 20%, ajoute 2 jours conseil à 400€&quot;
                    </div>
                  </div>
                  {/* Résultat IA */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-amber-400" /></div>
                    <div className="space-y-2 max-w-[90%]">
                      <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2 text-amber-400 border border-white/[0.04] flex items-center gap-2">
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-amber-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                        Analyse en cours...
                      </div>
                      <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-3 text-slate-300 space-y-1.5 border border-white/[0.04]">
                        {['Client : Dupont Consulting SAS', 'Développement — 5j x 600€', 'Conseil — 2j x 400€', 'TVA 20% appliquée'].map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-400"><Check className="w-3 h-3 text-emerald-500" /><span className="text-[11px] 2xl:text-xs">{t}</span></div>
                        ))}
                        <div className="flex items-center gap-1.5 text-white font-semibold pt-1 border-t border-white/[0.06]">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] 2xl:text-xs">FACT-2026-0042 — Conforme Factur-X / EN 16931</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </R>
            <div className="space-y-6">
              <R x={30} y={0}>
                <ul className="space-y-5">
                  {[
                    { icon: Mic, text: 'Dictez en français naturel — l\'IA comprend et remplit tous les champs automatiquement' },
                    { icon: ShieldCheck, text: 'Conforme Factur-X / EN 16931 — prêt pour la facturation électronique obligatoire' },
                    { icon: Zap, text: 'PDF professionnel généré en 3 secondes, avec toutes les mentions légales incluses' },
                    { icon: CreditCard, text: 'Envoyez et encaissez directement via Stripe ou Sumup, sans quitter l\'app' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0"><item.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-emerald-400" /></div>
                      <span className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-300 pt-2">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </R>
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#020617" toColor="#ffffff" variant={2} />

      {/* ════════════ SECONDARY FEATURES — 6 cartes ════════════ */}
      <section data-nav-theme="light" className="relative py-24 md:py-32 2xl:py-40 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <R delay={0.1}><p className="text-[11px] 2xl:text-xs text-gray-400 uppercase tracking-[0.2em] font-medium mb-4">Et aussi</p></R>
          <R delay={0.15}><p className="text-base 2xl:text-lg text-gray-500 max-w-xl mb-12 2xl:mb-16">Tout ce dont vous avez besoin pour gérer votre entreprise, au-delà de la facturation.</p></R>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 2xl:gap-6">
            {secondaryFeatures.map((f, i) => (
              <R key={i} delay={i * 0.04}>
                <div className="group bg-gray-50 border border-gray-200 rounded-2xl p-6 2xl:p-8 transition-all duration-300 hover:border-emerald-200 h-full">
                  <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4"><f.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-gray-400 group-hover:text-emerald-500 transition-colors duration-300" /></div>
                  <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-xs 2xl:text-sm 2xl:leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              </R>
            ))}
          </div>
          {/* Intégrations */}
          <R delay={0.3}>
            <div className="mt-12 2xl:mt-16 text-center">
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] font-medium mb-4">S'intègre avec vos outils</p>
              <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
                {integrations.map((int, i) => (
                  <span key={i} className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl">{int.name}</span>
                ))}
              </div>
            </div>
          </R>
        </div>
      </section>

      <Wave fromColor="#ffffff" toColor="#020617" variant={3} />

      {/* ════════════ CONTRATS — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC} relative z-[2]`}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <div className="space-y-8">
              <R x={-30} y={0}>
                <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-3">Contrats de travail</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                  Même vos contrats, dictés et signés en <span className="text-emerald-400">5 minutes</span>
                </h2>
                <ul className="space-y-4">
                  {[
                    { icon: FileText, text: 'CDI, CDD, freelance — clauses légales pré-remplies par l\'IA' },
                    { icon: Shield, text: 'Signature eIDAS Avancé incluse — valeur légale garantie' },
                    { icon: Lock, text: 'Suivi des salariés, avenants et renouvellements centralisés' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-emerald-400" /></div>
                      <span className="text-sm text-slate-300 pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </R>
            </div>
            <R x={30} y={0}>
              <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrat de travail</div>
                    <div className="text-sm font-bold text-white">CDI — Développeur Full Stack</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" />Conforme</div>
                </div>
                <div className="space-y-3 mb-4">
                  {[['Type de contrat', 'CDI'], ['Salaire brut', '3 500€/mois'], ['Convention collective', 'SYNTEC'], ['Période d\'essai', '4 mois'], ['Lieu de travail', 'Paris + Télétravail']].map(([label, value], i) => (
                    <div key={i} className="flex justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold text-white">{value}</span></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/[0.05] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-white/[0.08]"><Eye className="w-4 h-4 text-slate-400" />Aperçu</div>
                  <div className="flex-1 bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"><Share2 className="w-4 h-4" />Faire signer</div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Shield className="w-3.5 h-3.5 text-emerald-500" />Signature eIDAS Avancé gratuite</div>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      <Wave fromColor="#020617" toColor="#ffffff" variant={0} />

      {/* ════════════ ENCAISSEMENT — BLANC ════════════ */}
      <section data-nav-theme="light" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
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
                {/* Stripe & SumUp logos — badges visuels avec couleurs de marque */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#635BFF]/[0.06] rounded-xl p-3 border border-[#635BFF]/10 flex items-center justify-center gap-2">
                    <svg viewBox="0 0 60 25" className="h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.3 10.3 0 0 1-4.56 1.02c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.2 0 .61-.04 1.18-.06 1.86zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.8-1.07-2.58-2.08-2.58zM43.94 20.22c-2.14 0-3.48-.98-4.4-1.7l-.08 1.48H35.7V.98l4.14-.87v5.38c.88-.56 2.15-1.24 3.88-1.24 3.88 0 6.07 3.5 6.07 7.3 0 4.38-2.63 7.67-5.85 7.67zm-.82-12.1c-1.07 0-1.94.38-2.52.95v5.54c.56.55 1.33.96 2.52.96 1.97 0 3.15-2.07 3.15-3.83 0-1.84-1.12-3.62-3.15-3.62zM27.36 5.23c-1.73 0-3.34.57-4.42 1.2V.98L19.18.1v19.22h3.72l.12-1.15c.97.87 2.4 1.47 4.1 1.47 3.87 0 6.14-3.5 6.14-7.3 0-4.08-2.28-7.11-5.9-7.11zm-.92 11.84c-1.3 0-2.22-.48-2.86-1.15V9.44c.68-.73 1.6-1.2 2.86-1.2 2.04 0 3.32 1.82 3.32 3.93 0 2.15-1.24 3.9-3.32 3.9zM13.9 5.7c-1.4 0-2.38.7-2.97 1.32l-.2-1.1H7.64v13.4h4.14v-8.7c.58-.78 1.62-1.28 2.78-1.06V5.86a3.32 3.32 0 0 0-.66-.16zM4.18 7.93c0-.67.55-1.05 1.5-1.05 1.2 0 2.5.46 3.42.95V4.78c-.94-.5-2.24-.8-3.72-.8C2.5 3.98.26 5.88.26 8.2c0 3.55 4.84 3.08 4.84 4.56 0 .78-.7 1.1-1.7 1.1-1.36 0-2.82-.62-3.9-1.28v3.2c1.2.58 2.56.88 3.9.88 3.16 0 5.1-1.72 5.1-4.18-.02-3.84-4.32-3.24-4.32-4.55z" fill="#635BFF"/>
                    </svg>
                    <span className="text-[10px] font-semibold text-[#635BFF]/70">Connecté</span>
                  </div>
                  <div className="flex-1 bg-[#F47B20]/[0.06] rounded-xl p-3 border border-[#F47B20]/10 flex items-center justify-center gap-2">
                    <svg viewBox="0 0 60 25" className="h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.85 0A5.85 5.85 0 0 0 0 5.85v13.3A5.85 5.85 0 0 0 5.85 25h13.3A5.85 5.85 0 0 0 25 19.15V5.85A5.85 5.85 0 0 0 19.15 0H5.85zm2.5 5.5h5.8c2.9 0 4.8 1.55 4.8 4 0 2.2-1.5 3.5-3.5 3.95l4 5.55h-3.4l-3.6-5.2H10.8v5.2H8.35V5.5zm2.45 2.1v3.9h3c1.55 0 2.6-.7 2.6-2s-.95-1.9-2.5-1.9h-3.1z" fill="#F47B20"/>
                      <text x="28" y="16" fontSize="11" fontWeight="700" fill="#F47B20" fontFamily="sans-serif">SumUp</text>
                    </svg>
                    <span className="text-[10px] font-semibold text-[#F47B20]/70">Connecté</span>
                  </div>
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
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-4">
                  De la facture à votre compte bancaire en <span className="text-emerald-500">1 lien</span>
                </h2>
                <p className="text-sm 2xl:text-base text-gray-500 mb-8 max-w-md">
                  Connectez votre compte <span className="font-semibold text-[#635BFF]">Stripe</span> ou <span className="font-semibold text-[#F47B20]">SumUp</span> en 2 clics. Envoyez un lien de paiement directement avec votre facture — votre client paie par carte, vous recevez l'argent.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: CreditCard, text: 'Encaissez par carte bancaire, sans attendre un virement' },
                    { icon: ShieldCheck, text: 'Transactions sécurisées conformes aux normes européennes' },
                    { icon: Zap, text: 'Statut de paiement mis à jour en temps réel, sans action de votre part' },
                    { icon: LinkIcon, text: '1 clic pour créer et envoyer un lien de paiement avec votre facture' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-emerald-600" /></div>
                      <span className="text-sm 2xl:text-base text-gray-700">{item.text}</span>
                    </li>
                  ))}
                </ul>
                {/* CTA connexion */}
                <div className="flex items-center gap-3 mt-8">
                  <div className="inline-flex items-center gap-2 bg-[#635BFF]/[0.06] border border-[#635BFF]/15 rounded-full px-4 py-2">
                    <svg viewBox="0 0 60 25" className="h-3.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.3 10.3 0 0 1-4.56 1.02c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.2 0 .61-.04 1.18-.06 1.86zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.8-1.07-2.58-2.08-2.58z" fill="#635BFF"/>
                    </svg>
                    <span className="text-xs font-semibold text-[#635BFF]">Stripe</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-[#F47B20]/[0.06] border border-[#F47B20]/15 rounded-full px-4 py-2">
                    <svg viewBox="0 0 25 25" className="h-3.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.85 0A5.85 5.85 0 0 0 0 5.85v13.3A5.85 5.85 0 0 0 5.85 25h13.3A5.85 5.85 0 0 0 25 19.15V5.85A5.85 5.85 0 0 0 19.15 0H5.85zm2.5 5.5h5.8c2.9 0 4.8 1.55 4.8 4 0 2.2-1.5 3.5-3.5 3.95l4 5.55h-3.4l-3.6-5.2H10.8v5.2H8.35V5.5zm2.45 2.1v3.9h3c1.55 0 2.6-.7 2.6-2s-.95-1.9-2.5-1.9h-3.1z" fill="#F47B20"/>
                    </svg>
                    <span className="text-xs font-semibold text-[#F47B20]">SumUp</span>
                  </div>
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#ffffff" toColor="#020617" variant={1} />

      {/* ════════════ TIMELINE — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC} relative z-[2]`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Comment ça marche</p></R>
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">3 étapes. <span className="text-emerald-400">C'est tout.</span></h2></R>
          </div>
          <div className="relative max-w-4xl 2xl:max-w-5xl mx-auto">
            <div className="absolute left-[23px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/60 via-amber-500/30 to-emerald-500/60" />
            <div className="space-y-12 md:space-y-16 2xl:space-y-20">
              {steps.map((step, i) => (
                <div key={i} className={cn('relative flex items-start gap-8', i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse')}>
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-950 z-10 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
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

      <Wave fromColor="#020617" toColor="#ffffff" variant={2} />

      {/* ════════════ TESTIMONIALS — BLANC ════════════ */}
      <section data-nav-theme="light" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-600 uppercase tracking-[0.2em] font-medium mb-4">Témoignages</p></R>
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">Ce qu'ils en disent</h2></R>
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

      
      <Wave fromColor="#ffffff" toColor="#020617" variant={0} />

      {/* ════════════ CONFORMITÉ & ÉCOSYSTÈME — Loi 4 + 9 ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={LC}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <div className="space-y-8">
              <R>
                <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-3">Conformité 2026</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                  La facturation électronique <span className="text-emerald-400">sans prise de tête.</span>
                </h2>
                <p className="text-sm 2xl:text-base text-slate-400 leading-relaxed mb-6">
                  Dès septembre 2026, toutes les entreprises françaises devront émettre et recevoir des factures électroniques. Avec Factu.me, vous êtes <span className="text-white font-semibold">déjà prêt</span>.
                </p>
              </R>
              <R delay={0.1}>
                <ul className="space-y-4">
                  {[
                    { icon: ShieldCheck, text: 'Conforme Factur-X / EN 16931 — le standard européen officiel' },
                    { icon: Plug, text: 'Connexion à superpdp.tech, Plateforme de Dématérialisation Partenaire agréée' },
                    { icon: Lock, text: 'Chiffrement de bout en bout — vos données restent en France' },
                    { icon: Zap, text: 'Compatible Chorus Pro — vos factures passent partout' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-emerald-400" /></div>
                      <span className="text-sm text-slate-300 pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </R>
            </div>
            <R delay={0.15}>
              <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                </div>
                <h3 className="text-center text-lg font-bold text-white mb-2">Votre écosystème, connecté</h3>
                <p className="text-center text-xs text-slate-400 mb-6">Factu.me se connecte aux outils que vous utilisez déjà</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Stripe', color: '#635BFF' },
                    { name: 'SumUp', color: '#F47B20' },
                    { name: 'Google', color: '#4285F4' },
                    { name: 'CSV', color: '#10b981' },
                    { name: 'PDF', color: '#8b5cf6' },
                    { name: 'CPro', color: '#ef4444' },
                  ].map((int, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center hover:border-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: int.color + '15' }}>
                        <span className="text-[10px] font-bold" style={{ color: int.color }}>{int.name.slice(0, 2)}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300">{int.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-300 font-medium">Vous êtes déjà prêt pour 2026</span>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      <Wave fromColor="#020617" toColor="#ffffff" variant={1} />

      <Wave fromColor="#ffffff" toColor="#020617" variant={3} />

      {/* ════════════ PRICING — DARK ════════════ */}
      <section data-nav-theme="dark" id="pricing" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className={`${LC} relative z-[2]`}>
          <div className="text-center mb-14 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Tarifs transparents</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white mb-4">Choisissez votre plan</h2>
              <p className="text-base 2xl:text-lg text-slate-400">Sans engagement. Évoluez quand vous voulez.</p>
            </R>
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setBilling('monthly')} className={cn('px-4 py-2 rounded-xl text-sm 2xl:text-base font-semibold transition-colors duration-200', billing === 'monthly' ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white')}>Mensuel</button>
              <button onClick={() => setBilling('yearly')} className={cn('px-4 py-2 rounded-xl text-sm 2xl:text-base font-semibold transition-colors duration-200', billing === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white')}>
                Annuel <span className="text-xs opacity-70">(-20%)</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7 max-w-5xl 2xl:max-w-6xl mx-auto items-start">
            {plans.map((plan, i) => (
              <R key={i} delay={i * 0.06}>
                <div className={cn(
                  'relative rounded-2xl p-7 2xl:p-9 flex flex-col h-full transition-all duration-300',
                  plan.popular
                    ? 'border-2 border-emerald-500/70 scale-100 md:scale-105 z-10 bg-slate-900/60 shadow-[0_0_50px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-900/40 border border-white/[0.06] hover:border-white/10'
                )}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] 2xl:text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                        <Crown className="w-3 h-3" />Recommandé
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl 2xl:text-2xl font-bold text-white">{plan.name}</h3>
                      {plan.popular && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">TOP</span>}
                    </div>
                    <p className="text-xs 2xl:text-sm text-slate-400 mt-1 mb-4">{plan.tag}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl 2xl:text-5xl font-extrabold text-white tracking-tight">{billing === 'monthly' ? plan.price : plan.yearly}</span>
                      <span className="text-sm 2xl:text-base text-slate-400">/mois</span>
                    </div>
                    {billing === 'yearly' && <p className="text-xs 2xl:text-sm text-emerald-400 font-medium mt-1">Économisez sur l'annuel</p>}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm 2xl:text-base">
                        <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-500 flex-shrink-0" />
                        <span className={cn('text-slate-300', j === 0 && 'text-emerald-300 font-medium')}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.name.toLowerCase()}&billing=${billing}`} className={cn(
                    'block text-center font-semibold py-3.5 2xl:py-4 rounded-xl text-sm 2xl:text-base transition-all duration-200 active:scale-[0.97]',
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]'
                  )}>
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

      <Wave fromColor="#020617" toColor="#ffffff" variant={0} />

      {/* ════════════ FAQ — BLANC ════════════ */}
      <section data-nav-theme="light" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32">
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

      <Wave fromColor="#ffffff" toColor="#020617" variant={1} />

      {/* ════════════ CTA FINAL — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] lg:w-[1000px] h-[600px] sm:h-[800px] lg:h-[1000px] bg-emerald-500/8 rounded-full blur-[180px] lg:blur-[250px]" />
        </div>
        <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32 text-center relative z-10">
          <R y={0}>
            <div className="max-w-xs mx-auto mb-8"><VoiceWaveform /></div>
            <h2 className="text-4xl md:text-6xl 2xl:text-8xl font-bold tracking-tight text-white leading-[1.1] mb-10 2xl:mb-12">
              Votre facture électronique<br />est à <span className="text-emerald-400">un mot.</span>
            </h2>
            <Link href="/register" className="group inline-flex items-center justify-center gap-3 font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-full px-10 py-5 2xl:px-12 2xl:py-6 text-base 2xl:text-lg transition-all duration-300 active:scale-[0.97] shadow-[0_0_50px_rgba(16,185,129,0.35)] hover:shadow-[0_0_70px_rgba(16,185,129,0.45)]">
              <Mic className="w-5 h-5 2xl:w-6 2xl:h-6" />
              Commencer gratuitement
              <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-xs 2xl:text-sm text-slate-500 mt-8">Sans engagement · Annulation en un clic</p>
          </R>
        </div>
      </section>

      {/* ════════════ FOOTER — DARK ════════════ */}
      <footer data-nav-theme="dark" className="relative py-14 md:py-20 2xl:py-24 overflow-hidden bg-slate-950 border-t border-white/[0.04]">
        <div className={`${LC} relative z-[2]`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 2xl:gap-12 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" />
                <span className="text-lg 2xl:text-xl font-bold text-white">Factu<span className="text-emerald-400">.me</span></span>
              </Link>
              <p className="text-xs 2xl:text-sm text-slate-400 max-w-xs leading-relaxed mb-4">L'assistant IA vocal pour votre facturation électronique. 100% français.</p>
              <div className="flex gap-2">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 2xl:w-9 2xl:h-9 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors duration-200"><Icon className="w-3.5 h-3.5 text-slate-400" /></a>
                ))}
              </div>
            </div>
            {[
              { title: 'Produit', links: [['Facturation', '#features'], ['IA Vocale', '#ai'], ['Tarifs', '#pricing']] },
              { title: 'Ressources', links: [['Démo', '/demo'], ['Facturation électronique 2026', '/facturation-electronique'], ['Modèles', '/modeles-facture'], ['Blog', '/blog']] },
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

/* ─── FAQ Item ─── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden transition-colors duration-300 hover:border-gray-300">
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
