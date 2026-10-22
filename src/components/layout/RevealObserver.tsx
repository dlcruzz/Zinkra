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
    // Reserva: depois de saltos de rolagem (âncoras), revela o que já está na tela
    let t: ReturnType<typeof setTimeout>;
    const sweep = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-in), .split:not(.split-now):not(.is-in)').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
        });
      }, 200);
    };
    window.addEventListener('scroll', sweep, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', sweep);
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
