'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * Cursor personalizado: círculo verde que cresce sobre links e mostra "Ver" em projetos e vídeos.
 * Marque um elemento com data-cursor="ver" (ou "play") para mudar o rótulo.
 * Só liga com mouse e sem preferência por menos movimento.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add('has-cursor');
    return () => document.documentElement.classList.remove('has-cursor');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = dot.current;
    if (!el) return;
    gsap.set(el, { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const xTo = gsap.quickTo(el, 'x', { duration: 0.25, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.25, ease: 'power3.out' });
    const scaleTo = gsap.quickTo(el, 'scale', { duration: 0.4, ease: 'power3.out' });

    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      el.style.opacity = '1';
    };
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const special = t.closest<HTMLElement>('[data-cursor]');
      if (special) {
        setLabel(special.dataset.cursor === 'play' ? 'Play' : 'Ver');
        scaleTo(1);
        return;
      }
      setLabel('');
      if (t.closest('a, button, input, textarea, select, summary, [role="button"]')) scaleTo(0.42);
      else scaleTo(0.18);
    };
    const leaveDoc = () => (el.style.opacity = '0');

    scaleTo(0.18);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    document.documentElement.addEventListener('pointerleave', leaveDoc);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      document.documentElement.removeEventListener('pointerleave', leaveDoc);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] flex h-24 w-24 items-center justify-center rounded-full bg-brand mix-blend-normal"
      style={{ opacity: 0 }}
    >
      <span className="text-sm font-semibold text-[#0A0C0B]">{label}</span>
    </div>
  );
}
