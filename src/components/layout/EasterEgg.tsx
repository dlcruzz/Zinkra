'use client';
import { useEffect, useRef } from 'react';

/** Easter egg: digite "zinkra" em qualquer lugar da página e uma chuva de partículas verdes cai. */
export default function EasterEgg() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let buffer = '';
    let raf = 0;

    const rain = () => {
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      const parts = Array.from({ length: 140 }, () => ({
        x: Math.random() * c.width,
        y: -Math.random() * c.height,
        v: 3 + Math.random() * 6,
        r: 1.5 + Math.random() * 3.5,
        a: 0.5 + Math.random() * 0.5,
      }));
      const start = performance.now();
      const draw = (t: number) => {
        ctx.clearRect(0, 0, c.width, c.height);
        for (const p of parts) {
          p.y += p.v;
          ctx.beginPath();
          ctx.fillStyle = `rgba(21,196,90,${p.a})`;
          ctx.shadowColor = '#15C45A';
          ctx.shadowBlur = 12;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t - start < 3500) raf = requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, c.width, c.height);
      };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      buffer = (buffer + e.key.toLowerCase()).slice(-6);
      if (buffer === 'zinkra') {
        buffer = '';
        rain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[80]" />;
}
