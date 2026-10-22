'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from '@/components/ui/Reveal';
import { LoopVideo } from '@/components/ui/Media';
import { EtapaIcon } from '@/components/ui/Icons';
import { media } from '@/data/media';
import { ETAPAS } from '@/data/etapas';

gsap.registerPlugin(ScrollTrigger);

/**
 * Seção fixa na tela: no computador as etapas passam na horizontal enquanto o usuário rola.
 * No celular (ou com menos movimento) vira uma lista vertical simples.
 */
export default function Process() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [ativa, setAtiva] = useState(0);

  // useLayoutEffect: a limpeza precisa rodar ANTES do React remover o DOM, senão o pin-spacer do GSAP quebra a troca de página
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const el = track.current!;
      const dist = () => el.scrollWidth - window.innerWidth;
      const tween = gsap.to(el, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${dist() + window.innerHeight * 0.4}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
            setAtiva(Math.min(ETAPAS.length - 1, Math.floor(self.progress * ETAPAS.length * 0.999)));
          },
        },
      });
      return () => tween.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="processo" className="relative overflow-hidden lg:h-screen">
      {/* vídeo ao fundo com pouca opacidade */}
      <div aria-hidden className="absolute inset-0 -z-10 media-fallback opacity-60" />
      <LoopVideo src={media.video.processoLoop} opacity={0.16} />
      <div aria-hidden className="absolute inset-0 -z-0 bg-gradient-to-b from-bg via-transparent to-bg" />

      <div className="relative flex flex-col lg:h-full lg:justify-center">
        <div className="container-x pt-24 lg:pt-0">
          <Reveal><p className="eyebrow mb-5">Como trabalhamos</p></Reveal>
          <Reveal>
            <h2 className="display max-w-4xl text-[clamp(2.6rem,6.5vw,6rem)]">
              Do primeiro papo ao <span className="text-brand">produto no ar</span>.
            </h2>
          </Reveal>
        </div>

        {/* Computador: trilho horizontal */}
        <div className="mt-14 hidden lg:block">
          <div ref={track} className="flex w-max gap-8 px-[max(3.5rem,calc((100vw-1440px)/2+3.5rem))] pr-[20vw]">
            {ETAPAS.map((e, i) => (
              <article
                key={e.titulo}
                className={`${ativa === i ? 'is-active border-brand/60' : 'border-line'} w-[28vw] max-w-[460px] shrink-0 rounded-3xl border bg-bg/60 p-9 backdrop-blur-md transition-colors duration-500`}
              >
                <div className="flex items-start justify-between text-brand">
                  <EtapaIcon n={i + 1} />
                  <span className="display text-6xl text-fg/15">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="display mt-10 text-3xl">{e.titulo}</h3>
                <p className="mt-4 text-muted">{e.texto}</p>
              </article>
            ))}
          </div>
          <div className="container-x mt-12">
            <div className="h-[2px] w-full bg-line">
              <div ref={bar} className="h-full origin-left bg-brand" style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>
        </div>

        {/* Celular: lista vertical */}
        <ol className="container-x mt-12 space-y-5 pb-24 lg:hidden">
          {ETAPAS.map((e, i) => (
            <li key={e.titulo}>
              <Reveal>
                <article className="is-active rounded-3xl border border-line bg-surface/70 p-6">
                  <div className="flex items-start justify-between text-brand">
                    <EtapaIcon n={i + 1} size={48} />
                    <span className="display text-5xl text-fg/15">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="display mt-6 text-2xl">{e.titulo}</h3>
                  <p className="mt-3 text-muted">{e.texto}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
