'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import Button from '@/components/ui/Button';
import { LoopVideo } from '@/components/ui/Media';
import { useVideoModal } from '@/components/layout/VideoModal';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useEnv';
import { media } from '@/data/media';
import { whatsappLink } from '@/data/site';

// A cena 3D é carregada à parte, só no navegador e bem depois da primeira pintura.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

const TITULO = 'Tecnologia que faz o seu negócio vender mais.';
const DESTAQUE = ['vender', 'mais.'];

const LINHAS_MOBILE = ['Tecnologia que', 'faz o seu', 'negócio vender', 'mais.'];
const LINHAS_DESKTOP = ['Tecnologia que', 'faz o seu negócio', 'vender mais.'];

/** Cada linha é um bloco sem quebra; cada palavra sobe de dentro de uma máscara (animação em CSS). */
function Linhas({ linhas, className }: { linhas: string[]; className: string }) {
  let n = 0;
  return (
    <span aria-hidden className={className}>
      {linhas.map((linha) => (
        <span key={linha} className="block whitespace-nowrap">
          {linha.split(' ').map((w, i, arr) => {
            const idx = n++;
            return (
              <span key={i} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                <span className={`rise ${DESTAQUE.includes(w.toLowerCase()) ? 'text-brand' : ''}`} style={{ ['--d' as string]: '0.15s', ['--i' as string]: idx }}>
                  {w}
                  {i < arr.length - 1 ? ' ' : ''}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Abertura: cena 3D ao fundo, frase gigante, subtítulo, dois botões e indicador de rolagem.
 * O texto usa animações em CSS puro (classes .rise e .fade-up) para aparecer sem esperar o JavaScript.
 */
export default function Hero() {
  const { open } = useVideoModal();
  const videoBtn = useRef<HTMLButtonElement>(null);
  const mobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const [scene, setScene] = useState(false);

  useEffect(() => {
    if (reduced || !hasWebGL()) return;
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      setScene(true);
    };
    // A cena entra na primeira interação (mouse, toque, rolagem ou tecla) ou depois de 5 s.
    // Assim o texto e a rolagem carregam leves, e a cena aparece quando já dá para aproveitá-la.
    const events = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    const timer = setTimeout(start, 5000);
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, start));
    };
  }, [reduced]);

  return (
    <section data-theme="dark" className="relative flex min-h-[100svh] items-end overflow-hidden bg-bg text-fg md:items-center">
      {/* fundo: degradê, vídeo opcional e cena 3D */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_60%_at_75%_40%,rgb(var(--brand)/0.16),transparent_70%),radial-gradient(50%_50%_at_10%_90%,rgb(var(--brand-dark)/0.35),transparent_70%)]" />
      <LoopVideo src={media.video.heroLoop} poster={media.image.heroPoster} opacity={0.22} className="mix-blend-screen" />
      {scene && (
        <m.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}>
          <HeroScene mobile={mobile} />
        </m.div>
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--bg)/0.85)_0%,rgb(var(--bg)/0.35)_55%,transparent_80%)]" />

      <div className="container-x relative z-10 pb-24 pt-36 md:pb-20">
        <p className="eyebrow fade-up mb-6" style={{ ['--d' as string]: '0.1s' }}>
          Software house · São Paulo
        </p>

        {/* Linhas fixas por tamanho de tela: o texto nunca re-quebra quando a fonte carrega (evita salto de layout) */}
        <h1 aria-label={TITULO} className="display text-[clamp(2rem,9vw,5.5rem)] md:text-[clamp(3.4rem,8vw,9rem)]">
          <Linhas linhas={LINHAS_MOBILE} className="md:hidden" />
          <Linhas linhas={LINHAS_DESKTOP} className="hidden md:block" />
        </h1>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-fg/70 md:text-xl">
          Criamos sites, landing pages, sistemas, PDV, sistemas financeiros e SaaS sob medida para empresas que querem crescer.
        </p>

        <div className="fade-up mt-10 flex flex-wrap items-center gap-4" style={{ ['--d' as string]: '0.5s' }}>
          <span data-cursor="play" className="inline-block">
            <button
              ref={videoBtn}
              type="button"
              onClick={() => open(videoBtn.current?.getBoundingClientRect())}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-brand px-3 py-3 pr-7 text-base font-semibold text-[#0A0C0B] transition-transform duration-500 ease-out hover:scale-[1.03]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0C0B] text-brand transition-transform duration-500 group-hover:scale-110">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
              </span>
              Ver vídeo da Zinkra
            </button>
          </span>
          <Button href={whatsappLink('Olá! Vim pelo site da Zinkra e quero conversar sobre um projeto.')} external variant="outline" size="lg">
            Falar com a gente
          </Button>
        </div>
      </div>

      {/* indicador de rolagem */}
      <div aria-hidden className="fade-up absolute bottom-8 right-6 z-10 hidden items-center gap-4 md:flex md:right-14" style={{ ['--d' as string]: '1.5s' }}>
        <span className="text-xs uppercase tracking-[0.2em] text-fg/60 [writing-mode:vertical-rl]">Role para explorar</span>
        <span className="relative h-16 w-px overflow-hidden bg-fg/20">
          <span className="absolute inset-x-0 top-0 h-full bg-brand" style={{ animation: 'scroll-hint 2.2s cubic-bezier(.65,0,.35,1) infinite' }} />
        </span>
      </div>
    </section>
  );
}
