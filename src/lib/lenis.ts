import type Lenis from 'lenis';

/** Referência única da rolagem suave, para outros componentes poderem pausar ou rolar. */
let instance: Lenis | null = null;
export const setLenis = (l: Lenis | null) => {
  instance = l;
};
export const getLenis = () => instance;

export function scrollToTop() {
  if (instance) instance.scrollTo(0, { duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
