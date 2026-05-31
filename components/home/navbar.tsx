'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, LogIn, Menu, Zap } from 'lucide-react';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowCta(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll);
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
      {/* Progress bar */}
      <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 z-[100] origin-left" style={{ width: scrolled ? '100%' : '0%', transition: 'width 0.3s' }} />

      {/* Navbar */}
      <nav className={`fixed top-2 sm:top-3 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 z-50 backdrop-blur-2xl bg-white/90 rounded-full border transition-all duration-500 sm:max-w-[680px] lg:max-w-[800px] px-3 sm:px-5 py-2.5 ${scrolled ? 'border-brand-200/60 shadow-lg shadow-brand-500/8' : 'border-brand-100/30 shadow-md shadow-black/[0.03]'}`}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo-lg.png" alt="Factu.me" width={44} height={44} className="w-11 h-11 rounded-xl shadow-md" priority style={{ borderRadius: '12px' }} />
            <span className="text-base sm:text-lg font-bold tracking-tight">Factu<span className="text-brand-500">.me</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#features" onClick={(e) => scrollTo(e, '#features')} className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Fonctionnalités</a>
            <a href="#ai" onClick={(e) => scrollTo(e, '#ai')} className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">IA</a>
            <a href="#tarifs" onClick={(e) => scrollTo(e, '#tarifs')} className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Tarifs</a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors px-2.5 py-1.5 rounded-full hover:bg-brand-50">
              <LogIn className="w-4 h-4" /><span>Connexion</span>
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3.5 py-1.5 rounded-full transition-all shadow-md shadow-brand-500/20 active:scale-[0.97]">
              <span className="hidden sm:inline">Commencer gratuitement</span><span className="sm:hidden">Commencer</span><ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-1.5 rounded-full hover:bg-brand-50 transition-colors">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 left-2 right-2 z-50 md:hidden backdrop-blur-2xl bg-white/95 rounded-2xl border border-brand-100/30 shadow-xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {[
                { label: 'Fonctionnalités', href: '#features' },
                { label: 'IA', href: '#ai' },
                { label: 'Tarifs', href: '#tarifs' },
              ].map((item) => (
                <a key={item.href} href={item.href} onClick={(e) => scrollTo(e, item.href)} className="block text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 py-2.5 px-3 rounded-xl transition-colors">
                  {item.label}
                </a>
              ))}
              <div className="pt-2 border-t border-slate-100 mt-1">
                <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 py-2.5 px-3 rounded-xl transition-colors">
                  <LogIn className="w-4 h-4" />Se connecter
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky mobile CTA */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 p-3 transition-transform duration-300 sm:hidden ${showCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <a href="#tarifs" onClick={(e) => scrollTo(e, '#tarifs')} className="flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3 rounded-2xl shadow-xl shadow-brand-500/30 text-sm">
          <Zap className="w-4 h-4" />Commencer gratuitement
        </a>
      </div>

      {/* Sticky desktop CTA */}
      <AnimatePresence>
        {showCta && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="hidden sm:block fixed bottom-20 right-6 z-40">
            <Link href="/register" className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-brand-500/30 text-sm transition-all active:scale-95">
              <Zap className="w-4 h-4" />Commencer gratuitement
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
