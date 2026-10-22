'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { AnimatePresence, m } from 'framer-motion';
import { MediaImage } from '@/components/ui/Media';
import Reveal from '@/components/ui/Reveal';
import type { Projeto } from '@/data/projetos';

/**
 * Lista grande de projetos. No computador, passar o mouse numa linha faz a imagem flutuar seguindo o cursor.
 * No celular vira uma lista de cartões com imagem.
 */
export default function ProjectList({ itens }: { itens: Projeto[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const floater = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = floater.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
    gsap.set(el, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const rTo = gsap.quickTo(el, 'rotation', { duration: 0.8, ease: 'power3.out' });
    let lastX = 0;
    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      rTo(Math.max(-8, Math.min(8, (e.clientX - lastX) * 0.25)));
      lastX = e.clientX;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const ativo = itens.find((p) => p.slug === hover);

  return (
    <>
      {/* Computador: linhas com imagem flutuante */}
      <ul className="hidden border-t border-line md:block" onMouseLeave={() => setHover(null)}>
        {itens.map((p, i) => (
          <li key={p.slug} className="border-b border-line">
            <Reveal delay={i * 0.05} y={24}>
              <Link
                href={`/projetos/${p.slug}`}
                data-cursor="ver"
                onMouseEnter={() => setHover(p.slug)}
                onFocus={() => setHover(p.slug)}
                onBlur={() => setHover(null)}
                className="group relative grid grid-cols-12 items-center gap-4 py-9 transition-[padding] duration-500 ease-out hover:pl-4"
              >
                <span aria-hidden className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-fg/[0.04] transition-transform duration-500 ease-out group-hover:scale-y-100" />
                <span className="col-span-1 text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="display col-span-6 text-[clamp(2rem,4.2vw,4rem)] transition-colors duration-300 group-hover:text-brand">
                  {p.nome}
                </span>
                <span className="col-span-3 text-muted">
                  {p.tipo}
                  {p.conceito && <span className="ml-2 rounded-full border border-brand/40 px-2 py-0.5 text-[11px] uppercase tracking-wider text-brand">Em breve</span>}
                </span>
                <span className="col-span-2 text-right text-muted">{p.ano}</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>

      {/* imagem que segue o cursor */}
      <div ref={floater} aria-hidden className="pointer-events-none fixed left-0 top-0 z-40 hidden md:block">
        <AnimatePresence>
          {ativo && (
            <m.div
              key={ativo.slug}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-[260px] w-[380px] overflow-hidden rounded-2xl border border-line shadow-2xl shadow-black/50"
            >
              <MediaImage src={ativo.imagem} alt="" sizes="380px" label={ativo.nome} />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celular: cartões */}
      <ul className="space-y-6 md:hidden">
        {itens.map((p, i) => (
          <li key={p.slug}>
            <Reveal delay={i * 0.04}>
              <Link href={`/projetos/${p.slug}`} className="block overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="relative aspect-[4/3]">
                  <MediaImage src={p.imagem} alt={`Imagem do projeto ${p.nome}`} sizes="100vw" label={p.nome} />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="display text-3xl">{p.nome}</h3>
                    <span className="mt-1 text-sm text-muted">{p.ano}</span>
                  </div>
                  <p className="mt-2 text-muted">{p.tipo}</p>
                  {p.conceito && <span className="mt-3 inline-block rounded-full border border-brand/40 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-brand">Em breve</span>}
                </div>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </>
  );
}
