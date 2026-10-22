'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, useInView } from 'framer-motion';
import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';
import { MediaImage } from '@/components/ui/Media';
import { media } from '@/data/media';
import { numeros, type Numero } from '@/data/numeros';

gsap.registerPlugin(ScrollTrigger);

const TEXTO =
  'Entendemos o seu negócio antes de escrever a primeira linha de código. Cada projeto nasce de um problema real: vender mais, organizar a casa, cobrar sem dor de cabeça. A gente transforma isso em produto que funciona.';

/** Número que sobe de zero ao entrar na tela. */
function Contador({ n }: { n: Numero }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = ref.current;
    if (reduce) {
      el.textContent = String(n.valor);
      return;
    }
    const c = animate(0, n.valor, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = String(Math.round(v))),
    });
    return () => c.stop();
  }, [inView, n.valor]);

  return (
    <div className="border-t border-line pt-6">
      <p className="display text-[clamp(3.5rem,8vw,7rem)]">
        {n.prefixo && <span className="text-brand">{n.prefixo}</span>}
        <span ref={ref}>0</span>
        {n.sufixo && <span className="text-brand">{n.sufixo}</span>}
      </p>
      <p className="mt-2 text-muted">{n.rotulo}</p>
    </div>
  );
}

/** Bloco de apresentação: as palavras acendem de cinza para branco conforme o usuário rola. */
export default function Intro() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const words = el.querySelectorAll<HTMLElement>('[data-w]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { opacity: 0.45 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
        },
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="py-24 md:py-40">
      <div className="container-x">
        <Reveal><p className="eyebrow mb-6">Quem somos</p></Reveal>
        <Reveal>
          <h2 className="display max-w-4xl text-[clamp(2.6rem,7vw,6.5rem)]">
            Tecnologia feita para quem <span className="text-brand">empreende</span>
          </h2>
        </Reveal>

        <p ref={ref} className="mt-14 max-w-5xl text-[clamp(1.5rem,3.4vw,3rem)] font-medium leading-[1.2] tracking-tight">
          {TEXTO.split(' ').map((w, i) => (
            <span key={i} data-w className="inline-block pr-[0.28em]">
              {w}
            </span>
          ))}
        </p>

        <div className="mt-20 grid gap-10 md:mt-28 md:grid-cols-3 md:gap-12">
          {numeros.map((n) => (
            <Contador key={n.rotulo} n={n} />
          ))}
        </div>

        {/* Fundador */}
        <Reveal className="mt-24 grid items-center gap-10 border-t border-line pt-16 md:mt-32 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line">
              <MediaImage src={media.image.fundador} alt="Danilo Lima Cruz, fundador da Zinkra" sizes="(min-width:768px) 30vw, 90vw" label="Danilo" />
            </div>
          </div>
          <div className="md:col-span-8">
            <p className="eyebrow mb-4">Quem está por trás</p>
            <p className="display text-[clamp(2.2rem,5vw,4.5rem)]">Danilo Lima Cruz</p>
            <p className="mt-3 max-w-xl text-lg text-muted">
              Desenvolvedor e fundador da Zinkra. Você fala direto com quem projeta e constrói o seu sistema, do primeiro papo à publicação.
            </p>
            <Link href="/sobre" className="link-line mt-6 text-brand">Conhecer a história</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
