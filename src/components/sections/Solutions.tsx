'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Reveal from '@/components/ui/Reveal';
import SplitText from '@/components/ui/SplitText';
import { LoopVideo, MediaFallback } from '@/components/ui/Media';
import { ArrowIcon } from '@/components/ui/Button';
import { SolucaoIcon } from '@/components/ui/Icons';
import { solucoes, type Solucao } from '@/data/solucoes';

/** Cartão que inclina em 3D acompanhando o mouse, com brilho verde seguindo o cursor. */
function Card({ s, className }: { s: Solucao; className: string }) {
  const card = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState(false);

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = card.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(el, { rotateY: (px - 0.5) * 10, rotateX: (0.5 - py) * 10, duration: 0.5, ease: 'power3.out', transformPerspective: 900 });
  };
  const onLeave = () => {
    setHover(false);
    if (card.current) gsap.to(card.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1,0.6)' });
  };

  return (
    <Link
      ref={card}
      href={`/solucoes/${s.slug}`}
      data-cursor="ver"
      onPointerMove={onMove}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={onLeave}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{ transformStyle: 'preserve-3d' }}
      className={`group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl border border-line bg-surface p-7 will-change-transform md:min-h-[420px] md:p-9 ${className}`}
    >
      {/* fundo: vídeo em loop (toca quando visível) ou reserva */}
      <div className="absolute inset-0 -z-20">
        <MediaFallback />
        <LoopVideo src={s.video} opacity={0.55} play={hover ? true : undefined} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
      {/* brilho verde que segue o cursor */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgb(var(--brand)/0.28), transparent 60%)' }}
      />

      <div className="absolute right-6 top-6 text-brand md:right-8 md:top-8">
        <SolucaoIcon slug={s.slug} />
      </div>

      <div className="relative translate-y-3 transition-transform duration-500 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0">
        <h3 className="display text-[clamp(1.9rem,3vw,2.8rem)] text-white">{s.titulo}</h3>
        <p className="mt-3 max-w-md text-white/75">{s.frase}</p>
        <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-[#0A0C0B] opacity-0 transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100 -translate-x-3">
          <ArrowIcon />
          <span className="sr-only">Ver {s.titulo}</span>
        </span>
      </div>
    </Link>
  );
}

// Padrão da grade (12 colunas): 7/5, 5/7, 4/4/4
const SPANS = ['md:col-span-7', 'md:col-span-5', 'md:col-span-5', 'md:col-span-7', 'md:col-span-4', 'md:col-span-4', 'md:col-span-4'];

export default function Solutions() {
  return (
    <section id="solucoes" className="py-24 md:py-40">
      <div className="container-x">
        <div className="mb-14 md:mb-20">
          <Reveal><p className="eyebrow mb-5">Soluções</p></Reveal>
          <SplitText text="Tudo que o seu negócio precisa para crescer." className="display max-w-5xl text-[clamp(2.6rem,7vw,6.5rem)]" highlight={['crescer']} />
        </div>
        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          {solucoes.map((s, i) => (
            <Reveal key={s.slug} delay={(i % 3) * 0.08} className={SPANS[i] ?? 'md:col-span-4'}>
              <Card s={s} className="h-full" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

