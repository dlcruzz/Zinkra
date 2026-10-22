'use client';
import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

/**
 * Tela de carregamento rápida (menos de 1 s), só na primeira visita.
 * O script no <head> (layout.tsx) marca html[data-loader="on"] antes da primeira pintura,
 * então não existe "piscada" do site antes da tela de carregamento.
 */
export default function Loader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const on = document.documentElement.dataset.loader === 'on';
    if (!on) {
      setShow(false);
      return;
    }
    try {
      localStorage.setItem('zk-visited', '1');
    } catch {
      /* navegação privada: tudo bem */
    }
    const t = setTimeout(() => {
      setShow(false);
      document.documentElement.dataset.loader = 'done';
    }, 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <m.div
          id="zk-loader"
          aria-hidden
          className="fixed inset-0 z-[95] items-center justify-center bg-bg"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          <m.span
            className="font-brand text-5xl font-bold tracking-tightest md:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-brand">Z</span>inkra<span className="text-brand">.</span>
          </m.span>
        </m.div>
      )}
    </AnimatePresence>
  );
}
