'use client';

import { useRef, useEffect, useState } from 'react';
import { Building2, Code2, Store, Briefcase, Palette, HeartPulse } from 'lucide-react';
import { Marquee } from './marquee';
import { Reveal } from './reveal';

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let cur = 0; const inc = target / 35;
        const t = setInterval(() => { cur += inc; if (cur >= target) { cur = target; clearInterval(t); } setCount(Math.round(cur)); }, 25);
        obs.unobserve(e.target);
      }
    }, { threshold: 0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

export function Stats() {
  return (
    <section className="py-10 sm:py-14 bg-white relative z-10">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { target: 6, label: 'Types de documents', accent: false },
            { target: 6, label: 'Templates PDF', accent: false },
            { target: 3, label: 'secondes', accent: true, prefix: '', suffix: 's', displayText: '3s' },
            { target: 100, label: 'Conforme droit FR', accent: false, suffix: '%' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <Reveal delay={i * 0.08}>
                <div className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight ${s.accent ? 'text-brand-500' : 'text-slate-900'}`}>
                  {s.accent ? s.displayText : <Counter target={s.target} suffix={s.suffix} />}
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">{s.label}</div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Trust() {
  const items = [
    { icon: Building2, label: 'Auto-entrepreneurs' },
    { icon: Code2, label: 'Freelances' },
    { icon: Store, label: 'TPE / PME' },
    { icon: Briefcase, label: 'Consultants' },
    { icon: Palette, label: 'Agences' },
    { icon: HeartPulse, label: 'Santé' },
  ];

  return (
    <section className="py-10 sm:py-12 bg-white border-b border-slate-100">
      <Reveal>
        <p className="text-center text-[11px] text-slate-400 font-medium uppercase tracking-[0.15em] mb-8">Ils nous font confiance</p>
      </Reveal>
      <Marquee speed={35} className="max-w-5xl mx-auto">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 text-slate-300 flex-shrink-0 px-2">
            <Icon className="w-5 h-5" />
            <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
          </div>
        ))}
      </Marquee>
    </section>
  );
}
