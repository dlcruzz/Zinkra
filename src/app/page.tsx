import Hero from '@/components/sections/Hero';
import Marquee from '@/components/ui/Marquee';
import FeaturedProjects from '@/components/sections/FeaturedProjects';
import Intro from '@/components/sections/Intro';
import Solutions from '@/components/sections/Solutions';
import Process from '@/components/sections/Process';
import TechGrid from '@/components/sections/TechGrid';
import News from '@/components/sections/News';
import FinalCTA from '@/components/sections/FinalCTA';

const PALAVRAS = ['Sites', 'Landing pages', 'Sistemas', 'ERP', 'PDV', 'Financeiro', 'SaaS', 'Automação', 'Tráfego pago'];

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee items={PALAVRAS} />
      <FeaturedProjects />
      <Intro />
      <Solutions />
      <Process />
      <TechGrid />
      <News />
      <FinalCTA />
    </>
  );
}
