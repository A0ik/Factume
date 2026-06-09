'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, LogIn, Menu, Zap } from 'lucide-react';

/**
 * Navbar — Floating Island 2026
 *
 * Design: pill-shaped floating nav bar, inspired by Apple's Dynamic Island.
 * Mobile: centered floating pill with glassmorphism, minimal chrome.
 * Desktop: wider floating bar with navigation links.
 *
 * Physics: spring transitions for all state changes.
 * Thumb Zone: CTA sticky at bottom on mobile scroll.
 */

const springPop = { type: 'spring' as const, stiffness: 400, damping: 25 };
const springSlide = { type: 'spring' as const, stiffness: 350, damping: 30 };

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowCta(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.querySelector(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <>
      {/* ═══ Progress bar — reading progress ═══ */}
      <motion.div
        className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 z-[100] origin-left"
        style={{ scaleX: scrolled ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* ═══ FLOATING ISLAND NAVBAR ═══ */}
      <nav className="fixed top-3 left-3 right-3 z-50 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[680px] lg:max-w-[800px]">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className={`
            rounded-full border transition-colors duration-300
            ${scrolled
              ? 'bg-white/85 backdrop-blur-2xl border-emerald-200/60 shadow-lg shadow-emerald-500/8'
              : 'bg-white/60 backdrop-blur-xl border-white/40 shadow-md shadow-black/[0.03]'}
          `}
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Image src="/logo-lg.png" alt="Factu.me" width={36} height={36} className="rounded-lg shadow-sm" priority style={{ borderRadius: '10px' }} />
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Factu<span className="text-emerald-500">.me</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {[
                { label: 'Fonctionnalités', href: '#features' },
                { label: 'IA', href: '#ai' },
                { label: 'Tarifs', href: '#tarifs' },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => scrollTo(e, l.href)}
                  className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors duration-200"
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors px-2.5 py-1.5 rounded-full hover:bg-emerald-50"
              >
                <LogIn className="w-4 h-4" /><span>Connexion</span>
              </Link>
              <motion.div whileTap={{ scale: 0.95 }} transition={springPop}>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-full transition-colors duration-200 shadow-md shadow-emerald-500/25"
                >
                  <span className="hidden sm:inline">Commencer gratuitement</span>
                  <span className="sm:hidden">Commencer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={springPop}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-full hover:bg-emerald-50 transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ═══ Mobile dropdown menu ═══ */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={springSlide}
              className="mt-2 md:hidden backdrop-blur-2xl bg-white/95 rounded-2xl border border-emerald-100/30 shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {[
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'IA', href: '#ai' },
                  { label: 'Tarifs', href: '#tarifs' },
                ].map((item, i) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => scrollTo(e, item.href)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springSlide, delay: i * 0.04 }}
                    className="block text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 py-2.5 px-3 rounded-xl transition-colors"
                  >
                    {item.label}
                  </motion.a>
                ))}
                <div className="pt-2 border-t border-slate-100 mt-1">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 py-2.5 px-3 rounded-xl transition-colors">
                    <LogIn className="w-4 h-4" />Se connecter
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ STICKY MOBILE CTA — Thumb Zone ═══ */}
      <AnimatePresence>
        {showCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-2 shadow-xl shadow-emerald-500/20 border border-emerald-100/50">
              <motion.div whileTap={{ scale: 0.95 }} transition={springPop}>
                <a
                  href="#tarifs"
                  onClick={(e) => scrollTo(e, '#tarifs')}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 text-sm transition-colors"
                >
                  <Zap className="w-4 h-4" />Commencer gratuitement
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Sticky desktop CTA ═══ */}
      <AnimatePresence>
        {showCta && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={springPop}
            className="hidden sm:block fixed bottom-20 right-6 z-40"
          >
            <motion.div whileTap={{ scale: 0.95 }} transition={springPop}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/30 text-sm transition-colors"
              >
                <Zap className="w-4 h-4" />Commencer gratuitement
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
