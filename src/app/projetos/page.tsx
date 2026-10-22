import type { Metadata } from 'next';
import PageHero from '@/components/sections/PageHero';
import ProjectList from '@/components/sections/ProjectList';
import FinalCTA from '@/components/sections/FinalCTA';
import { projetos } from '@/data/projetos';

export const metadata: Metadata = {
  title: 'Projetos',
  description: 'Sistemas, sites e produtos digitais criados pela Zinkra: sinalização digital, sites profissionais, sistema financeiro, PDV e SaaS.',
  alternates: { canonical: '/projetos' },
};

export default function ProjetosPage() {
  return (
    <>
      <PageHero
        etiqueta="Projetos"
        titulo="Cada projeto resolve um problema real."
        destaque={['real']}
        texto="Alguns já estão no ar. Outros são projetos conceito, em construção, e estão marcados como “em breve”."
      />
      <section className="pb-24 md:pb-40">
        <div className="container-x">
          <ProjectList itens={projetos} />
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
