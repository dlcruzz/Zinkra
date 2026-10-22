import type { ReactNode } from 'react';
import PageHero from './PageHero';

/** Estrutura simples para páginas de texto (privacidade e termos). */
export default function Legal({ etiqueta, titulo, atualizado, children }: { etiqueta: string; titulo: string; atualizado: string; children: ReactNode }) {
  return (
    <>
      <PageHero etiqueta={etiqueta} titulo={titulo} texto={`Última atualização: ${atualizado}.`} />
      <article className="container-x pb-28 md:pb-40">
        <div className="mx-auto max-w-3xl space-y-10 text-lg leading-relaxed text-fg/80 [&_h2]:display [&_h2]:mb-4 [&_h2]:text-3xl [&_h2]:text-fg [&_a]:text-brand [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </div>
      </article>
    </>
  );
}
