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
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { Marquee } from '@/components/ui/marquee';

/* ═══════════════════════════════════════════════════════════
   COURBE EXCLUSIVE — Loi 4 du Manifeste Anti-IA
   ═══════════════════════════════════════════════════════════ */
const ease = [0.16, 1, 0.3, 1] as const;

/* ═══════════════════════════════════════════════════════════
   LAYOUT — Container pour grands écrans (MODIF 1)
   ═══════════════════════════════════════════════════════════ */
const LC = 'max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32';

/* ═══════════════════════════════════════════════════════════
   REVEAL — Animation au scroll
   ═══════════════════════════════════════════════════════════ */
function R({ children, delay = 0, x = 0, y = 30, className }: { children: React.ReactNode; delay?: number; x?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRADIENT OVERLAP — Fondu entre sections (MODIF 2)
   ═══════════════════════════════════════════════════════════ */
function Fade({ to = 'transparent' }: { to?: string }) {
  return <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent pointer-events-none z-10" style={{ '--tw-gradient-to': to } as React.CSSProperties} />;
}

/* ═══════════════════════════════════════════════════════════
   DATA — Features issues du backup (MODIF 3)
   ═══════════════════════════════════════════════════════════ */
const features = [
  { icon: FileText, title: 'Facturation multi-documents', desc: 'Factures, devis, avoirs, bons de commande, bons de livraison, factures d\'acompte.' },
  { icon: Sparkles, title: 'Intelligence Artificielle', desc: 'Dictez ou décrivez votre facture. L\'IA remplit tout et comprend les modifications.' },
  { icon: Send, title: 'Envoi et suivi', desc: 'E-mail avec PDF, liens de paiement, portail client, relances automatiques, signature.' },
  { icon: Users, title: 'CRM intégré', desc: 'Fiches clients, import CSV, auto-complétion SIRET, tags, historique et pipeline de vente.' },
  { icon: Calculator, title: 'Comptabilité', desc: 'Export officiel pour les impôts, suivi des dépenses, scan de reçus, rapprochement bancaire.' },
  { icon: LayoutGrid, title: 'Espace collaboratif', desc: 'Jusqu\'à 10 espaces de travail isolés, rôles, flux d\'activité et notifications.' },
  { icon: Calendar, title: 'Gestion de planning', desc: 'Calendrier intégré pour suivre vos échéances et relances.' },
  { icon: Package, title: 'Catalogue produits', desc: 'Créez votre catalogue de produits/services pour une facturation plus rapide.' },
  { icon: Truck, title: 'Fournisseurs', desc: 'Gérez vos dépenses et vos fournisseurs en un seul endroit.' },
  { icon: FileClock, title: 'Factures récurrentes', desc: 'Automatisez vos factures récurrentes avec un seul clic.' },
];

const steps = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscription en 2 minutes. Choisissez votre template préféré.' },
  { num: '02', title: 'Décrivez votre facture', desc: 'Dites-la à voix haute ou tapez-la. L\'IA fait le reste.' },
  { num: '03', title: 'Recevez votre paiement', desc: 'Envoyez par e-mail, votre client paie en un clic.' },
  { num: '04', title: 'Gérez vos contrats', desc: 'CDI, CDD, freelance — générez et signez en 5 minutes.' },
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

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE — 4 MODIFS APPLIQUÉES
   ═══════════════════════════════════════════════════════════ */
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

      {/* ════════════ NAVBAR — Glassmorphism ════════════ */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/20'
          : 'bg-transparent'
      )}>
        <div className={`${LC} flex items-center justify-between h-16 md:h-20`}>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" priority />
            <span className="text-lg font-bold tracking-tight text-white">Factu<span className="text-emerald-400">.me</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[{ label: 'Fonctionnalités', href: '#features' }, { label: 'IA', href: '#ai' }, { label: 'Tarifs', href: '#pricing' }].map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="text-[13px] font-medium text-slate-400 hover:text-emerald-400 transition-colors duration-300">{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-white transition-colors"><LogIn className="w-3.5 h-3.5" />Connexion</Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-full transition-all duration-300 active:scale-95">
              Commencer gratuitement<ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-1">{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }} className="md:hidden bg-slate-950/95 backdrop-blur-2xl overflow-hidden">
              <div className="px-6 py-4 space-y-1">
                {[{ label: 'Fonctionnalités', href: '#features' }, { label: 'IA', href: '#ai' }, { label: 'Tarifs', href: '#pricing' }].map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="block py-3 text-sm font-medium text-slate-300 hover:text-emerald-400">{l.label}</a>
                ))}
                <Link href="/login" className="flex items-center gap-2 py-3 text-sm text-slate-400"><LogIn className="w-4 h-4" />Se connecter</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ════════════ HERO — Asymétrique 7/5 + Floating Card (MODIF 4) ════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Background blobs — fond commun slate-950 */}
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-400/[0.05] rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        {/* Gradient overlap vers marquee */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-slate-950/90 pointer-events-none z-10" />

        <div className={`relative z-10 ${LC} py-24 md:py-32 2xl:py-40 w-full`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 2xl:gap-20 items-center">
            {/* Left — 7 cols */}
            <div className="lg:col-span-7 space-y-8 2xl:space-y-10">
              <R delay={0}>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs 2xl:text-sm font-medium text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />Nouveau : IA intégrée
                </div>
              </R>

              <R delay={0.08}>
                <h1 className="text-5xl md:text-7xl 2xl:text-9xl font-medium tracking-tighter text-slate-50 leading-[1.05]">
                  Contrats + Facturation<br />
                  propulsés par <span className="text-emerald-400">l&apos;IA</span>
                </h1>
              </R>

              <R delay={0.16}>
                <p className="text-lg 2xl:text-xl 2xl:leading-relaxed text-slate-400 max-w-lg 2xl:max-w-xl">
                  Le seul outil qui gère vos salariés <span className="text-white font-medium">ET</span> vos clients. Créez des CDI/CDD conformes et facturez en 30 secondes.
                </p>
              </R>

              <R delay={0.24}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <ShimmerButton onClick={() => window.location.href = '/register'} className="rounded-full px-7 py-3.5 2xl:px-9 2xl:py-4 text-sm 2xl:text-base" background="rgba(16, 185, 129, 1)">
                    Créer votre première facture <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
                  </ShimmerButton>
                  <Link href="/demo" className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white px-7 py-3.5 2xl:px-9 2xl:py-4 rounded-full text-sm 2xl:text-base font-medium transition-all duration-300 hover:bg-white/[0.04]">
                    <Play className="w-4 h-4 text-emerald-400" />Voir la démo
                  </Link>
                </div>
              </R>

              <R delay={0.32}>
                <div className="flex items-center gap-5 pt-3">
                  <div className="flex -space-x-2">
                    {['M', 'S', 'A', 'L'].map((c, i) => {
                      const bg = ['bg-blue-500/30 text-blue-300', 'bg-purple-500/30 text-purple-300', 'bg-emerald-500/30 text-emerald-300', 'bg-amber-500/30 text-amber-300'][i];
                      return <div key={i} className={cn('w-8 2xl:w-10 h-8 2xl:h-10 rounded-full border-2 border-slate-950 text-[10px] 2xl:text-xs font-bold flex items-center justify-center', bg)}>{c}</div>;
                    })}
                    <div className="w-8 2xl:w-10 h-8 2xl:h-10 rounded-full border-2 border-slate-950 bg-emerald-500/20 text-[9px] 2xl:text-[10px] font-bold text-emerald-300 flex items-center justify-center">+2k</div>
                  </div>
                  <div>
                    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3 h-3 text-white fill-white" />)}</div>
                    <div className="text-[10px] 2xl:text-xs text-slate-500 mt-0.5">2 000+ entrepreneurs</div>
                  </div>
                </div>
              </R>
            </div>

            {/* Right — 5 cols : Floating BorderBeam Card (MODIF 4) */}
            <div className="lg:col-span-5 flex justify-center">
              <R delay={0.2} y={0} x={40}>
                <div className="relative w-full max-w-md 2xl:max-w-lg">
                  {/* Glow underneath — lévitation lumineuse (MODIF 4.3) */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-24 bg-emerald-500/20 blur-3xl rounded-full" />

                  {/* Floating animation (MODIF 4.2) */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="relative bg-slate-900/60 backdrop-blur border border-white/10 rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-visible p-5 2xl:p-7 space-y-4">
                      <BorderBeam duration={5} size={280} borderWidth={2} />

                      {/* Browser chrome */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                        </div>
                        <div className="flex-1 bg-slate-800/60 rounded-lg px-3 py-1 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] 2xl:text-xs text-slate-500 font-mono">factu.me/invoice/FACT-2026-0042</span>
                        </div>
                      </div>

                      {/* Invoice mockup — détails enrichis (MODIF 4.1) */}
                      <div className="space-y-3">
                        {/* Header avec logo + infos */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 2xl:w-10 2xl:h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/30">
                              <Zap className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-xs 2xl:text-sm font-bold text-white">Martin Consulting</div>
                              <div className="text-[9px] 2xl:text-[10px] text-slate-500">12 rue de la Paix, 75002</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[8px] 2xl:text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Facture</div>
                            <div className="text-[10px] 2xl:text-xs font-mono text-slate-400 font-semibold">FACT-2026-0042</div>
                            <div className="text-[8px] 2xl:text-[9px] text-slate-600">19 avril 2026</div>
                          </div>
                        </div>

                        {/* Client + badge Payée */}
                        <div className="bg-slate-800/40 rounded-xl p-2.5 2xl:p-3 flex justify-between items-center">
                          <div>
                            <div className="text-[8px] 2xl:text-[9px] text-slate-500 uppercase font-semibold">Client</div>
                            <div className="text-[10px] 2xl:text-xs font-semibold text-white">Dupont Consulting SAS</div>
                          </div>
                          <div className="flex items-center gap-1 text-[8px] 2xl:text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />Payée
                          </div>
                        </div>

                        {/* Lignes de facture */}
                        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                          <div className="bg-slate-800/60 px-3 py-1.5 grid grid-cols-12">
                            <span className="col-span-5 text-[7px] 2xl:text-[8px] text-slate-500 uppercase font-semibold">Description</span>
                            <span className="col-span-2 text-right text-[7px] 2xl:text-[8px] text-slate-500 uppercase font-semibold">Qté</span>
                            <span className="col-span-2 text-right text-[7px] 2xl:text-[8px] text-slate-500 uppercase font-semibold">Prix</span>
                            <span className="col-span-3 text-right text-[7px] 2xl:text-[8px] text-slate-500 uppercase font-semibold">Total</span>
                          </div>
                          {[
                            { d: 'Développement web', sub: 'Site vitrine React', q: '5j', p: '600 €', t: '3 000 €' },
                            { d: 'Conseil UX/UI', sub: 'Design système', q: '2j', p: '400 €', t: '800 €' },
                          ].map((r, i) => (
                            <div key={i} className="px-3 py-2 2xl:py-2.5 grid grid-cols-12 border-t border-white/[0.04] items-center">
                              <div className="col-span-5">
                                <div className="text-[10px] 2xl:text-[11px] text-slate-300">{r.d}</div>
                                <div className="text-[8px] 2xl:text-[9px] text-slate-600">{r.sub}</div>
                              </div>
                              <span className="col-span-2 text-right text-[10px] 2xl:text-[11px] text-slate-500">{r.q}</span>
                              <span className="col-span-2 text-right text-[10px] 2xl:text-[11px] text-slate-500">{r.p}</span>
                              <span className="col-span-3 text-right text-[10px] 2xl:text-[11px] font-bold text-white">{r.t}</span>
                            </div>
                          ))}
                        </div>

                        {/* Totaux */}
                        <div className="flex justify-end">
                          <div className="w-[55%] 2xl:w-1/2 space-y-0.5">
                            <div className="flex justify-between text-[9px] 2xl:text-[10px] text-slate-500 px-1"><span>Total HT</span><span className="text-slate-400">3 800,00 €</span></div>
                            <div className="flex justify-between text-[9px] 2xl:text-[10px] text-slate-500 px-1"><span>TVA 20%</span><span className="text-slate-400">760,00 €</span></div>
                            <div className="flex justify-between items-center bg-emerald-500 text-white rounded-xl px-3 py-2 mt-1">
                              <span className="text-[10px] 2xl:text-[11px] font-bold">Total TTC</span>
                              <span className="text-sm 2xl:text-base font-extrabold">4 560 €</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer carte */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                          <div className="flex items-center gap-1 text-[8px] 2xl:text-[9px] text-slate-600">
                            <ShieldCheck className="w-3 h-3 text-emerald-500/50" />Paiement sécurisé
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-3.5 px-1.5 bg-slate-800 rounded flex items-center justify-center"><span className="text-[7px] 2xl:text-[8px] font-bold text-white tracking-wider">VISA</span></div>
                            <div className="h-3.5 px-1.5 bg-emerald-600 rounded flex items-center justify-center"><span className="text-[6px] 2xl:text-[7px] font-bold text-white">stripe</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Floating badge IA */}
                      <div className="absolute -top-3 -right-3 z-20">
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}>
                          <div className="bg-slate-900/90 backdrop-blur border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg">
                            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-md flex items-center justify-center"><Sparkles className="w-3 h-3 text-white" /></div>
                            <div>
                              <div className="text-[8px] font-bold text-white">IA Active</div>
                              <div className="text-[6px] text-emerald-400 font-semibold">Générée en 3s</div>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Floating badge Payée bas-gauche */}
                      <div className="absolute -bottom-3 -left-3 z-20">
                        <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                          <div className="bg-slate-900/90 backdrop-blur border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg">
                            <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-md flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                            <div>
                              <div className="text-[8px] font-bold text-white">Payée</div>
                              <div className="text-[6px] text-green-400 font-semibold">via Stripe</div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </R>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ SOCIAL PROOF — Marquee (MODIF 2: no border) ════════════ */}
      <section className="relative py-16 2xl:py-20 overflow-hidden">
        <div className={`${LC}`}>
          <R>
            <p className="text-center text-[11px] 2xl:text-xs text-slate-600 uppercase tracking-[0.2em] font-medium mb-8">Ils nous font confiance</p>
          </R>
        </div>
        <Marquee pauseOnHover className="[--duration:30s]" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' } as React.CSSProperties}>
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-slate-500 flex-shrink-0 px-3">
              <Icon className="w-4 h-4" />
              <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
            </div>
          ))}
        </Marquee>
        {/* Gradient overlap vers features */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none z-10" />
      </section>

      {/* ════════════ FEATURES — Anciennes features redesignées (MODIF 3) ════════════ */}
      <section id="features" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Fonctionnalités</p>
            </R>
            <R delay={0.05}>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-medium tracking-tighter text-white leading-[1.1]">Tout ce dont vous avez besoin, <span className="text-emerald-400">en un seul endroit</span></h2>
            </R>
            <R delay={0.1}>
              <p className="text-base 2xl:text-lg 2xl:leading-relaxed text-slate-500 mt-4">Remplacez vos 5 outils par une seule plateforme.</p>
            </R>
          </div>

          {/* Grille 2 cols haut, 4 cols bas — style Bento adapté */}
          <div className="space-y-5 2xl:space-y-6">
            {/* Première rangée : 2 grandes cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 2xl:gap-6">
              {features.slice(0, 2).map((f, i) => (
                <R key={i} delay={i * 0.06}>
                  <div className="group relative bg-slate-900/40 border border-white/[0.06] rounded-3xl p-7 2xl:p-10 transition-all duration-500 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 overflow-hidden">
                    {/* Gradient subtil en fond */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 2xl:w-14 2xl:h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-5">
                        <f.icon className="w-6 h-6 2xl:w-7 2xl:h-7 text-emerald-400" />
                      </div>
                      <h3 className="text-lg 2xl:text-xl font-semibold text-white mb-2">{f.title}</h3>
                      <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-400">{f.desc}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>

            {/* Deuxième rangée : 4 cartes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 2xl:gap-6">
              {features.slice(2, 6).map((f, i) => (
                <R key={i} delay={i * 0.04}>
                  <div className="group relative bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 2xl:p-8 transition-all duration-500 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 overflow-hidden h-full">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                        <f.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-sm 2xl:text-base font-semibold text-white mb-1.5">{f.title}</h3>
                      <p className="text-xs 2xl:text-sm 2xl:leading-relaxed text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>

            {/* Troisième rangée : 4 cartes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 2xl:gap-6">
              {features.slice(6, 10).map((f, i) => (
                <R key={i} delay={i * 0.04}>
                  <div className="group relative bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 2xl:p-8 transition-all duration-500 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                        <f.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-sm 2xl:text-base font-semibold text-white mb-1.5">{f.title}</h3>
                      <p className="text-xs 2xl:text-sm 2xl:leading-relaxed text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>

        {/* Gradient overlap vers AI */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-[rgb(15,23,42)] pointer-events-none z-10" />
      </section>

      {/* ════════════ AI SECTION (MODIF 2: no border, smooth transition) ════════════ */}
      <section id="ai" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden" style={{ background: 'rgb(15,23,42)' }}>
        <div className="absolute top-0 right-0 w-[500px] 2xl:w-[700px] h-[500px] 2xl:h-[700px] bg-emerald-500/[0.06] rounded-full blur-[120px]" />

        <div className={`${LC} relative z-10`}>
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 2xl:gap-32 items-center">
            {/* Chat visual */}
            <R x={-40} y={0}>
              <div className="bg-slate-900/80 backdrop-blur border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/5">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400/50" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400/50" /><div className="w-2.5 h-2.5 rounded-full bg-green-400/50" /></div>
                  <span className="text-[10px] 2xl:text-xs text-emerald-400 font-medium ml-2">Factu.me AI</span>
                </div>
                <div className="p-5 2xl:p-7 space-y-4 font-mono text-xs 2xl:text-sm">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center flex-shrink-0"><Mic className="w-3.5 h-3.5 text-emerald-400" /></div>
                    <div className="bg-slate-800/60 rounded-2xl rounded-tl-none px-4 py-2.5 text-slate-300 max-w-[90%] border border-white/[0.04] 2xl:text-sm">
                      &quot;Facture pour Dupont, 5 jours de dev à 600€ HT, TVA 20%, ajoute 2 jours conseil à 400€&quot;
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-emerald-400" /></div>
                    <div className="space-y-2 max-w-[90%]">
                      <div className="bg-slate-800/60 rounded-2xl rounded-tl-none px-4 py-2 text-emerald-400 border border-white/[0.04]">Analyse en cours...</div>
                      <div className="bg-slate-800/60 rounded-2xl rounded-tl-none px-4 py-3 text-slate-300 space-y-1.5 border border-white/[0.04]">
                        {['Client : Dupont Consulting SAS', 'Développement — 5j x 600€', 'Conseil — 2j x 400€', 'TVA 20% appliquée'].map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3" /><span className="text-[11px] 2xl:text-xs">{t}</span></div>
                        ))}
                        <div className="flex items-center gap-1.5 text-emerald-300 font-semibold pt-1 border-t border-white/[0.06]"><Zap className="w-3 h-3 text-emerald-400" /><span className="text-[11px] 2xl:text-xs">FACT-2026-0042 créée</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </R>

            {/* Text */}
            <div className="space-y-8">
              <R x={40} y={0}>
                <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-3">Propulsé par l&apos;IA</p>
                <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-medium tracking-tighter text-white leading-[1.1] mb-6">Dites-le, l&apos;IA<br />le fait pour vous</h2>
                <div className="space-y-5">
                  {[
                    { icon: Mic, title: 'Dictée vocale', desc: 'Parlez naturellement, l\'IA remplit tous les champs.' },
                    { icon: Type, title: 'Génération textuelle', desc: 'Tapez en langage naturel, descriptions automatiques.' },
                    { icon: Pencil, title: 'Modification intelligente', desc: '"Ajoute 2 jours" — l\'IA comprend et modifie.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center flex-shrink-0"><item.icon className="w-5 h-5 2xl:w-6 2xl:h-6 text-emerald-400" /></div>
                      <div><h3 className="font-semibold text-sm 2xl:text-base text-white mb-1">{item.title}</h3><p className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-500">{item.desc}</p></div>
                    </div>
                  ))}
                </div>
              </R>
            </div>
          </div>
        </div>

        {/* Gradient overlap vers Timeline */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none z-10" />
      </section>

      {/* ════════════ TIMELINE ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden">
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Comment ça marche</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-medium tracking-tighter text-white leading-[1.1]">Opérationnel en quelques minutes</h2>
            </R>
          </div>

          <div className="relative max-w-4xl 2xl:max-w-5xl mx-auto">
            <div className="absolute left-[23px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-slate-800 via-emerald-500/30 to-slate-800" />

            <div className="space-y-12 md:space-y-16 2xl:space-y-20">
              {steps.map((step, i) => (
                <div key={i} className={cn('relative flex items-start gap-8', i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse')}>
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-950 z-10 shadow-lg shadow-emerald-500/30" />
                  <R delay={i * 0.1} x={i % 2 === 0 ? -30 : 30} y={0} className={cn('ml-12 md:ml-0 md:w-[calc(50%-2rem)]', i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left')}>
                    <span className="text-emerald-400 font-mono text-xs 2xl:text-sm font-bold">{step.num}</span>
                    <h3 className="text-lg 2xl:text-xl font-semibold text-white mt-1 mb-2">{step.title}</h3>
                    <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-500">{step.desc}</p>
                  </R>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-[rgb(15,23,42)] pointer-events-none z-10" />
      </section>

      {/* ════════════ TESTIMONIALS (MODIF 2: smooth) ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden" style={{ background: 'rgb(15,23,42)' }}>
        <div className={`${LC}`}>
          <div className="max-w-2xl 2xl:max-w-3xl mb-16">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Témoignages</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-medium tracking-tighter text-white leading-[1.1]">Ce qu&apos;ils en disent</h2>
            </R>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7">
            {testimonials.map((t, i) => (
              <R key={i} delay={i * 0.08}>
                <div className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 md:p-8 2xl:p-10 h-full flex flex-col transition-all duration-500 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1">
                  <div className="flex gap-0.5 mb-4">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-amber-400 fill-amber-400" />)}</div>
                  <p className="text-sm 2xl:text-base 2xl:leading-relaxed text-slate-400 flex-grow mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="w-9 h-9 2xl:w-11 2xl:h-11 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs 2xl:text-sm flex items-center justify-center">{t.name.charAt(0)}</div>
                    <div><div className="font-semibold text-sm 2xl:text-base text-white">{t.name}</div><div className="text-[11px] 2xl:text-xs text-slate-500">{t.role}</div></div>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none z-10" />
      </section>

      {/* ════════════ PRICING — BorderBeam (MODIF 2: smooth) ════════════ */}
      <section id="pricing" className="relative py-24 md:py-40 2xl:py-48 overflow-hidden">
        <div className={`${LC}`}>
          <div className="text-center mb-14 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">Tarifs transparents</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-medium tracking-tighter text-white mb-4">Choisissez votre plan</h2>
              <p className="text-base 2xl:text-lg text-slate-500">Sans engagement. Évoluez quand vous voulez.</p>
            </R>

            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setBilling('monthly')} className={cn('px-4 py-2 rounded-2xl text-sm 2xl:text-base font-semibold transition-all', billing === 'monthly' ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white')}>Mensuel</button>
              <button onClick={() => setBilling('yearly')} className={cn('px-4 py-2 rounded-2xl text-sm 2xl:text-base font-semibold transition-all', billing === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white')}>
                Annuel <span className="text-xs opacity-70">(-20%)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 2xl:gap-7 max-w-5xl 2xl:max-w-6xl mx-auto items-start">
            {plans.map((plan, i) => (
              <R key={i} delay={i * 0.06} y={plan.popular ? 0 : 8}>
                <div className={cn(
                  'relative bg-slate-900/40 border rounded-3xl p-7 2xl:p-9 flex flex-col h-full transition-all duration-500',
                  plan.popular
                    ? 'border-emerald-500/40 scale-100 md:scale-105 shadow-xl shadow-emerald-500/15 z-10'
                    : 'border-white/[0.06] hover:border-white/10'
                )}>
                  {plan.popular && (
                    <>
                      <BorderBeam duration={8} size={220} borderWidth={2} />
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-emerald-500 text-white text-[10px] 2xl:text-xs font-bold px-3 py-1 rounded-full">Populaire</span>
                      </div>
                    </>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl 2xl:text-2xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-xs 2xl:text-sm text-slate-500 mb-4">{plan.tag}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl 2xl:text-5xl font-extrabold text-white tracking-tight">{billing === 'monthly' ? plan.price : plan.yearly}</span>
                      <span className="text-sm 2xl:text-base text-slate-500">/mois</span>
                    </div>
                    {billing === 'yearly' && <p className="text-xs 2xl:text-sm text-emerald-400 font-medium mt-1">Économisez sur l&apos;annuel</p>}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm 2xl:text-base"><Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-400 flex-shrink-0" /><span className="text-slate-400">{f}</span></li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.name.toLowerCase()}&billing=${billing}`} className={cn('block text-center font-semibold py-3 2xl:py-3.5 rounded-2xl text-sm 2xl:text-base transition-all duration-300 active:scale-95', plan.popular ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25' : 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]')}>
                    Essai 7 jours gratuit
                  </Link>
                </div>
              </R>
            ))}
          </div>

          <R>
            <p className="text-center text-xs 2xl:text-sm text-slate-600 mt-8 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />Données en France · SSL · RGPD · Annulation en un clic
            </p>
          </R>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-[rgb(15,23,42)] pointer-events-none z-10" />
      </section>

      {/* ════════════ FAQ (MODIF 2: smooth) ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden" style={{ background: 'rgb(15,23,42)' }}>
        <div className={`max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32`}>
          <div className="mb-14 2xl:mb-20">
            <R>
              <p className="text-[11px] 2xl:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">FAQ</p>
              <h2 className="text-4xl md:text-5xl 2xl:text-7xl font-medium tracking-tighter text-white">Questions fréquentes</h2>
            </R>
          </div>
          <div className="space-y-3 2xl:space-y-4">
            {faqItems.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none z-10" />
      </section>

      {/* ════════════ CTA FINAL — Glow immense (MODIF 2: smooth) ════════════ */}
      <section className="relative py-24 md:py-40 2xl:py-48 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] 2xl:w-[900px] h-[600px] 2xl:h-[900px] bg-emerald-500/15 blur-[120px] 2xl:blur-[180px] rounded-full" />
        <div className={`max-w-3xl 2xl:max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-20 2xl:px-32 text-center relative z-10`}>
          <R y={0}>
            <h2 className="text-4xl md:text-6xl 2xl:text-8xl font-medium tracking-tighter text-white leading-[1.1] mb-6 2xl:mb-8">
              Prêt à en finir avec<br /><span className="text-emerald-400">la paperasse ?</span>
            </h2>
            <p className="text-lg 2xl:text-xl 2xl:leading-relaxed text-slate-500 mb-10 2xl:mb-12 max-w-lg 2xl:max-w-2xl mx-auto">Rejoignez 2 000+ entrepreneurs qui ont repris le contrôle de leur facturation.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <ShimmerButton onClick={() => window.location.href = '/register'} className="rounded-full px-8 py-4 2xl:px-10 2xl:py-5 text-base 2xl:text-lg" background="rgba(16, 185, 129, 1)">
                Commencer gratuitement <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </ShimmerButton>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white px-8 py-4 2xl:px-10 2xl:py-5 rounded-full text-base 2xl:text-lg font-medium transition-all duration-300">
                Se connecter
              </Link>
            </div>
            <p className="text-xs 2xl:text-sm text-slate-600 mt-8">Sans engagement · Annulation en un clic</p>
          </R>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="relative py-14 md:py-20 2xl:py-24 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className={`${LC}`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 2xl:gap-12 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/logo-lg.png" alt="Factu.me" width={38} height={38} className="rounded-lg" />
                <span className="text-lg 2xl:text-xl font-bold text-white">Factu<span className="text-emerald-400">.me</span></span>
              </Link>
              <p className="text-xs 2xl:text-sm text-slate-600 max-w-xs leading-relaxed mb-4">La plateforme de facturation 100% française, propulsée par l&apos;IA.</p>
              <div className="flex gap-2">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 2xl:w-9 2xl:h-9 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"><Icon className="w-3.5 h-3.5 text-slate-600" /></a>
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
                <h4 className="font-semibold text-xs 2xl:text-sm text-slate-400 mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('#') ? (
                        <a href={href} onClick={(e) => scrollTo(e, href)} className="text-xs 2xl:text-sm text-slate-600 hover:text-emerald-400 transition-colors">{label}</a>
                      ) : (
                        <Link href={href} className="text-xs 2xl:text-sm text-slate-600 hover:text-emerald-400 transition-colors">{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs 2xl:text-sm text-slate-700">2026 Factu.me. Fait en France.</p>
            <div className="flex items-center gap-1.5 text-[11px] 2xl:text-xs text-slate-700"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Opérationnel</div>
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
    <div className="bg-slate-900/30 border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-500 hover:border-white/10">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 2xl:p-6 text-left">
        <span className="font-semibold text-sm 2xl:text-base text-white pr-4">{question}</span>
        <ChevronDown className={cn('w-4 h-4 2xl:w-5 2xl:h-5 text-slate-500 flex-shrink-0 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cn('overflow-hidden transition-all duration-400', open ? 'max-h-40 px-5 2xl:px-6 pb-5 2xl:pb-6' : 'max-h-0')}>
        <p className="text-sm 2xl:text-base text-slate-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
