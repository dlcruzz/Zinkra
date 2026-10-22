import type { Metadata } from 'next';
import PageHero from '@/components/sections/PageHero';
import FinalCTA from '@/components/sections/FinalCTA';
import { ETAPAS } from '@/data/etapas';
import Reveal from '@/components/ui/Reveal';
import { MediaImage } from '@/components/ui/Media';
import { media } from '@/data/media';

export const metadata: Metadata = {
  title: 'Sobre',
  description: 'A Zinkra é uma software house de São Paulo criada por Danilo Lima Cruz. Conheça a nossa história, os nossos valores e como trabalhamos.',
  alternates: { canonical: '/sobre' },
};

const VALORES = [
  { t: 'Clareza antes de tudo', d: 'Você sabe o que está comprando, em quanto tempo e por quê. Sem letra miúda e sem termo técnico para te confundir.' },
  { t: 'Feito para o seu negócio', d: 'Não existe projeto de prateleira. Começamos pelo problema da empresa e só depois escolhemos a tecnologia.' },
  { t: 'Entrega em etapas', d: 'Você enxerga o trabalho andando e pode ajustar o rumo cedo, quando ainda é simples e barato.' },
  { t: 'Honestidade', d: 'Se algo não vale a pena, dizemos. Se não sabemos, descobrimos antes de prometer.' },
];

export default function SobrePage() {
  return (
    <>
      <PageHero
        etiqueta="Sobre a Zinkra"
        titulo="Software feito com cuidado, para quem empreende."
        destaque={['cuidado']}
        texto="A Zinkra é uma software house de São Paulo. Criamos sites, sistemas e produtos digitais com um objetivo simples: fazer o seu negócio funcionar melhor e vender mais."
      />

      <div className="container-x">
        {/* História */}
        <section className="grid gap-10 border-t border-line py-16 md:grid-cols-12 md:py-28">
          <Reveal as="h2" className="eyebrow md:col-span-3">A nossa história</Reveal>
          <div className="space-y-6 text-xl leading-relaxed text-fg/85 md:col-span-9 md:text-2xl">
            <Reveal><p>A Zinkra nasceu de uma observação: muita empresa boa perde cliente e tempo por causa de tecnologia que não acompanha o negócio. Site que não aparece, planilha que ninguém entende, sistema pronto que não faz o que a empresa precisa.</p></Reveal>
            <Reveal delay={0.05}><p>Começamos fazendo sites e hoje também entregamos sistemas sob medida, painéis, automações e produtos por assinatura. O que não mudou é o jeito de trabalhar: conversar primeiro, entender o problema de verdade e só depois escrever código.</p></Reveal>
            <Reveal delay={0.1}><p className="text-muted">Somos pequenos de propósito. Quem conversa com você é quem desenvolve, e isso deixa o caminho mais curto entre o que você pede e o que fica pronto.</p></Reveal>
          </div>
        </section>

        {/* Valores */}
        <section className="border-t border-line py-16 md:py-28">
          <Reveal as="h2" className="eyebrow mb-10">Em que acreditamos</Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {VALORES.map((v, i) => (
              <Reveal key={v.t} delay={i * 0.06}>
                <div className="h-full rounded-3xl border border-line bg-surface/60 p-8 md:p-10">
                  <h3 className="display text-3xl">{v.t}</h3>
                  <p className="mt-4 text-lg text-muted">{v.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Fundador */}
        <section className="grid items-center gap-10 border-t border-line py-16 md:grid-cols-12 md:gap-16 md:py-28">
          <Reveal className="md:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line">
              <MediaImage src={media.image.fundador} alt="Danilo Lima Cruz, fundador da Zinkra" sizes="(min-width:768px) 40vw, 90vw" label="Danilo" />
            </div>
          </Reveal>
          <div className="md:col-span-7">
            <Reveal><p className="eyebrow mb-5">O fundador</p></Reveal>
            <Reveal delay={0.05}><h2 className="display text-[clamp(2.4rem,5vw,4.5rem)]">Danilo Lima Cruz</h2></Reveal>
            <Reveal delay={0.1}><p className="mt-2 text-lg text-brand">Desenvolvedor e estudante de Análise e Desenvolvimento de Sistemas</p></Reveal>
            <Reveal delay={0.15}>
              <p className="mt-8 text-xl leading-relaxed text-fg/85">
                Danilo começou no design e nas redes sociais e foi parar na programação porque queria resolver o problema inteiro, não só a parte bonita dele. Hoje projeta e desenvolve os sistemas e sites da Zinkra, do banco de dados à tela, e acompanha cada cliente de perto.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Equipe (foto opcional) */}
        <Reveal className="mb-16 md:mb-28">
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl border border-line">
            <MediaImage src={media.image.sobreEquipe} alt="A equipe da Zinkra" sizes="94vw" label="Zinkra" />
          </div>
        </Reveal>

        {/* Como trabalhamos */}
        <section className="border-t border-line py-16 md:py-28">
          <Reveal as="h2" className="eyebrow mb-10">Como trabalhamos</Reveal>
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ETAPAS.map((e, i) => (
              <Reveal as="li" key={e.titulo} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-3xl border border-line bg-surface/60 p-8">
                  <span className="display text-5xl text-brand/70">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="display mt-6 text-2xl">{e.titulo}</h3>
                  <p className="mt-3 text-muted">{e.texto}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>
      </div>

      <FinalCTA />
    </>
  );
}
