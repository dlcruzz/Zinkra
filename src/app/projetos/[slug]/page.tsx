import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageHero from '@/components/sections/PageHero';
import FinalCTA from '@/components/sections/FinalCTA';
import Reveal from '@/components/ui/Reveal';
import { MediaImage } from '@/components/ui/Media';
import { getProjeto, projetos } from '@/data/projetos';
import { SITE } from '@/data/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projetos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProjeto(slug);
  if (!p) return {};
  return {
    title: p.nome,
    description: p.resumo,
    alternates: { canonical: `/projetos/${p.slug}` },
    openGraph: { title: `${p.nome} | Zinkra`, description: p.resumo, images: [p.imagem] },
  };
}

function Bloco({ titulo, texto, delay = 0 }: { titulo: string; texto: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="grid gap-4 border-t border-line py-10 md:grid-cols-12 md:py-14">
      <h2 className="eyebrow md:col-span-3">{titulo}</h2>
      <p className="text-xl leading-relaxed text-fg/85 md:col-span-9 md:text-2xl">{texto}</p>
    </Reveal>
  );
}

export default async function ProjetoPage({ params }: Props) {
  const { slug } = await params;
  const p = getProjeto(slug);
  if (!p) notFound();

  const i = projetos.findIndex((x) => x.slug === slug);
  const proximo = projetos[(i + 1) % projetos.length];

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.nome,
    description: p.resumo,
    creator: { '@type': 'Organization', name: 'Zinkra', url: SITE.url },
    dateCreated: p.ano,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero etiqueta={`${p.tipo} · ${p.ano}`} titulo={p.nome} texto={p.resumo} />

      <div className="container-x">
        <Reveal>
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line">
            <MediaImage src={p.imagem} alt={`Imagem do projeto ${p.nome}`} priority sizes="(min-width:1440px) 1330px, 94vw" label={p.nome} />
          </div>
        </Reveal>

        {p.conceito && (
          <Reveal className="mt-8">
            <p className="rounded-2xl border border-brand/30 bg-brand/5 px-6 py-4 text-fg/85">
              <strong className="text-brand">Projeto conceito.</strong> Esta página mostra a ideia e a direção do projeto. Ele ainda não é um caso de cliente confirmado.
            </p>
          </Reveal>
        )}

        <div className="mt-16 md:mt-24">
          <Bloco titulo="O problema" texto={p.problema} />
          <Bloco titulo="A solução" texto={p.solucao} />
          <Bloco titulo="O resultado" texto={p.resultado} />
          <Reveal className="grid gap-4 border-y border-line py-10 md:grid-cols-12 md:py-14">
            <h2 className="eyebrow md:col-span-3">Tecnologias</h2>
            <ul className="flex flex-wrap gap-3 md:col-span-9">
              {p.tecnologias.map((t) => (
                <li key={t} className="rounded-full border border-line px-5 py-2 text-fg/85">{t}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Galeria: usa as imagens extras quando existirem; senão mostra reservas elegantes */}
        <div className="mt-16 md:mt-24">
          <Reveal><h2 className="eyebrow mb-8">Galeria</h2></Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {(p.galeria.length ? p.galeria : [p.imagem, p.imagem, p.imagem]).slice(0, 3).map((src, k) => (
              <Reveal key={k} delay={k * 0.08}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
                  <MediaImage src={p.galeria.length ? src : `/media/_galeria-${p.slug}-${k + 1}.jpg`} alt={`${p.nome}, imagem ${k + 1}`} sizes="(min-width:768px) 33vw, 100vw" label={k === 0 ? p.nome : undefined} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-20 border-t border-line pt-10 md:mt-28">
          <Link href={`/projetos/${proximo.slug}`} data-cursor="ver" className="group flex items-end justify-between gap-6">
            <span>
              <span className="eyebrow">Próximo projeto</span>
              <span className="display mt-3 block text-[clamp(2.2rem,6vw,5rem)] transition-colors group-hover:text-brand">{proximo.nome}</span>
            </span>
            <span aria-hidden className="mb-3 text-3xl text-brand transition-transform duration-500 group-hover:translate-x-2">→</span>
          </Link>
        </Reveal>
      </div>

      <div className="mt-24 md:mt-40">
        <FinalCTA />
      </div>
    </>
  );
}
