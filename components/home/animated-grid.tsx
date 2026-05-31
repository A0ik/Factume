'use client';

import { useEffect, useRef } from 'react';

export function AnimatedGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const isXL = window.innerWidth >= 1280;
    const count = isMobile ? 15 : isXL ? 60 : 35;
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

    const particles: { x: number; y: number; s: number; vx: number; vy: number; o: number; l: number; ml: number }[] = [];
    for (let i = 0; i < count; i++) {
      const l = Math.random() * 250 + 120;
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        s: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
        o: Math.random() * 0.35 + 0.08, l, ml: l,
      });
    }

    const reset = (p: typeof particles[0]) => {
      p.x = Math.random() * w; p.y = Math.random() * h;
      p.s = Math.random() * 1.8 + 0.4;
      p.vx = (Math.random() - 0.5) * 0.2; p.vy = (Math.random() - 0.5) * 0.2;
      p.o = Math.random() * 0.35 + 0.08; p.l = Math.random() * 250 + 120; p.ml = p.l;
    };

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.l--;
        if (p.l <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) reset(p);
        const a = (p.l / p.ml) * p.o;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${a})`;
        ctx.fill();

        if (!isMobile) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = p.x - particles[j].x, dy = p.y - particles[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const maxD = isXL ? 140 : 110;
            if (d < maxD) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(52,211,153,${0.04 * (1 - d / maxD)})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />;
}
