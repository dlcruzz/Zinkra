'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { LazyMotion, domAnimation } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setLenis } from '@/lib/lenis';
import { VideoModalProvider } from './VideoModal';
import { PageTransitionProvider } from './PageTransition';
import Cursor from './Cursor';
import ScrollProgress from './ScrollProgress';
import Loader from './Loader';
import EasterEgg from './EasterEgg';
import RevealObserver from './RevealObserver';

gsap.registerPlugin(ScrollTrigger);

/**
 * Junta tudo que é global: rolagem suave (Lenis) ligada ao ScrollTrigger,
 * transição de página, cursor, barra de progresso, tela de carregamento e o easter egg.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Em telas de toque a rolagem nativa é melhor (e mais leve): Lenis só com mouse
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduce || !fine) return;

    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // A cada nova página: volta ao topo e recalcula os gatilhos de rolagem
  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <LazyMotion features={domAnimation}>
    <PageTransitionProvider>
      <VideoModalProvider>
        <RevealObserver />
        <ScrollProgress />
        <Cursor />
        <Loader />
        <EasterEgg />
        {children}
      </VideoModalProvider>
    </PageTransitionProvider>
    </LazyMotion>
  );
}
