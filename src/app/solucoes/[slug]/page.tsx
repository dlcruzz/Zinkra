import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageHero from '@/components/sections/PageHero';
import FinalCTA from '@/components/sections/FinalCTA';
import Reveal from '@/components/ui/Reveal';
import Button from '@/components/ui/Button';
import { SolucaoIcon } from '@/components/ui/Icons';
import { getSolucao, solucoes } from '@/data/solucoes';
import { SITE, whatsappLink } from '@/data/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return solucoes.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getSolucao(slug);
  if (!s) return {};
  return {
    title: s.titulo,
    description: `${s.frase} ${s.oQueE}`.slice(0, 200),
    alternates: { canonical: `/solucoes/${s.slug}` },
  };
}

export default async function SolucaoPage({ params }: Props) {
  const { slug } = await params;
  const s = getSolucao(slug);
  if (!s) notFound();

  // Dados estruturados: serviço e perguntas frequentes
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: s.titulo,
      description: s.oQueE,
      provider: { '@type': 'Organization', name: 'Zinkra', url: SITE.url },
      areaServed: 'BR',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: s.faq.map((f) => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
    },
  ];

  const mensagem = `Olá! Vim pelo site da Zinkra e quero um orçamento de: ${s.titulo}.`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero etiqueta="Solução" titulo={s.titulo} texto={s.frase} />

      <div className="container-x">
        <div className="grid gap-16 md:gap-24">
          <Reveal className="grid gap-6 border-t border-line pt-10 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-3">O que é</h2>
            <div className="md:col-span-9">
              <div className="mb-6 text-brand"><SolucaoIcon slug={s.slug} size={52} /></div>
              <p className="text-xl leading-relaxed text-fg/85 md:text-2xl">{s.oQueE}</p>
            </div>
          </Reveal>

          <Reveal className="grid gap-6 border-t border-line pt-10 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-3">Para quem serve</h2>
            <ul className="space-y-4 md:col-span-9">
              {s.paraQuem.map((t) => (
                <li key={t} className="flex gap-4 text-lg text-fg/85 md:text-xl">
                  <span aria-hidden className="mt-3 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="grid gap-6 border-t border-line pt-10 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-3">O que está incluso</h2>
            <ul className="grid gap-3 md:col-span-9 md:grid-cols-2">
              {s.incluso.map((t, i) => (
                <Reveal as="li" key={t} delay={i * 0.04} y={16} className="flex gap-3 rounded-2xl border border-line bg-surface/60 p-5">
                  <svg className="mt-0.5 shrink-0 text-brand" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  <span className="text-fg/85">{t}</span>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          <Reveal className="grid gap-6 border-t border-line pt-10 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-3">Tecnologias</h2>
            <ul className="flex flex-wrap gap-3 md:col-span-9">
              {s.tecnologias.map((t) => (
                <li key={t} className="rounded-full border border-line px-5 py-2 text-fg/85">{t}</li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="grid gap-6 border-t border-line pt-10 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-3">Perguntas frequentes</h2>
            <div className="md:col-span-9">
              {s.faq.map((f) => (
                <details key={f.p} className="group border-b border-line py-5 first:pt-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-semibold tracking-tight md:text-2xl">
                    {f.p}
                    <span aria-hidden className="text-2xl text-brand transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 max-w-3xl text-lg text-muted">{f.r}</p>
                </details>
              ))}
            </div>
          </Reveal>

          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center md:p-12">
            <p className="display text-3xl md:text-5xl">Vamos conversar sobre o seu projeto?</p>
            <Button href={whatsappLink(mensagem)} external size="lg">Pedir orçamento</Button>
          </Reveal>

          <Reveal>
            <p className="text-sm text-muted">
              Outras soluções:{' '}
              {solucoes.filter((x) => x.slug !== s.slug).map((x, i, arr) => (
                <span key={x.slug}>
                  <Link className="link-line text-fg/80" href={`/solucoes/${x.slug}`}>{x.tituloCurto}</Link>
                  {i < arr.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-24 md:mt-40">
        <FinalCTA />
      </div>
    </>
  );
}
