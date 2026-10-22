'use client';
import { useEffect, useRef } from 'react';

/**
 * Faixa infinita de palavras. A velocidade base é lenta e acelera conforme a rolagem da página.
 * Quando há preferência por menos movimento, a faixa fica parada.
 */
export default function Marquee({ items, className = '' }: { items: string[]; className?: string }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let x = 0;
    let last = performance.now();
    let lastY = window.scrollY;
    let boost = 0;
    let dir = 1;
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      // aceleração suave que decai quando o usuário para de rolar
      boost += (Math.min(Math.abs(delta), 80) * 0.12 - boost) * 0.1;
      if (delta !== 0) dir = delta > 0 ? 1 : -1;
      const half = el.scrollWidth / 2;
      x -= (0.045 + boost * 0.06) * dt * dir;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      el.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const row = (suffix: string) =>
    items.map((t, i) => (
      <span key={suffix + i} className="flex shrink-0 items-center gap-8 pr-8 md:gap-14 md:pr-14">
        <span className="display text-[clamp(2.5rem,7vw,6rem)] leading-none">{t}</span>
        <span aria-hidden className="h-3 w-3 shrink-0 rounded-full bg-brand md:h-4 md:w-4" />
      </span>
    ));

  return (
    <div className={`overflow-hidden border-y border-line py-8 md:py-12 ${className}`} aria-label={items.join(', ')} role="group">
      <div ref={track} className="flex w-max will-change-transform" aria-hidden>
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
