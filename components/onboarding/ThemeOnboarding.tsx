'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Check, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useThemeStore } from '@/stores/themeStore';

/**
 * GUARDIAN (CIBLE 1) — Étape 0 de l'inscription : choix du thème (Clair / Sombre).
 *
 * Premier écran du parcours de création de compte, AVANT le formulaire email/MDP.
 * - Affiche deux grandes cartes preview (mini-facture dans chaque thème).
 * - Applique le thème IMMÉDIATEMENT (themeStore → localStorage + classe .dark) :
 *   l'écran lui-même et tout le parcours suivant s'adaptent en direct.
 * - La préférence est persistée côté Supabase (profiles.theme_preference) à la
 *   création du compte (signUp metadata → trigger handle_new_user).
 */
type Choice = 'light' | 'dark';

export function ThemeOnboarding({ onDone }: { onDone: (theme: Choice) => void }) {
  const { setTheme } = useThemeStore();
  const [selected, setSelected] = useState<Choice | null>(null);

  const choose = (t: Choice) => {
    setSelected(t);
    setTheme(t); // application live (localStorage + .dark sur <html>)
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-[#09090B] transition-colors duration-500 overflow-hidden">
      {/* Fond animé theme-aware */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[120px]"
          style={{ background: 'rgba(16,185,129,0.12)', animation: 'blob 8s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] blur-[100px]"
          style={{ background: 'rgba(20,184,166,0.08)', animation: 'blob 8s ease-in-out infinite 2s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/logo-lg.png"
            alt="Factu.me"
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl"
            priority
            style={{ borderRadius: '12px' }}
          />
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">Factu</span>
            <span className="text-xl font-black text-emerald-500 dark:text-emerald-400">.me</span>
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Bienvenue sur Factu.me
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Choisissez votre thème préféré. Vous pourrez le changer à tout moment dans vos paramètres.
          </p>
        </div>

        {/* Deux cartes preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ThemeCard
            theme="light"
            selected={selected === 'light'}
            onSelect={() => choose('light')}
          />
          <ThemeCard
            theme="dark"
            selected={selected === 'dark'}
            onSelect={() => choose('dark')}
          />
        </div>

        {/* Continuer */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && onDone(selected)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.97]"
          >
            Continuer
            <ArrowRight size={16} />
          </button>
          <p className="mt-4 text-xs text-slate-500 dark:text-zinc-500">
            Vos informations d'entreprise viendront juste après.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ——— Carte preview : mini-facture dans le thème choisi ——— */
function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: Choice;
  selected: boolean;
  onSelect: () => void;
}) {
  const isLight = theme === 'light';

  // Palette de la mini-facture selon le thème simulé
  const cardBg = isLight ? 'bg-white' : 'bg-[#0F0F12]';
  const cardBorder = isLight ? 'border-gray-200' : 'border-white/[0.08]';
  const labelText = isLight ? 'text-gray-400' : 'text-zinc-500';
  const lineBg = isLight ? 'bg-gray-100' : 'bg-white/[0.06]';
  const lineBg2 = isLight ? 'bg-gray-200' : 'bg-white/[0.10]';
  const totalText = isLight ? 'text-gray-900' : 'text-white';

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`relative text-left rounded-2xl p-5 border-2 transition-all ${
        selected
          ? 'border-emerald-500 ring-4 ring-emerald-500/15'
          : 'border-slate-200 dark:border-white/[0.08] hover:border-emerald-400/50'
      } ${isLight ? 'bg-white' : 'bg-[#0F0F12]'}`}
      aria-pressed={selected}
    >
      {/* Pastille sélection */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-10"
        >
          <Check size={15} className="text-white" strokeWidth={3} />
        </motion.div>
      )}

      {/* En-tête carte */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isLight ? (
            <Sun size={18} className="text-amber-500" />
          ) : (
            <Moon size={18} className="text-emerald-400" />
          )}
          <span className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {isLight ? 'Mode Clair' : 'Mode Sombre'}
          </span>
        </div>
      </div>

      {/* Mini-facture preview */}
      <div className={`rounded-xl p-3.5 border ${cardBg} ${cardBorder}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`h-2.5 w-14 rounded ${lineBg2}`} />
          <div className="h-4 w-12 rounded bg-emerald-500" />
        </div>
        <div className="space-y-1.5 mb-3">
          <div className={`h-1.5 w-full rounded ${lineBg}`} />
          <div className={`h-1.5 w-4/5 rounded ${lineBg}`} />
          <div className={`h-1.5 w-2/3 rounded ${lineBg}`} />
        </div>
        <div className={`pt-2 border-t ${isLight ? 'border-gray-100' : 'border-white/[0.06]'} flex items-end justify-between`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}>Total</span>
          <span className={`text-base font-black ${totalText}`}>
            1 240<span className="text-emerald-500"> €</span>
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default ThemeOnboarding;
