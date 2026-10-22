'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Observador único das revelações (.reveal e .split). Quando o elemento entra na tela,
 * ganha a classe "is-in" e o CSS (globals.css) faz a animação. Roda de novo a cada troca de página.
 */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );
    // espera a nova página entrar no DOM
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.reveal:not(.is-in), .split:not(.split-now):not(.is-in)').forEach((el) => io.observe(el));
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
