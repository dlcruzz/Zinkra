'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import SplitText from '@/components/ui/SplitText';
import Button from '@/components/ui/Button';
import { LoopVideo } from '@/components/ui/Media';
import { useVideoModal } from '@/components/layout/VideoModal';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useEnv';
import { media } from '@/data/media';
import { whatsappLink } from '@/data/site';

// A cena 3D é carregada à parte, só no navegador e depois da primeira pintura.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Abertura: cena 3D ao fundo, frase gigante, subtítulo, dois botões e indicador de rolagem. */
export default function Hero() {
  const { open } = useVideoModal();
  const videoBtn = useRef<HTMLButtonElement>(null);
  const mobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const [scene, setScene] = useState(false);
  const [delay, setDelay] = useState(0.15);

  useEffect(() => {
    // Espera a tela de carregamento (se estiver ativa) antes de animar o texto
    setDelay(document.documentElement.dataset.loader === 'on' ? 1.0 : 0.1);
    if (reduced || !hasWebGL()) return;
    const start = () => setScene(true);
    // Carrega a cena quando o navegador está ocioso, para não atrasar o texto
    if ('requestIdleCallback' in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, o?: object) => number }).requestIdleCallback(start, { timeout: 1500 });
      return () => (window as unknown as { cancelIdleCallback: (n: number) => void }).cancelIdleCallback(id);
    }
    const t = setTimeout(start, 400);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <section data-theme="dark" className="relative flex min-h-[100svh] items-end overflow-hidden bg-bg text-fg md:items-center">
      {/* fundo: degradê, vídeo opcional e cena 3D */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_60%_at_75%_40%,rgb(var(--brand)/0.16),transparent_70%),radial-gradient(50%_50%_at_10%_90%,rgb(var(--brand-dark)/0.35),transparent_70%)]" />
      <LoopVideo src={media.video.heroLoop} poster={media.image.heroPoster} opacity={0.22} className="mix-blend-screen" />
      {scene && (
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6, delay: 0.3 }}>
          <HeroScene mobile={mobile} />
        </motion.div>
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--bg)/0.85)_0%,rgb(var(--bg)/0.35)_55%,transparent_80%)]" />

      <div className="container-x relative z-10 pb-24 pt-36 md:pb-20">
        <motion.p
          className="eyebrow mb-6"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay, duration: 0.8 }}
        >
          Software house · São Paulo
        </motion.p>

        <SplitText
          as="h1"
          inView={false}
          delay={delay + 0.1}
          highlight={['vender', 'mais']}
          text="Tecnologia que faz o seu negócio vender mais."
          className="display max-w-[16ch] text-[clamp(2.9rem,9.2vw,9rem)] md:max-w-[13ch]"
        />

        <motion.p
          className="mt-8 max-w-xl text-lg leading-relaxed text-fg/70 md:text-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.9, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Criamos sites, landing pages, sistemas, PDV, sistemas financeiros e SaaS sob medida para empresas que querem crescer.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 1.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>
      </div>

      {/* indicador de rolagem */}
      <motion.div
        aria-hidden
        className="absolute bottom-8 right-6 z-10 hidden items-center gap-4 md:flex md:right-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 1.6 }}
      >
        <span className="text-xs uppercase tracking-[0.2em] text-fg/60 [writing-mode:vertical-rl]">Role para explorar</span>
        <span className="relative h-16 w-px overflow-hidden bg-fg/20">
          <span className="absolute inset-x-0 top-0 h-full bg-brand" style={{ animation: 'scroll-hint 2.2s cubic-bezier(.65,0,.35,1) infinite' }} />
        </span>
      </motion.div>
    </section>
  );
}
