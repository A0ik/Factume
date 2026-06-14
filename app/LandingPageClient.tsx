'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Menu, X, Zap, Play, Sparkles, FileText,
  Check, CreditCard, Link as LinkIcon, Star,
  Building2, Code2, Store, Briefcase, Palette,
  ChevronDown, LogIn, Shield, Eye, Share2,
  Twitter, Linkedin, Github, Brain, Mic,
  ShieldCheck, Lock, CheckCircle, Calculator, FileClock,
  LayoutGrid, Crown, Hammer,
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
   BRAND LOGOS — official SVG marks, real brand colors
   ═══════════════════════════════════════════════════════════ */
function LogoStripe({ className }: { className?: string }) {
  // Official Stripe "S" mark (simpleicons path), real Stripe indigo #635BFF.
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Stripe">
      <path fill="#635BFF" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
    </svg>
  );
}

function LogoGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Google">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function LogoChorus({ className }: { className?: string }) {
  // Chorus Pro (DGFIP) — French public invoicing platform. Tricolor badge + wordmark.
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-flex flex-col w-[1.4em] rounded-[3px] overflow-hidden ring-1 ring-black/10">
        <span className="h-[0.4em] bg-[#0055A4]" />
        <span className="h-[0.4em] bg-white" />
        <span className="h-[0.4em] bg-[#EF4135]" />
      </span>
      <span className="leading-none">
        <span className="block font-bold tracking-tight text-neutral-800">Chorus Pro</span>
        <span className="block text-[0.6em] font-medium tracking-wide text-neutral-400">DGFIP</span>
      </span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFETTI — brand-colored burst on annual pricing toggle
   ═══════════════════════════════════════════════════════════ */
const CONFETTI_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#ffffff', '#fbbf24'];
type ConfettiPiece = { id: string; cx: number; cy: number; cr: number; color: string; size: number; delay: number; round: boolean; drift: number };

function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (fire === 0) return;
    const burst: ConfettiPiece[] = Array.from({ length: 96 }).map((_, i) => ({
      id: `${fire}-${i}`,
      cx: (Math.random() - 0.5) * 680,
      cy: 140 + Math.random() * 420,
      cr: (Math.random() - 0.5) * 1200,
      drift: (Math.random() - 0.5) * 120,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 9,
      delay: Math.random() * 0.14,
      round: Math.random() > 0.45,
    }));
    setPieces(burst);
    const t = setTimeout(() => setPieces([]), 2100);
    return () => clearTimeout(t);
  }, [fire]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 overflow-visible z-30 flex justify-center" aria-hidden="true">
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
            animate={{ opacity: [1, 1, 0], x: p.cx + p.drift, y: p.cy, rotate: p.cr, scale: 0.7 }}
            transition={{ duration: 1.7, delay: p.delay, ease: [0.2, 0.6, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: '8%',
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.color,
              borderRadius: p.round ? '9999px' : '2px',
              boxShadow: `0 0 8px ${p.color}55`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED PRICE — fluid counter on billing switch
   ═══════════════════════════════════════════════════════════ */
function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(target);
  const valRef = useRef(target);
  /* Keep ref synced to the last rendered value so a re-target always animates from “now”. */
  useEffect(() => { valRef.current = val; });
  useEffect(() => {
    const from = valRef.current;
    if (Math.abs(from - target) < 0.005) { setVal(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function AnimatedPrice({ value }: { value: number }) {
  const v = useCountUp(value);
  if (value === 0) return <span>Gratuit</span>;
  return <span>{v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-emerald-500">€</span></span>;
}

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const steps = [
  { num: '01', eyebrow: 'Parlez, c\'est dicté', title: 'Dictez votre facture', desc: 'Dites simplement « Facture pour Dupont, 5 jours de développement à 600 € par jour ». L\'IA vocale comprend le français naturel, retrouve les clients via leur SIRET et remplit chaque champ à votre place — lignes, TVA, mentions légales, coordonnées. Aucun formulaire, aucune friction.', meta: '≈ 10 secondes' },
  { num: '02', eyebrow: 'Relisez en un éclair', title: 'Vérifiez et envoyez', desc: 'Votre facture s\'affiche, propre et conforme. Ajoutez un lien de paiement Stripe ou SumUp en un geste, puis envoyez par e-mail directement depuis l\'appli. Votre client reçoit un PDF professionnel et un bouton « Payer » prêt à cliquer.', meta: 'Conforme Factur-X' },
  { num: '03', eyebrow: 'L\'argent arrive', title: 'Encaissez instantanément', desc: 'Votre client paie par carte bancaire. Vous voyez le statut passer à « Payé » en temps réel, sans relance, sans attente de virement. L\'encaissement est rapproché automatiquement de votre comptabilité.', meta: 'Sous 24-48 h' },
];

const testimonials = [
  { name: 'Sarah Mendes', role: 'Développeuse freelance', img: '/images/testimonials/sarah.jpg', text: 'Je passais 2 h par mois sur mes factures. Depuis Factu.me, je dicte en 10 secondes et c\'est envoyé. Un gain de temps énorme — et mes clients me règlent enfin par carte.' },
  { name: 'Thomas Lefèvre', role: 'Auto-entrepreneur · Transport', img: '/images/testimonials/thomas.jpg', text: 'Le scan de reçus est bluffant. Je photographie mes tickets essence et c\'est directement catégorisé. Mon comptable est impressionné, et moi je suis serein.' },
  { name: 'Claire Dubois', role: 'Directrice · Agence digitale', img: '/images/testimonials/claire.jpg', text: 'On était 4 dans l\'agence, chacun avait son outil. Aujourd\'hui on est tous sur Factu.me avec des espaces séparés par client. Tout est centralisé, tout est conforme.' },
];

const plans = [
  { name: 'Starter', monthly: 0, yearly: 0, tag: 'Pour démarrer et tester', features: ['E-facturation certifiée', '3 factures & devis/mois', '1 cabinet, 10 clients', 'Dictée vocale IA activée', 'Support email'], popular: false },
  { name: 'Pro', monthly: 14.99, yearly: 12.50, tag: 'Indépendants & TPE', features: ['Factures & devis illimités', 'Contrats CDI/CDD', 'OCR reçus', 'Signature électronique', 'Voice Expense illimité', 'IK & notes de frais', 'URSSAF One-Click', 'Export FEC/CSV', 'Rapprochement bancaire', 'Sans watermark'], popular: true },
  { name: 'Business', monthly: 39.99, yearly: 33.33, tag: 'PME & Experts-comptables', features: ['E-facturation certifiée', 'Tout Pro inclus', '5 cabinets', 'Comptable Connect', 'Multi-utilisateur (5)', 'Copilot IA avancé', 'Support dédié'], popular: false },
];

const faqItems = [
  { q: 'Est-ce vraiment gratuit ?', a: 'Oui, le plan Starter est 100% gratuit (3 factures/mois avec dictée vocale IA). Pour tester les plans payants, profitez de 14 jours d\'essai gratuit, sans carte bancaire.' },
  { q: 'Mes données sont-elles en sécurité ?', a: 'Absolument. Vos données sont chiffrées, hébergées en France, et chaque utilisateur ne peut accéder qu\'à ses propres données.' },
  { q: 'L\'IA comprend-elle vraiment ce que je dis ?', a: 'Oui, l\'IA comprend parfaitement le français naturel. Dites "5 jours de dev à 600€" et elle crée la facture complète. Vous n\'avez qu\'à vérifier et envoyer.' },
  { q: 'Est-ce conforme pour les impôts français ?', a: 'Oui, les mentions légales sont ajoutées automatiquement. Vos factures électroniques sont conformes et prêtes pour l\'obligation 2026. L\'export officiel pour les impôts est disponible sur tous les plans.' },
  { q: 'Puis-je récupérer mes données si je veux quitter ?', a: 'Oui, conformément au RGPD vous pouvez télécharger l\'intégralité de vos données ou demander la suppression totale de votre compte.' },
];



/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LandingPageClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [confettiFire, setConfettiFire] = useState(0);
  const [navLight, setNavLight] = useState(false);

  /* Switch billing plan — fires a confetti burst when the user picks annual */
  const switchBilling = useCallback((b: 'monthly' | 'yearly') => {
    setBilling(b);
    if (b === 'yearly') setConfettiFire((n) => n + 1);
  }, []);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 40);
      setShowSticky(window.scrollY > 600);
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
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
            <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 px-4 sm:px-5 py-2.5 rounded-full transition-colors duration-200 active:scale-[0.97] whitespace-nowrap min-h-[44px]">
              <span className="hidden sm:inline">Commencer gratuitement</span><span className="sm:hidden">Commencer</span><ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu" className={cn('md:hidden -mr-1 flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors duration-300', navLight ? 'text-neutral-700 hover:bg-black/5' : 'text-white hover:bg-white/10')}>
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

        <div className={`relative z-10 ${LC} py-16 sm:py-16 sm:py-24 md:py-32 2xl:py-40 w-full`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 2xl:gap-20 items-center">
            <div className="lg:col-span-7 space-y-8 2xl:space-y-10">
              {/* H1 — UN headline, RIEN d'autre au-dessus */}
              <R delay={0.08}>
                <h1 className="text-[clamp(2rem,8vw,3rem)] md:text-7xl 2xl:text-[6.5rem] font-bold tracking-tight text-white leading-[1.05]">
                  Dictez votre facture<br />par IA.{' '}
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

              {/* Confiance immédiate — signaux réels & vérifiables (Loi 5) */}
              <R delay={0.3}>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs sm:text-sm text-neutral-400">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Conforme facturation électronique 2026</span>
                  <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-emerald-400" /> Données hébergées en France</span>
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Sans carte bancaire</span>
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

      {/* ════════════ UNE SOLUTION POUR TOUS — Bento asymétrique ════════════ */}
      <section data-nav-theme="light" className="relative py-16 sm:py-20 md:py-28 2xl:py-36 overflow-hidden bg-white">
        <div className={LC}>
          <div className="max-w-2xl mb-12 md:mb-16 2xl:mb-20">
            <R><p className="text-xs sm:text-sm text-emerald-600 uppercase tracking-[0.2em] font-semibold mb-4">Un outil, tous les métiers</p></R>
            <R delay={0.06}><h2 className="text-[clamp(1.9rem,6vw,2.5rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08]">Une solution pour <span className="text-emerald-500">tous</span></h2></R>
            <R delay={0.12}><p className="text-base sm:text-lg text-gray-500 mt-5 max-w-xl leading-relaxed">Quel que soit votre métier, Factu.me s'adapte à votre quotidien — et à votre façon de travailler.</p></R>
          </div>

          {/* Bento — 4 colonnes desktop, diagonale sombre (auto TL / agence BR) */}
          <div className="grid grid-cols-2 max-[374px]:grid-cols-1 lg:grid-cols-4 auto-rows-[minmax(170px,1fr)] lg:auto-rows-[minmax(210px,1fr)] gap-3 sm:gap-4 2xl:gap-5">

            {/* ── AUTO-ENTREPRENEUR — carte héro (2×2, sombre) ── */}
            <R delay={0.04} className="col-span-2 lg:row-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-7 sm:p-8 2xl:p-10 bg-gradient-to-br from-emerald-950 via-neutral-950 to-black border border-white/10">
                <div className="absolute -top-20 -right-16 w-72 h-72 bg-emerald-500/30 rounded-full blur-[90px] animate-[bentoGlow_9s_ease-in-out_infinite]" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 2xl:w-14 2xl:h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center"><Building2 className="w-6 h-6 2xl:w-7 2xl:h-7 text-emerald-400" /></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-3 py-1">Le + utilisé</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-white mt-6 2xl:mt-8">Auto-entrepreneur</h3>
                  <p className="text-base sm:text-lg text-neutral-300 mt-3 leading-relaxed max-w-sm">Vos factures en 10 secondes, sans logiciel compliqué. Dictées, conformes, encaissées.</p>

                  {/* mini facture mockup */}
                  <div className="mt-auto pt-8">
                    <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-mono text-emerald-400/80 tracking-wider">FACTURE-2026-042</div>
                        <div className="text-sm font-semibold text-white mt-0.5">Mission design · Mars</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-white">3 200 €</div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-0.5"><CheckCircle className="w-3 h-3" /> Payée</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </R>

            {/* ── ARTISAN (large, chaud) ── */}
            <R delay={0.1} className="col-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-stone-100 to-amber-50/70 border border-stone-200/80">
                <svg className="absolute right-3 top-3 w-40 h-40 text-amber-900/[0.05]" viewBox="0 0 100 100" fill="none"><path d="M10 80 L40 30 L60 50 L90 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" /><circle cx="10" cy="80" r="5" fill="currentColor" /><circle cx="90" cy="20" r="5" fill="currentColor" /></svg>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center shadow-lg"><Hammer className="w-5 h-5 text-amber-300" /></div>
                  <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mt-4">Artisan</h3>
                  <p className="text-sm sm:text-base text-stone-600 mt-1.5 leading-relaxed">Entre deux chantiers, dictez. La facture est partie avant même que vous ne repreniez la route.</p>
                </div>
              </motion.div>
            </R>

            {/* ── FREELANCE (1×1) ── */}
            <R delay={0.16} className="col-span-1">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-4 sm:p-6 bg-white border border-gray-200 hover:border-emerald-300 transition-colors">
                <span className="absolute -bottom-6 -right-2 text-[7rem] sm:text-[8rem] leading-none font-mono font-bold text-emerald-500/[0.06] select-none">{'{ }'}</span>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-700 to-emerald-600 flex items-center justify-center"><Code2 className="w-5 h-5 text-white" /></div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-4">Freelance</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-snug">Facturation, CRM, contrats — un seul outil, zéro tableur.</p>
                </div>
              </motion.div>
            </R>

            {/* ── TPE / PME (1×1, emerald) ── */}
            <R delay={0.22} className="col-span-1">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/70 border border-emerald-200/70">
                <svg className="absolute -bottom-2 -right-3 w-28 h-28 text-emerald-600/10" viewBox="0 0 100 100" fill="currentColor"><path d="M20 40 L20 80 L80 80 L80 40 Z M15 40 L85 40 L82 28 L18 28 Z" /></svg>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Store className="w-5 h-5 text-white" /></div>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-950 mt-4">TPE / PME</h3>
                  <p className="text-sm text-emerald-800/70 mt-1 leading-snug">Gérez votre équipe et vos factures au même endroit.</p>
                </div>
              </motion.div>
            </R>

            {/* ── CONSULTANT (large, clair) ── */}
            <R delay={0.28} className="col-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-6 sm:p-7 bg-white border border-gray-200 hover:border-emerald-300 transition-colors">
                <svg className="absolute right-4 top-6 w-44 h-20 text-emerald-500/10" viewBox="0 0 200 60" fill="none" preserveAspectRatio="none"><path d="M4 44 C30 20 60 52 92 28 C120 8 160 40 196 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-400 flex items-center justify-center shadow-lg"><Briefcase className="w-5 h-5 text-white" /></div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-4">Consultant</h3>
                  <p className="text-sm sm:text-base text-gray-500 mt-1.5 leading-relaxed">Devis signés et factures encaissées en un clic. Vos clients paient directement par carte.</p>
                </div>
              </motion.div>
            </R>

            {/* ── AGENCE (large, sombre BR) ── */}
            <R delay={0.34} className="col-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950 border border-white/10">
                <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-emerald-500/20 rounded-full blur-[80px]" />
                <div className="relative z-10 flex items-start justify-between gap-4 h-full">
                  <div className="flex flex-col h-full">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><Palette className="w-5 h-5 text-emerald-400" /></div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-4">Agence</h3>
                    <p className="text-sm sm:text-base text-neutral-300 mt-1.5 leading-relaxed max-w-xs">Un workspace séparé par client. Chacun voit ce qu'il doit voir, rien de plus.</p>
                  </div>
                  {/* stacked workspace tabs illustration */}
                  <div className="hidden sm:flex flex-col gap-1.5 pt-2">
                    {[0, 1, 2].map((n) => (
                      <div key={n} className="flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-lg px-3 py-2 w-40" style={{ transform: `translateX(${n * 6}px)` }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-medium text-neutral-300">Client {n + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </R>
          </div>
        </div>
      </section>

      <Wave fromColor="#ffffff" toColor="#000000" variant={2} />

      {/* ════════════ CORE FEATURE — Facture électronique + IA ════════════ */}
      <section data-nav-theme="dark" id="features" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={`${LC} relative z-10`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R><p className="text-xs sm:text-sm text-emerald-400 uppercase tracking-[0.2em] font-semibold mb-4">Facturation électronique</p></R>
            <R delay={0.05}><h2 className="text-[clamp(2rem,6vw,2.75rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1]">Votre facture,<br /><span className="text-emerald-400">dictée et conforme</span></h2></R>
          </div>

          {/* Hero Feature — 2 colonnes */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 2xl:gap-20 items-center mb-20 2xl:mb-28">
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
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 2xl:gap-5">
                {[
                  { icon: Mic, title: 'Dictée en français naturel', desc: 'Parlez simplement : l\'IA comprend et remplit chaque champ à votre place.' },
                  { icon: ShieldCheck, title: 'Conforme Factur-X · EN 16931', desc: 'Le standard européen officiel, prêt pour l\'obligation 2026.' },
                  { icon: Zap, title: 'PDF pro en 3 secondes', desc: 'Toutes les mentions légales incluses, mises en page automatiquement.' },
                  { icon: CreditCard, title: 'Encaissez via Stripe & SumUp', desc: 'Envoyez, encaissez par carte, sans jamais quitter l\'app.' },
                ].map((item, i) => (
                  <R key={i} delay={i * 0.08}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                      className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 2xl:p-7 bg-white/[0.03] border border-white/[0.08] hover:border-emerald-400/40 transition-colors duration-300 min-h-[150px] sm:min-h-[170px] 2xl:min-h-[185px] flex flex-col h-full"
                    >
                      {/* sheen sweep on hover */}
                      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <span className="absolute -inset-y-4 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent skew-x-[-12deg] group-hover:animate-[sheen_0.9s_ease-out]" />
                      </span>
                      <div className="relative w-10 h-10 2xl:w-11 2xl:h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/15 flex items-center justify-center mb-3 2xl:mb-4 group-hover:bg-emerald-500/15 transition-colors">
                        <item.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-emerald-400" />
                      </div>
                      <h3 className="relative text-sm sm:text-base 2xl:text-lg font-bold text-white leading-snug">{item.title}</h3>
                      <p className="relative text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed">{item.desc}</p>
                    </motion.div>
                  </R>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={2} />

      {/* ════════════ SECONDARY FEATURES — Bento ════════════ */}
      <section data-nav-theme="light" className="relative py-16 sm:py-24 md:py-32 2xl:py-40 overflow-hidden bg-white">
        <div className={LC}>
          <div className="max-w-2xl mb-12 md:mb-16 2xl:mb-20">
            <R delay={0.1}><p className="text-xs sm:text-sm text-gray-400 uppercase tracking-[0.2em] font-semibold mb-4">Et aussi</p></R>
            <R delay={0.15}><h2 className="text-[clamp(1.9rem,6vw,2.5rem)] md:text-5xl 2xl:text-6xl font-bold tracking-tight text-gray-900 leading-[1.08]">Tout ce qu'il vous faut, <span className="text-emerald-500">au-delà de la facture</span></h2></R>
          </div>

          <div className="grid grid-cols-2 max-[374px]:grid-cols-1 lg:grid-cols-4 auto-rows-[minmax(170px,1fr)] lg:auto-rows-[minmax(200px,1fr)] gap-3 sm:gap-4 2xl:gap-5">

            {/* ── ENCAISSEMENT — hero (2×2, sombre) ── */}
            <R delay={0.05} className="col-span-2 lg:row-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-7 sm:p-8 2xl:p-10 bg-gradient-to-br from-emerald-950 via-neutral-950 to-black border border-white/10">
                <div className="absolute -top-16 -right-10 w-64 h-64 bg-emerald-500/25 rounded-full blur-[90px] animate-[bentoGlow_9s_ease-in-out_infinite]" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 2xl:w-14 2xl:h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center"><CreditCard className="w-6 h-6 2xl:w-7 2xl:h-7 text-emerald-400" /></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-3 py-1">Stripe & SumUp</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold text-white mt-6 2xl:mt-8">Encaissement intégré</h3>
                  <p className="text-base sm:text-lg text-neutral-300 mt-3 leading-relaxed max-w-sm">Un lien de paiement avec votre facture. Votre client paie par carte, vous recevez l'argent — sans relance.</p>

                  {/* mini paiement reçu */}
                  <div className="mt-auto pt-8">
                    <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">Lien de paiement</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Actif</span>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="text-[11px] text-neutral-500">Reçu</div>
                          <div className="text-2xl font-extrabold text-white">4 560 €</div>
                        </div>
                        <div className="flex items-center gap-2 opacity-90">
                          <LogoStripe className="h-5 w-auto" />
                          <Image src="/images/sumup-logo.png" alt="SumUp" width={48} height={14} className="h-3.5 w-auto" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300"><CheckCircle className="w-3.5 h-3.5" /> Paiement reçu · il y a 2 min</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </R>

            {/* ── CRM (large, clair) ── */}
            <R delay={0.1} className="col-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-6 sm:p-7 bg-white border border-gray-200 hover:border-emerald-300 transition-colors">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Brain className="w-5 h-5 text-white" /></div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-4">CRM intelligent</h3>
                  <p className="text-sm sm:text-base text-gray-500 mt-1.5 leading-relaxed">Clients auto-complétés via SIRET. Votre pipeline se met à jour à chaque facture.</p>
                  <div className="mt-auto pt-4 space-y-2">
                    {[['Dupont SARL', '4 560 €', 100], ['Acme Studio', '2 100 €', 70], ['Lefèvre & Co', '880 €', 40]].map(([n, a, p]) => (
                      <div key={n as string} className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{(n as string).charAt(0)}</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-600 flex-1 truncate">{n}</span>
                        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p}%` }} /></div>
                        <span className="text-xs font-bold text-gray-900 w-14 text-right">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </R>

            {/* ── CONTRATS (1×1) ── */}
            <R delay={0.16} className="col-span-1">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-4 sm:p-6 bg-white border border-gray-200 hover:border-emerald-300 transition-colors">
                <svg className="absolute -bottom-2 -right-3 w-32 h-20 text-emerald-500/15" viewBox="0 0 200 60" fill="none" preserveAspectRatio="none"><path d="M6 44 C34 8 56 50 86 28 C112 10 150 46 194 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-400" /></div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-4">Contrats CDI & CDD</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-snug">Conformes au droit français, signés en 5 min.</p>
                </div>
              </motion.div>
            </R>

            {/* ── NOTES DE FRAIS (1×1, emerald) ── */}
            <R delay={0.22} className="col-span-1">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/70 border border-emerald-200/70">
                <svg className="absolute -bottom-3 -right-4 w-24 h-28 text-emerald-600/15" viewBox="0 0 80 100" fill="none"><path d="M14 6 H54 L66 18 V92 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 V10 a4 4 0 0 1 4 -4 Z" stroke="currentColor" strokeWidth="3" /><path d="M22 30 H54 M22 42 H54 M22 54 H40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><line x1="8" y1="64" x2="68" y2="64" stroke="#10b981" strokeWidth="3" strokeLinecap="round" /></svg>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20"><Calculator className="w-5 h-5 text-white" /></div>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-950 mt-4">Notes de frais + OCR</h3>
                  <p className="text-sm text-emerald-800/70 mt-1 leading-snug">Photographiez un reçu, l'IA catégorise tout.</p>
                </div>
              </motion.div>
            </R>

            {/* ── RÉCURRENTES (large, clair) ── */}
            <R delay={0.28} className="col-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-6 sm:p-7 bg-white border border-gray-200 hover:border-emerald-300 transition-colors">
                <div className="relative z-10 flex items-start justify-between gap-4 h-full">
                  <div className="flex flex-col h-full">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-600 flex items-center justify-center"><FileClock className="w-5 h-5 text-emerald-400" /></div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-4">Factures récurrentes</h3>
                    <p className="text-sm sm:text-base text-gray-500 mt-1.5 leading-relaxed">Automatisez vos factures mensuelles en 1 clic. Jamais plus d'oubli.</p>
                  </div>
                  {/* mois checkmarks */}
                  <div className="hidden sm:flex flex-col gap-2 items-end pt-1">
                    <div className="flex items-center gap-1.5">
                      {['Jan', 'Fév', 'Mar', 'Avr'].map((m, mi) => (
                        <div key={m} className="flex flex-col items-center gap-1">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', mi < 3 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400')}>{mi < 3 ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{m.charAt(0)}</span>}</div>
                          <span className="text-[9px] text-gray-400 font-medium">{m}</span>
                        </div>
                      ))}
                      <ArrowRight className="w-4 h-4 text-gray-300 ml-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </R>

            {/* ── COMPTABILITÉ (large, sombre BR) ── */}
            <R delay={0.34} className="col-span-2">
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="group relative h-full overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950 border border-white/10">
                <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-emerald-500/20 rounded-full blur-[80px]" />
                <div className="relative z-10 flex items-start justify-between gap-4 h-full">
                  <div className="flex flex-col h-full">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-emerald-400" /></div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-4">Comptabilité exportable</h3>
                    <p className="text-sm sm:text-base text-neutral-300 mt-1.5 leading-relaxed max-w-xs">Export officiel pour les impôts, suivi URSSAF, déclaration TVA intégrée.</p>
                  </div>
                  {/* bar chart + badges */}
                  <div className="hidden sm:flex flex-col items-end gap-3 pt-1">
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 50, 85, 70].map((h, hi) => (
                        <div key={hi} className="w-3 rounded-t-md bg-gradient-to-t from-emerald-500/40 to-emerald-400" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {['FEC', 'URSSAF', 'TVA'].map((b) => (
                        <span key={b} className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-md px-2 py-1">{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </R>
          </div>
        </div>
      </section>

      {/* ════════════ INTÉGRATIONS — mur de logos officiels ════════════ */}
      <section data-nav-theme="light" className="relative py-16 sm:py-20 md:py-28 2xl:py-36 overflow-hidden bg-white">
        <div className={LC}>
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16 2xl:mb-20">
            <R><p className="text-xs sm:text-sm text-emerald-600 uppercase tracking-[0.2em] font-semibold mb-4">Connecté à votre stack</p></R>
            <R delay={0.06}><h2 className="text-[clamp(1.9rem,6vw,2.5rem)] md:text-5xl 2xl:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">Vos outils préférés, <span className="text-emerald-500">en natif</span></h2></R>
            <R delay={0.12}><p className="text-base sm:text-lg text-gray-500 mt-5 leading-relaxed">Paiement, identité, conformité, exports. Factu.me parle déjà le langage de votre quotidien.</p></R>
          </div>

          {/* Logo wall — vrais logos officiels */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 2xl:gap-6 max-w-5xl 2xl:max-w-6xl mx-auto">
            {[
              { label: 'Paiement', sub: 'Encaissement carte', node: <LogoStripe className="h-9 sm:h-10 w-auto" /> },
              { label: 'Connexion', sub: 'OAuth sécurisé', node: <LogoGoogle className="h-9 sm:h-10 w-auto" /> },
              { label: 'Paiement', sub: 'Terminal & lien', node: <Image src="/images/sumup-logo.png" alt="SumUp" width={140} height={44} className="h-8 sm:h-9 w-auto" /> },
              { label: 'Conformité', sub: 'Plateforme État', node: <LogoChorus className="text-lg sm:text-xl" /> },
            ].map((logo, i) => (
              <R key={i} delay={0.05 + i * 0.07}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="group relative bg-white rounded-2xl border border-gray-200 px-6 py-8 2xl:py-10 flex flex-col items-center justify-center gap-3 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 transition-colors duration-300 min-h-[150px] 2xl:min-h-[170px] h-full"
                >
                  <div className="flex items-center justify-center h-11 2xl:h-12">{logo.node}</div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-bold text-gray-900">{logo.label}</div>
                    <div className="text-[11px] sm:text-xs text-gray-400">{logo.sub}</div>
                  </div>
                </motion.div>
              </R>
            ))}
          </div>

          {/* Standards & formats — marquee */}
          <R delay={0.24}>
            <div className="mt-12 2xl:mt-16">
              <p className="text-center text-xs sm:text-sm text-gray-400 uppercase tracking-[0.2em] font-semibold mb-6">Normes & formats respectés</p>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                <Marquee pauseOnHover className="[--duration:32s]">
                  {['Factur-X', 'EN 16931', 'eIDAS', 'RGPD', 'FEC', 'CSV', 'PDF', 'URSSAF', 'TVA', 'Chorus Pro'].map((s) => (
                    <span key={s} className="mx-3 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 text-sm font-bold text-gray-600 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />{s}
                    </span>
                  ))}
                </Marquee>
              </div>
            </div>
          </R>
        </div>
      </section>

      <Wave fromColor="#ffffff" toColor="#000000" variant={3} />

      {/* ════════════ CONTRATS — DARK ════════════ */}
      <section data-nav-theme="dark" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={`${LC} relative z-[2]`}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            <div className="space-y-8">
              <R x={-30} y={0}>
                <p className="text-xs sm:text-sm text-emerald-400 uppercase tracking-[0.2em] font-semibold mb-3">Contrats de travail</p>
                <h2 className="text-[clamp(2rem,6vw,2.75rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
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
                      <span className="text-sm sm:text-base text-neutral-300 pt-1">{item.text}</span>
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
                  <div className="flex-1 bg-white/[0.05] text-white font-semibold py-3.5 min-h-[48px] rounded-xl text-sm flex items-center justify-center gap-2 border border-white/[0.08]"><Eye className="w-4 h-4 text-neutral-400" />Aperçu</div>
                  <div className="flex-1 bg-emerald-500 text-white font-semibold py-3.5 min-h-[48px] rounded-xl text-sm flex items-center justify-center gap-2"><Share2 className="w-4 h-4" />Faire signer</div>
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
      <section data-nav-theme="light" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
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
                <p className="text-xs sm:text-sm text-emerald-600 uppercase tracking-[0.2em] font-semibold mb-3">Encaissement</p>
                <h2 className="text-[clamp(2rem,6vw,2.75rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-4">
                  De la facture à votre compte bancaire en <span className="text-emerald-500">1 lien</span>
                </h2>
                <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-md leading-relaxed">
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
                      <span className="text-sm sm:text-base text-gray-700">{item.text}</span>
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
      <section data-nav-theme="dark" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className={`${LC} relative z-[2]`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 md:mb-24 2xl:mb-32">
            <R><p className="text-xs sm:text-sm text-emerald-400 uppercase tracking-[0.2em] font-semibold mb-4">Comment ça marche</p></R>
            <R delay={0.06}><h2 className="text-[clamp(1.9rem,6vw,2.5rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white leading-[1.08]">3 étapes. <span className="text-emerald-400">C'est tout.</span></h2></R>
            <R delay={0.12}><p className="text-base sm:text-lg text-neutral-400 mt-5 max-w-xl leading-relaxed">De votre voix à votre compte bancaire, sans aucun intermédiaire fastidieux. Voici le voyage complet d'une facture Factu.me.</p></R>
          </div>
          <div className="relative max-w-4xl 2xl:max-w-5xl mx-auto">
            <div className="absolute left-[23px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/60 via-emerald-500/30 to-emerald-500/60" />
            <div className="space-y-10 md:space-y-14 2xl:space-y-20">
              {steps.map((step, i) => (
                <div key={i} className={cn('relative flex items-start gap-8', i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse')}>
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-black z-10 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                  <R delay={i * 0.1} x={i % 2 === 0 ? -30 : 30} y={0} className={cn('ml-12 md:ml-0 md:w-[calc(50%-2.5rem)]', i % 2 === 0 ? 'md:pr-4 md:text-right md:items-end' : 'md:pl-4 md:text-left md:items-start', 'flex flex-col')}>
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] hover:border-emerald-400/25 transition-colors duration-300 p-5 sm:p-6 2xl:p-7">
                      <div className={cn('flex items-center gap-3 mb-3 flex-wrap', i % 2 === 0 && 'md:justify-end')}>
                        <span className="text-emerald-400 font-mono text-2xl sm:text-3xl 2xl:text-4xl font-bold leading-none">{step.num}</span>
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-2.5 py-1">{step.eyebrow}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-bold text-white mb-2.5 leading-tight">{step.title}</h3>
                      <p className="text-sm sm:text-base 2xl:text-lg text-neutral-400 leading-relaxed">{step.desc}</p>
                      <div className={cn('mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-300', i % 2 === 0 && 'md:flex-row-reverse')}>
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />{step.meta}
                      </div>
                    </div>
                  </R>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={2} />

      {/* ════════════ TESTIMONIALS — BLANC ════════════ */}
      <section data-nav-theme="light" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-14 md:mb-20">
            <R><p className="text-xs sm:text-sm text-emerald-600 uppercase tracking-[0.2em] font-semibold mb-4">Témoignages</p></R>
            <R delay={0.06}><h2 className="text-[clamp(1.9rem,6vw,2.5rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08]">Ils ont arrêté de <span className="text-emerald-500">perdre leur temps</span></h2></R>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7">
            {testimonials.map((t, i) => (
              <R key={i} delay={i * 0.08}>
                <div className="group bg-gray-50 border border-gray-200 rounded-3xl p-7 md:p-8 2xl:p-10 h-full flex flex-col transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5">
                  <div className="flex gap-0.5 mb-5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-400 fill-emerald-400" />)}</div>
                  <p className="text-base sm:text-lg 2xl:text-xl leading-relaxed text-gray-700 flex-grow mb-7">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3.5 pt-5 border-t border-gray-200/70">
                    <Image src={t.img} alt={t.name} width={48} height={48} className="w-11 h-11 2xl:w-13 2xl:h-13 rounded-full object-cover ring-2 ring-white shadow-md" />
                    <div>
                      <div className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-1.5">{t.name}<CheckCircle className="w-3.5 h-3.5 text-emerald-500" /></div>
                      <div className="text-xs sm:text-sm text-gray-400">{t.role}</div>
                    </div>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      
      <Wave fromColor="#ffffff" toColor="#000000" variant={0} />

      {/* ════════════ PRICING — DARK (confetti + compteurs) ════════════ */}
      <section data-nav-theme="dark" id="pricing" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <Confetti fire={confettiFire} />
        <div className={`${LC} relative z-[2]`}>
          <div className="text-center mb-12 md:mb-16 2xl:mb-20">
            <R>
              <p className="text-xs sm:text-sm text-emerald-400 uppercase tracking-[0.2em] font-semibold mb-4">Tarifs transparents</p>
              <h2 className="text-[clamp(1.9rem,6vw,2.5rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-white mb-4">Choisissez votre plan</h2>
              <p className="text-base sm:text-lg text-neutral-400">Sans engagement. Évoluez quand vous voulez.</p>
            </R>

            {/* Segmented toggle — sliding emerald knob */}
            <R delay={0.1}>
              <div className="mt-8 flex justify-center">
                <div className="relative inline-flex p-1 bg-neutral-900 border border-white/10 rounded-full">
                  <motion.div
                    className="pointer-events-none absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30"
                    animate={{ x: billing === 'yearly' ? '100%' : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                  <button onClick={() => switchBilling('monthly')} className={cn('relative z-10 px-7 sm:px-9 py-3 min-h-[44px] text-sm sm:text-base font-bold rounded-full transition-colors duration-200', billing === 'monthly' ? 'text-neutral-950' : 'text-neutral-400 hover:text-white')}>Mensuel</button>
                  <button onClick={() => switchBilling('yearly')} className={cn('relative z-10 px-7 sm:px-9 py-3 min-h-[44px] text-sm sm:text-base font-bold rounded-full transition-colors duration-200 inline-flex items-center gap-2', billing === 'yearly' ? 'text-neutral-950' : 'text-neutral-400 hover:text-white')}>
                    Annuel
                    <span className={cn('text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full', billing === 'yearly' ? 'bg-neutral-950/15 text-neutral-950' : 'bg-emerald-500/15 text-emerald-400')}>−20%</span>
                  </button>
                </div>
              </div>
            </R>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7 max-w-5xl 2xl:max-w-6xl mx-auto items-start">
            {plans.map((plan, i) => (
              <R key={i} delay={i * 0.06}>
                <div className={cn(
                  'relative rounded-3xl p-7 sm:p-8 2xl:p-9 flex flex-col h-full transition-all duration-300',
                  plan.popular
                    ? 'border-2 border-emerald-500/70 scale-100 md:scale-105 z-10 bg-neutral-900/60 shadow-[0_0_50px_rgba(16,185,129,0.15)]'
                    : 'bg-neutral-900/40 border border-white/[0.06] hover:border-white/10'
                )}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] 2xl:text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                        <Crown className="w-3.5 h-3.5" />Recommandé
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-bold text-white">{plan.name}</h3>
                      {plan.popular && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">TOP</span>}
                    </div>
                    <p className="text-sm 2xl:text-base text-neutral-400 mt-1 mb-5">{plan.tag}</p>
                    <div className="flex items-baseline gap-1.5 min-h-[3rem]">
                      <motion.span
                        className="text-4xl sm:text-5xl 2xl:text-6xl font-extrabold text-white tracking-tight tabular-nums inline-block"
                        animate={{ scale: billing === 'yearly' ? [1, 1.14, 1] : [1, 0.9, 1] }}
                        transition={{ duration: 0.45, ease }}
                      >
                        <AnimatedPrice value={billing === 'monthly' ? plan.monthly : plan.yearly} />
                      </motion.span>
                      {plan.monthly > 0 && <span className="text-sm sm:text-base text-neutral-400">/mois</span>}
                    </div>
                    {billing === 'yearly' && plan.monthly > 0 && (
                      <p className="text-xs sm:text-sm text-emerald-400 font-semibold mt-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Économisez {(plan.monthly - plan.yearly).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mois
                      </p>
                    )}
                    {plan.monthly === 0 && <p className="text-xs sm:text-sm text-neutral-500 mt-2">À vie, sans carte bancaire</p>}
                  </div>
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm sm:text-base">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className={cn('text-neutral-300', j === 0 && 'text-emerald-300 font-medium')}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.name.toLowerCase()}&billing=${billing}`} className={cn(
                    'block text-center font-bold py-3.5 2xl:py-4 rounded-xl text-sm sm:text-base transition-all duration-200 active:scale-[0.97]',
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]'
                  )}>
                    {plan.monthly === 0 ? 'Commencer gratuitement' : 'Essai 7 jours gratuit'}
                  </Link>
                </div>
              </R>
            ))}
          </div>
          <R>
            <p className="text-center text-sm 2xl:text-base text-neutral-400 mt-8 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />Données en France · SSL · RGPD · Annulation en un clic
            </p>
          </R>
        </div>
      </section>

      <Wave fromColor="#000000" toColor="#ffffff" variant={0} />

      {/* ════════════ FAQ — BLANC ════════════ */}
      <section data-nav-theme="light" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-white">
        <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32">
          <div className="mb-14 2xl:mb-20">
            <R><p className="text-xs sm:text-sm text-emerald-600 uppercase tracking-[0.2em] font-semibold mb-4">FAQ</p></R>
            <R><h2 className="text-[clamp(2rem,6vw,2.75rem)] md:text-5xl 2xl:text-7xl font-bold tracking-tight text-gray-900">Questions fréquentes</h2></R>
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
      <section data-nav-theme="dark" id="ai" className="relative py-16 sm:py-24 md:py-40 2xl:py-48 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] lg:w-[1000px] h-[600px] sm:h-[800px] lg:h-[1000px] bg-emerald-500/8 rounded-full blur-[180px] lg:blur-[250px]" />
        </div>
        <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32 text-center relative z-10">
          <R y={0}>
            {/* Badge micro — signature visuelle IA */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/40 rounded-full blur-2xl animate-pulse" />
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease }}
                  className="relative w-16 h-16 2xl:w-20 2xl:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.55)] ring-1 ring-white/20"
                >
                  <Mic className="w-7 h-7 2xl:w-9 2xl:h-9 text-white" />
                </motion.div>
              </div>
            </div>
            <div className="max-w-xs mx-auto mb-8"><VoiceWaveform /></div>
            <h2 className="text-[clamp(2rem,7vw,3.5rem)] md:text-6xl 2xl:text-8xl font-bold tracking-tight text-white leading-[1.1] mb-10 2xl:mb-12">
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
                  <a key={i} href="#" aria-label="Réseau social" className="w-10 h-10 2xl:w-11 2xl:h-11 bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors duration-200 active:scale-95"><Icon className="w-4 h-4 text-neutral-400" /></a>
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
                <ul className="space-y-3">
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

          {/* Sceau officiel — Solution compatible facturation électronique (tout en bas) */}
          <div className="flex justify-center pt-8">
            <Image src="/images/solutioncompatible.png" alt="Solution compatible — Facturation électronique certifiée, République Française" width={1694} height={624} className="w-full max-w-[120px] h-auto" />
          </div>
        </div>
      </footer>

      {/* ═══ STICKY MOBILE CTA — Thumb Zone (MOBIUS · Loi 7) ═══
          Apparaît après 600px de scroll, full-width, safe-area-aware.
          sm:hidden → desktop garde sa nav flottante. */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-40 sm:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="px-3 pt-8 pb-3 bg-gradient-to-t from-black via-black/85 to-transparent">
              <Link href="/register" className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 min-h-[52px] rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.4)] text-base active:scale-[0.97] transition-all duration-200">
                <Mic className="w-5 h-5" />Commencer gratuitement<ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── FAQ Item ─── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden transition-colors duration-300 hover:border-gray-300">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 sm:p-6 2xl:p-7 text-left">
        <span className="font-semibold text-base sm:text-lg 2xl:text-xl text-gray-900 pr-4">{question}</span>
        <ChevronDown className={cn('w-5 h-5 2xl:w-6 2xl:h-6 text-gray-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div className={cn('overflow-hidden transition-all duration-200', open ? 'max-h-60 px-5 sm:p-6 2xl:px-7 pb-5 sm:pb-6 2xl:pb-7' : 'max-h-0')}>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
