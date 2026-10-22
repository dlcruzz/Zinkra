'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

type Ctx = { go: (href: string) => void };
const TransitionContext = createContext<Ctx>({ go: () => undefined });
export const usePageTransition = () => useContext(TransitionContext);

/**
 * Transição de página: uma cortina verde escura sobe, a rota troca por baixo dela e a cortina sai.
 * Intercepta cliques em links internos (<a href="/...">), então funciona com <Link> do Next sem mudar nada neles.
 */
export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle');
  const target = useRef<string | null>(null);
  const busy = useRef(false);

  const go = useCallback(
    (href: string) => {
      if (busy.current) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        router.push(href);
        return;
      }
      busy.current = true;
      target.current = href;
      setPhase('in');
    },
    [router],
  );

  // Cortina cobriu a tela: troca a rota
  const onCovered = () => {
    if (target.current) router.push(target.current);
  };

  // Rota nova chegou: tira a cortina
  useEffect(() => {
    if (phase === 'in' && target.current) {
      const dest = target.current.split('#')[0].split('?')[0];
      if (dest === pathname) {
        setPhase('out');
      }
    }
  }, [pathname, phase]);

  // Segurança: se a rota não trocar em 3s, libera a tela
  useEffect(() => {
    if (phase !== 'in') return;
    const t = setTimeout(() => setPhase('out'), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // Intercepta links internos
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
      if (!href.startsWith('/') || href.startsWith('//')) return;
      const [path, hash] = href.split('#');
      // Mesma página (âncora): deixa o comportamento normal
      if ((path === '' || path === window.location.pathname) && hash !== undefined) return;
      if (path === window.location.pathname) return;
      e.preventDefault();
      go(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [go]);

  return (
    <TransitionContext.Provider value={{ go }}>
      {children}
      <AnimatePresence
        onExitComplete={() => {
          busy.current = false;
          target.current = null;
          setPhase('idle');
        }}
      >
        {phase !== 'idle' && (
          <motion.div
            key="curtain"
            aria-hidden
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07150d]"
            initial={{ y: '100%' }}
            animate={{ y: phase === 'in' ? '0%' : '-100%' }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
            onAnimationComplete={() => {
              if (phase === 'in') onCovered();
              else {
                // cortina saiu por cima: limpa
                busy.current = false;
                target.current = null;
                setPhase('idle');
              }
            }}
          >
            <span className="font-brand text-4xl font-bold tracking-tightest text-white">
              <span className="text-brand">Z</span>inkra<span className="text-brand">.</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
