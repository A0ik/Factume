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
            className="w-[3px] rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300"
            animate={{ height: [`${minH}px`, `${baseH}px`, `${minH + 8}px`, `${baseH * 0.7}px`, `${minH}px`] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

/* ─── Scroll Trail — ligne continue verticale qui se remplit au scroll ───
   Simple div-based: no SVG distortion, guaranteed continuous line.
   mix-blend-mode: screen → invisible on white, visible on dark.
   z-index [1] → behind ALL content.
*/
function ScrollTrail() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          setProgress(Math.min(window.scrollY / docHeight, 1));
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="fixed top-0 right-[5%] w-[3px] h-full pointer-events-none z-[1]"
      style={{ mixBlendMode: 'screen' }}
      aria-hidden="true"
    >
      {/* Background track */}
      <div className="absolute inset-0 rounded-full bg-emerald-500/[0.08]" />
      {/* Filled progress */}
      <div
        className="absolute top-0 left-0 right-0 rounded-full transition-[height] duration-100 ease-out"
        style={{
          height: `${progress * 100}%`,
          background: 'linear-gradient(to bottom, #10b981, #34d399, #10b981)',
          boxShadow: '0 0 8px rgba(16,185,129,0.4), 0 0 20px rgba(52,211,153,0.15)',
        }}
      />
      {/* Glow dot at the tip */}
      {progress > 0.02 && (
        <div
          className="absolute left-1/2 w-3 h-3 rounded-full"
          style={{
            top: `${progress * 100}%`,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, #34d399 0%, #10b981 60%, transparent 100%)',
            boxShadow: '0 0 12px rgba(52,211,153,0.6), 0 0 24px rgba(16,185,129,0.3)',
          }}
        />
      )}
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
  { name: 'Starter', price: 'Gratuit', yearly: 'Gratuit', tag: 'Pour démarrer et tester', features: ['E-facturation certifiée', '5 factures & devis/mois', '1 cabinet, 10 clients', '5 commandes vocales/mois', 'Support email'], popular: false },
  { name: 'Pro', price: '14,99€', yearly: '12,50€', tag: 'Indépendants & TPE', features: ['Factures & devis illimités', 'Contrats CDI/CDD', 'OCR reçus', 'Signature électronique', 'Voice Expense illimité', 'IK & notes de frais', 'URSSAF One-Click', 'Export FEC/CSV', 'Rapprochement bancaire', 'Sans watermark'], popular: true },
  { name: 'Business', price: '39,99€', yearly: '33,33€', tag: 'PME & Experts-comptables', features: ['E-facturation certifiée', 'Tout Pro inclus', '5 cabinets', 'Comptable Connect', 'Multi-utilisateur (5)', 'Copilot IA avancé', 'Support dédié'], popular: false },
];

const faqItems = [
  { q: 'Est-ce vraiment gratuit ?', a: 'Oui, le plan Starter est 100% gratuit (5 factures/mois). Pour tester les plans payants, profitez de 14 jours d\'essai gratuit, sans carte bancaire.' },
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
  { icon: Building2, title: 'Auto-entrepreneur', copy: 'Vos factures en 10 secondes, sans prise de tête.', color: 'from-emerald-500 to-emerald-400' },
  { icon: Hammer, title: 'Artisan', copy: "Entre deux chantiers, dictez et c'est envoyé.", color: 'from-neutral-600 to-neutral-400' },
  { icon: Store, title: 'TPE / PME', copy: 'Gérez votre équipe et vos factures au même endroit.', color: 'from-emerald-600 to-emerald-400' },
  { icon: Code2, title: 'Freelance', copy: 'Facturation, CRM et contrats — un seul outil.', color: 'from-neutral-500 to-emerald-500' },
  { icon: Briefcase, title: 'Consultant', copy: 'Devis signés et factures encaissées en 1 clic.', color: 'from-emerald-700 to-emerald-400' },
  { icon: Palette, title: 'Agence', copy: 'Workspaces séparés pour chaque client.', color: 'from-neutral-600 to-emerald-500' },
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
  const navText = navLight ? 'text-neutral-600' : 'text-neutral-400';
  const navLogo = navLight ? 'text-neutral-900' : 'text-white';
  const navBg = scrolled
    ? navLight
      ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200'
      : 'bg-black/90 backdrop-blur-xl border-b border-white/[0.06]'
    : 'bg-transparent';

  const navLinks = [
    { label: 'Facturation', href: '#features' },
    { label: 'IA Vocale', href: '#ai' },
    { label: 'Tarifs', href: '#pricing' },
  ];

  return (
    <div id="landing" className="bg-black text-white antialiased overflow-x-hidden">

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
            <button onClick={() => setMenuOpen(!menuOpen)} className={cn('md:hidden p-1 transition-colors duration-300', navLight ? 'text-neutral-700' : 'text-white')}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease }} className={cn('md:hidden backdrop-blur-xl overflow-hidden', navLight ? 'bg-white/95' : 'bg-black/95')}>
              <div className="px-6 py-4 space-y-1">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className={cn('block py-3 text-sm font-medium transition-colors', navLight ? 'text-neutral-700 hover:text-emerald-600' : 'text-neutral-300 hover:text-white')}>{l.label}</a>
                ))}
                <Link href="/login" className={cn('flex items-center gap-2 py-3 text-sm', navLight ? 'text-neutral-500' : 'text-neutral-400')}><LogIn className="w-4 h-4" />Se connecter</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ════════════ HERO — Pattern Stripe/Linear ════════════ */}
      <section data-nav-theme="dark" className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[200px] animate-[blob_15s_ease-in-out_infinite]" />
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
                      const colors = ['bg-emerald-500/30 text-emerald-300', 'bg-neutral-500/30 text-neutral-300', 'bg-emerald-600/30 text-emerald-300', 'bg-neutral-400/30 text-neutral-300'];
                      return <div key={i} className={'w-7 h-7 rounded-full border-2 border-black ' + colors[i] + ' font-bold text-[9px] flex items-center justify-center'}>{initial}</div>;
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />)}</div>
                    <span className="text-[10px] text-neutral-400">2 000+ entrepreneurs nous font confiance</span>
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

      <Wave fromColor="#000000" toColor="#ffffff" variant={1} />

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

      <Wave fromColor="#ffffff" toColor="#000000" variant={2} />

      {/* ════════════ CORE FEATURE — Facture électronique + IA ════════════ */}
      <section data-nav-theme="dark" id="features" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={`${LC} relative z-10`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Facturation électronique</p></R>
            <R delay={0.05}><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">Votre facture,<br /><span className="text-emerald-400">dictée et conforme</span></h2></R>
          </div>

          {/* Hero Feature — 2 colonnes */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center mb-20 2xl:mb-28">
            <R x={-30} y={0}>
              <div className="relative">
                <Image
                  src="/images/ipad-section.png"
                  alt="Factu.me sur iPad — Dictez votre facture"
                  width={2106}
                  height={1250}
                  quality={100}
                  className="w-full h-auto rounded-2xl"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
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
                      <span className="text-sm 2xl:text-base 2xl:leading-relaxed text-neutral-300 pt-2">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </R>
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={2} />

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

      <Wave fromColor="#ffffff" toColor="#000000" variant={3} />

      {/* ════════════ CONTRATS — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
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
                      <span className="text-sm text-neutral-300 pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </R>
            </div>
            <R x={30} y={0}>
              <div className="bg-neutral-900 border border-white/[0.06] rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contrat de travail</div>
                    <div className="text-sm font-bold text-white">CDI — Développeur Full Stack</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" />Conforme</div>
                </div>
                <div className="space-y-3 mb-4">
                  {[['Type de contrat', 'CDI'], ['Salaire brut', '3 500€/mois'], ['Convention collective', 'SYNTEC'], ['Période d\'essai', '4 mois'], ['Lieu de travail', 'Paris + Télétravail']].map(([label, value], i) => (
                    <div key={i} className="flex justify-between text-sm"><span className="text-neutral-400">{label}</span><span className="font-semibold text-white">{value}</span></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/[0.05] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-white/[0.08]"><Eye className="w-4 h-4 text-neutral-400" />Aperçu</div>
                  <div className="flex-1 bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"><Share2 className="w-4 h-4" />Faire signer</div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs text-neutral-500"><Shield className="w-3.5 h-3.5 text-emerald-500" />Signature eIDAS Avancé gratuite</div>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={0} />

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
                {/* Stripe & SumUp logos */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#10b981]/[0.06] rounded-xl p-3 border border-[#10b981]/10 flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-5" fill="#10b981" xmlns="http://www.w3.org/2000/svg"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
                    <span className="text-[10px] font-semibold text-[#10b981]/70">Connecté</span>
                  </div>
                  <div className="flex-1 bg-[#34d399]/[0.06] rounded-xl p-3 border border-[#34d399]/10 flex items-center justify-center gap-2">
                    <Image src="/images/sumup-logo.png" alt="SumUp" width={20} height={20} className="h-5 w-auto" />
                    <span className="text-[10px] font-semibold text-[#34d399]/70">Connecté</span>
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
                  Connectez votre compte <span className="font-semibold text-emerald-600">Stripe</span> ou <span className="font-semibold text-emerald-600">SumUp</span> en 2 clics. Envoyez un lien de paiement directement avec votre facture — votre client paie par carte, vous recevez l'argent.
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
                  <div className="inline-flex items-center gap-2 bg-[#10b981]/[0.06] border border-[#10b981]/15 rounded-full px-4 py-2">
                    <svg viewBox="0 0 24 24" className="h-4" fill="#10b981" xmlns="http://www.w3.org/2000/svg"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
                    <span className="text-xs font-semibold text-[#10b981]">Stripe</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-[#34d399]/[0.06] border border-[#34d399]/15 rounded-full px-4 py-2">
                    <Image src="/images/sumup-logo.png" alt="SumUp" width={16} height={16} className="h-4 w-auto" />
                    <span className="text-xs font-semibold text-[#34d399]">SumUp</span>
                  </div>
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#ffffff" toColor="#000000" variant={1} />

      {/* ════════════ TIMELINE — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={`${LC} relative z-[2]`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Comment ça marche</p></R>
            <R><h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">3 étapes. <span className="text-emerald-400">C'est tout.</span></h2></R>
          </div>
          <div className="relative max-w-4xl 2xl:max-w-5xl mx-auto">
            <div className="absolute left-[23px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/60 via-emerald-500/30 to-emerald-500/60" />
            <div className="space-y-12 md:space-y-16 2xl:space-y-20">
              {steps.map((step, i) => (
                <div key={i} className={cn('relative flex items-start gap-8', i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse')}>
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-black z-10 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                  <R delay={i * 0.1} x={i % 2 === 0 ? -30 : 30} y={0} className={cn('ml-12 md:ml-0 md:w-[calc(50%-2rem)]', i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left')}>
                    <span className="text-emerald-400 font-mono text-xs 2xl:text-sm font-bold">{step.num}</span>
                    <h3 className="text-lg 2xl:text-xl font-semibold text-white mt-1 mb-2">{step.title}</h3>
                    <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-neutral-400">{step.desc}</p>
                  </R>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={2} />

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
                  <div className="flex gap-0.5 mb-4">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-emerald-400 fill-emerald-400" />)}</div>
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

      
      <Wave fromColor="#ffffff" toColor="#000000" variant={0} />

      {/* ════════════ CONFORMITÉ & ÉCOSYSTÈME — Loi 4 + 9 ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={LC}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <div className="space-y-8">
              <R>
                <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-3">Conformité 2026</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                  La facturation électronique <span className="text-emerald-400">sans prise de tête.</span>
                </h2>
                <p className="text-sm 2xl:text-base text-neutral-400 leading-relaxed mb-6">
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
                      <span className="text-sm text-neutral-300 pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </R>
            </div>
            <R delay={0.15}>
              <div className="bg-neutral-900 border border-white/[0.06] rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                </div>
                <h3 className="text-center text-lg font-bold text-white mb-2">Votre écosystème, connecté</h3>
                <p className="text-center text-xs text-neutral-400 mb-6">Factu.me se connecte aux outils que vous utilisez déjà</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      name: 'Stripe',
                      color: '#10b981',
                      svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#10b981"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>,
                    },
                    {
                      name: 'SumUp',
                      color: '#34d399',
                      svg: <Image src="/images/sumup-logo.png" alt="SumUp" width={20} height={20} className="w-5 h-5" />,
                    },
                    {
                      name: 'Google',
                      color: '#6ee7b7',
                      svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#6ee7b7"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>,
                    },
                    {
                      name: 'CSV',
                      color: '#10b981',
                      svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
                    },
                    {
                      name: 'PDF',
                      color: '#059669',
                      svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v2h6"/></svg>,
                    },
                    {
                      name: 'CPro',
                      color: '#047857',
                      svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
                    },
                  ].map((int, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center hover:border-white/10 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: int.color + '15' }}>
                        {int.svg}
                      </div>
                      <span className="text-[10px] font-semibold text-neutral-300">{int.name}</span>
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

      <Wave fromColor="#000000" toColor="#ffffff" variant={1} />

      <Wave fromColor="#ffffff" toColor="#000000" variant={3} />

      {/* ════════════ PRICING — DARK ════════════ */}
      <section data-nav-theme="dark" id="pricing" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={`${LC} relative z-[2]`}>
          <div className="text-center mb-14 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Tarifs transparents</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white mb-4">Choisissez votre plan</h2>
              <p className="text-base 2xl:text-lg text-neutral-400">Sans engagement. Évoluez quand vous voulez.</p>
            </R>
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setBilling('monthly')} className={cn('px-4 py-2 rounded-xl text-sm 2xl:text-base font-semibold transition-colors duration-200', billing === 'monthly' ? 'bg-white text-neutral-950' : 'bg-neutral-900 text-neutral-400 hover:text-white')}>Mensuel</button>
              <button onClick={() => setBilling('yearly')} className={cn('px-4 py-2 rounded-xl text-sm 2xl:text-base font-semibold transition-colors duration-200', billing === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white')}>
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
                    ? 'border-2 border-emerald-500/70 scale-100 md:scale-105 z-10 bg-neutral-900/60 shadow-[0_0_50px_rgba(16,185,129,0.15)]'
                    : 'bg-neutral-900/40 border border-white/[0.06] hover:border-white/10'
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
                    <p className="text-xs 2xl:text-sm text-neutral-400 mt-1 mb-4">{plan.tag}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl 2xl:text-5xl font-extrabold text-white tracking-tight">{billing === 'monthly' ? plan.price : plan.yearly}</span>
                      <span className="text-sm 2xl:text-base text-neutral-400">/mois</span>
                    </div>
                    {billing === 'yearly' && plan.price !== 'Gratuit' && <p className="text-xs 2xl:text-sm text-emerald-400 font-medium mt-1">Économisez sur l'annuel</p>}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm 2xl:text-base">
                        <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-500 flex-shrink-0" />
                        <span className={cn('text-neutral-300', j === 0 && 'text-emerald-300 font-medium')}>{f}</span>
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
            <p className="text-center text-xs 2xl:text-sm text-neutral-400 mt-8 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />Données en France · SSL · RGPD · Annulation en un clic
            </p>
          </R>
        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={0} />

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

      <Wave fromColor="#ffffff" toColor="#000000" variant={1} />

      {/* ════════════ CTA FINAL — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
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
            <p className="text-xs 2xl:text-sm text-neutral-500 mt-8">Sans engagement · Annulation en un clic</p>
          </R>
        </div>
      </section>

      {/* ════════════ FOOTER — DARK ════════════ */}
      <footer data-nav-theme="dark" className="relative py-14 md:py-20 2xl:py-24 overflow-hidden bg-black border-t border-white/[0.04]">
        <div className={`${LC} relative z-[2]`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 2xl:gap-12 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" />
                <span className="text-lg 2xl:text-xl font-bold text-white">Factu<span className="text-emerald-400">.me</span></span>
              </Link>
              <p className="text-xs 2xl:text-sm text-neutral-400 max-w-xs leading-relaxed mb-4">L'assistant IA vocal pour votre facturation électronique. 100% français.</p>
              <div className="flex gap-2">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 2xl:w-9 2xl:h-9 bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors duration-200"><Icon className="w-3.5 h-3.5 text-neutral-400" /></a>
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
                <h4 className="font-semibold text-xs 2xl:text-sm text-neutral-300 mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('#') ? (
                        <a href={href} onClick={(e) => scrollTo(e, href)} className="text-xs 2xl:text-sm text-neutral-400 hover:text-white transition-colors duration-200">{label}</a>
                      ) : (
                        <Link href={href} className="text-xs 2xl:text-sm text-neutral-400 hover:text-white transition-colors duration-200">{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs 2xl:text-sm text-neutral-500">2026 Factu.me. Fait en France.</p>
            <div className="flex items-center gap-1.5 text-[11px] 2xl:text-xs text-neutral-500"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Opérationnel</div>
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
