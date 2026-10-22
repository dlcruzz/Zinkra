import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';
import SplitText from '@/components/ui/SplitText';
import { novidades } from '@/data/novidades';

/** Lista de novidades no estilo diário: data, categoria e título; a linha se destaca ao passar o mouse. */
export default function News() {
  const lista = [...novidades].sort((a, b) => b.iso.localeCompare(a.iso));
  return (
    <section id="novidades" className="cv-auto py-24 md:py-40">
      <div className="container-x">
        <div className="mb-14 md:mb-20">
          <Reveal><p className="eyebrow mb-5">Novidades</p></Reveal>
          <SplitText text="O que estamos entregando." className="display text-[clamp(2.6rem,7vw,6.5rem)]" highlight={['entregando']} />
        </div>

        <ul className="border-t border-line">
          {lista.map((n, i) => {
            const conteudo = (
              <>
                <span aria-hidden className="absolute inset-0 -z-10 origin-left scale-x-0 bg-brand/10 transition-transform duration-500 ease-out group-hover:scale-x-100" />
                <time dateTime={n.iso} className="w-32 shrink-0 text-sm text-muted md:w-44">{n.data}</time>
                <span className="w-28 shrink-0 md:w-40">
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-fg/80 transition-colors group-hover:border-brand group-hover:text-brand">{n.categoria}</span>
                </span>
                <span className="flex-1 text-lg font-medium tracking-tight transition-transform duration-500 ease-out group-hover:translate-x-2 md:text-2xl">{n.titulo}</span>
                <span aria-hidden className="hidden text-brand opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100 md:block">→</span>
              </>
            );
            const cls = 'group relative isolate flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-1 py-7 md:flex-nowrap md:py-9';
            return (
              <li key={n.titulo}>
                <Reveal delay={i * 0.06} y={20}>
                  {n.href ? (
                    <Link href={n.href} className={cls}>{conteudo}</Link>
                  ) : (
                    <div className={cls}>{conteudo}</div>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
