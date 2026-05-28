'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search, Ghost, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── Particles Canvas ─── */
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const isXL = window.innerWidth >= 1280;
    const count = isMobile ? 25 : isXL ? 60 : 40;
    let w = 0, h = 0;

    const resize = () => {
      const p = cvs.parentElement;
      if (p) {
        w = cvs.width = p.offsetWidth;
        h = cvs.height = p.offsetHeight;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (cvs.parentElement) ro.observe(cvs.parentElement);

    const ps: {
      x: number; y: number; s: number; vx: number; vy: number;
      o: number; l: number; ml: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const l = Math.random() * 200 + 100;
      ps.push({
        x: Math.random() * w,
        y: Math.random() * h,
        s: Math.random() * (isXL ? 2.5 : 1.5) + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.4 + 0.1,
        l,
        ml: l,
      });
    }

    const reset = (p: typeof ps[0]) => {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.s = Math.random() * (isXL ? 2.5 : 1.5) + 0.5;
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = (Math.random() - 0.5) * 0.3;
      p.o = Math.random() * 0.4 + 0.1;
      p.l = Math.random() * 200 + 100;
      p.ml = p.l;
    };

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      ps.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.l--;

        if (p.l <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          reset(p);
        }

        const a = (p.l / p.ml) * p.o;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(29, 158, 117, ${a})`;
        ctx.fill();

        // Connections
        for (let j = i + 1; j < ps.length; j++) {
          const dx = p.x - ps[j].x;
          const dy = p.y - ps[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < (isXL ? 150 : 120)) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(29, 158, 117, ${0.05 * (1 - d / (isXL ? 150 : 120))})`;
            ctx.lineWidth = isXL ? 0.75 : 0.5;
            ctx.stroke();
          }
        }
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />;
}

/* ─── Floating Elements ─── */
function FloatingElements() {
  const elements = [
    { icon: Ghost, delay: 0, duration: 3, x: -20 },
    { icon: Sparkles, delay: 0.5, duration: 4, x: 20 },
    { icon: Search, delay: 1, duration: 3.5, x: -15 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((elem, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [100, 50, 50, 0],
            x: [elem.x, elem.x + 10, elem.x - 10, elem.x],
          }}
          transition={{
            duration: elem.duration,
            delay: elem.delay,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center backdrop-blur-sm border border-primary/20">
            <elem.icon size={28} className="text-primary/40" strokeWidth={1.5} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── 404 Number Animation ─── */
function Animated404() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative">
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-[180px] sm:text-[220px] md:text-[280px] lg:text-[320px] font-black leading-none tracking-tighter"
        style={{
          background: 'linear-gradient(135deg, #1D9E75 0%, #158A66 50%, #0F6B4F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </motion.h1>

      {/* Floating shadow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 0.3 : 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-75"
      />
    </div>
  );
}

/* ─── Content Variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      <meta name="robots" content="noindex, follow" />
      {/* Particles background */}
      <ParticlesCanvas />

      {/* Floating elements */}
      <FloatingElements />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10 pointer-events-none" />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-20 text-center px-4 max-w-4xl mx-auto"
      >
        {/* 404 Number */}
        <div className="mb-8">
          <Animated404 />
        </div>

        {/* Message */}
        <motion.div variants={itemVariants} className="space-y-6 mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Oups! Page introuvable
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            La page que vous recherchez semble avoir disparu ou n&apos;existe plus.
            <br />
            Pas de souci, nous vous ramenons vers des chemins connus.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary Button */}
          <Link
            href="/"
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 cursor-pointer"
          >
            <Home size={20} strokeWidth={2} />
            <span>Retour à l&apos;accueil</span>
            <motion.span
              className="absolute inset-0 rounded-2xl bg-white/20"
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </Link>

          {/* Secondary Button */}
          <button
            onClick={() => window.history.back()}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
          >
            <ArrowLeft size={20} strokeWidth={2} />
            <span>Page précédente</span>
          </button>
        </motion.div>

        {/* Helpful Links */}
        <motion.div variants={itemVariants} className="mt-16 pt-12 border-t border-gray-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">
            Vous cherchiez peut-être
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { href: '/dashboard', label: 'Tableau de bord' },
              { href: '/documents/factures', label: 'Factures' },
              { href: '/documents/devis', label: 'Devis' },
              { href: '/clients', label: 'Clients' },
              { href: '/help', label: 'Aide' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all duration-200 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
}
