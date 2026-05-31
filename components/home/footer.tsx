'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Zap, Twitter, Linkedin, Github } from 'lucide-react';

export function Footer() {
  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.querySelector(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
  };

  return (
    <footer className="bg-brand-950 text-white border-t border-brand-900 py-14 sm:py-20">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image src="/logo-lg.png" alt="Factu.me" width={44} height={44} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl" />
              <span className="text-lg sm:text-xl font-bold">Factu<span className="text-brand-400">.me</span></span>
            </Link>
            <p className="text-xs sm:text-sm text-brand-200/40 leading-relaxed max-w-xs mb-5">La plateforme de facturation 100% française, propulsée par l&apos;IA.</p>
            <div className="flex items-center gap-2.5">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a key={i} href="#" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-brand-900 hover:bg-brand-800 rounded-lg flex items-center justify-center transition-all active:scale-95">
                  <Icon className="w-4 h-4 text-brand-300/60" />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: 'Produit', links: [
              { label: 'Fonctionnalités', href: '#features', scroll: true },
              { label: 'Tarifs', href: '#tarifs', scroll: true },
              { label: 'IA', href: '#ai', scroll: true },
            ]},
            { title: 'Ressources', links: [
              { label: 'Démo interactive', href: '/demo' },
              { label: 'Blog facturation', href: '/blog' },
              { label: 'Modèles de facture', href: '/modeles-facture' },
              { label: 'Mentions obligatoires', href: '/mentions-obligatoires-facture' },
            ]},
            { title: 'Par statut', links: [
              { label: 'Auto-entrepreneur', href: '/comment-facturer/auto-entrepreneur' },
              { label: 'SASU', href: '/comment-facturer/sasu' },
              { label: 'EURL', href: '/comment-facturer/eurl' },
              { label: 'Tous les statuts', href: '/comment-facturer' },
            ]},
            { title: 'Confiance', links: [
              { label: 'Sécurité', href: '/securite' },
              { label: 'Équipe', href: '/experts' },
              { label: 'Mentions légales', href: '/legal/mentions-legales' },
              { label: 'CGU', href: '/legal/cgu' },
              { label: 'Confidentialité', href: '/legal/confidentialite' },
            ]},
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-bold text-xs sm:text-sm mb-3 text-brand-200">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.scroll ? (
                      <a href={link.href} onClick={(e) => scrollTo(e, link.href)} className="text-xs sm:text-sm text-brand-200/40 hover:text-brand-400 transition-colors">{link.label}</a>
                    ) : (
                      <Link href={link.href} className="text-xs sm:text-sm text-brand-200/40 hover:text-brand-400 transition-colors">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-brand-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-brand-200/25">2026 Factu.me. Fait avec <Zap className="w-3 h-3 inline text-brand-400" /> en France.</p>
          <div className="flex items-center gap-2 text-[11px] text-brand-200/25">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />Opérationnel
          </div>
        </div>
      </div>
    </footer>
  );
}
