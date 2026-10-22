'use client';
import { useEffect, useState } from 'react';
import Reveal from '@/components/ui/Reveal';
import Button from '@/components/ui/Button';
import { LoopVideo } from '@/components/ui/Media';
import ContactForm from './ContactForm';
import { media } from '@/data/media';
import { whatsappLink } from '@/data/site';

const PALAVRAS = ['incrível', 'rápido', 'lucrativo', 'seguro', 'sob medida', 'inovador', 'bonito', 'escalável'];

/** Palavra que troca sozinha com animação vertical. Todas ocupam a mesma célula, então a largura nunca "pula". */
function PalavraGirando() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PALAVRAS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-grid overflow-hidden align-bottom pb-[0.15em] -mb-[0.15em] text-brand" aria-live="off">
      <span className="sr-only">{PALAVRAS.join(', ')}</span>
      {PALAVRAS.map((p, idx) => (
        <span
          key={p}
          aria-hidden
          className="col-start-1 row-start-1 whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]"
          style={{
            transform: idx === i ? 'translateY(0)' : idx === (i - 1 + PALAVRAS.length) % PALAVRAS.length ? 'translateY(-110%)' : 'translateY(110%)',
            opacity: idx === i ? 1 : 0,
          }}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

export default function FinalCTA() {
  return (
    <section id="contato" data-theme="dark" className="relative isolate overflow-hidden bg-bg py-28 text-fg md:py-44">
      <div aria-hidden className="media-fallback absolute inset-0 -z-20 opacity-70" />
      <LoopVideo src={media.video.ctaLoop} opacity={0.3} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(var(--brand)/0.28),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-bg via-transparent to-bg" />

      <div className="container-x">
        <Reveal>
          <h2 className="display text-[clamp(3rem,10.5vw,10.5rem)]">
            Vamos criar algo <PalavraGirando />.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 md:mt-24 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="max-w-md text-lg text-fg/70">
                Conte o que você precisa e a gente responde com um caminho claro: o que fazer, em quanto tempo e como começar.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <Button href={whatsappLink()} external size="lg">
                Falar no WhatsApp
              </Button>
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal delay={0.15}>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
