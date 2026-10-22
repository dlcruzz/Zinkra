import Reveal from '@/components/ui/Reveal';
import SplitText from '@/components/ui/SplitText';
import Button from '@/components/ui/Button';
import ProjectList from './ProjectList';
import { projetos } from '@/data/projetos';

export default function FeaturedProjects() {
  return (
    <section id="projetos" className="py-24 md:py-40">
      <div className="container-x">
        <div className="mb-14 flex flex-col justify-between gap-8 md:mb-20 md:flex-row md:items-end">
          <div>
            <Reveal><p className="eyebrow mb-5">Projetos em destaque</p></Reveal>
            <SplitText text="Trabalho que sai do papel." className="display text-[clamp(2.6rem,7vw,6.5rem)]" highlight={['papel']} />
          </div>
          <Reveal delay={0.15}>
            <p className="max-w-sm text-muted">
              Do sistema que controla TVs em estabelecimentos ao site de uma clínica. Passe o mouse e veja o que cada projeto virou.
            </p>
          </Reveal>
        </div>

        <ProjectList itens={projetos} />

        <Reveal className="mt-14 flex justify-center md:mt-20">
          <Button href="/projetos" variant="outline" size="lg">Ver todos os projetos</Button>
        </Reveal>
      </div>
    </section>
  );
}
