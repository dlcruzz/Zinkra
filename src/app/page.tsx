import dynamic from 'next/dynamic';
import Hero from '@/components/sections/Hero';
import Marquee from '@/components/ui/Marquee';

// Seções abaixo da primeira tela: o HTML já vem pronto, mas o JavaScript delas carrega à parte.
const FeaturedProjects = dynamic(() => import('@/components/sections/FeaturedProjects'));
const Intro = dynamic(() => import('@/components/sections/Intro'));
const Solutions = dynamic(() => import('@/components/sections/Solutions'));
const Process = dynamic(() => import('@/components/sections/Process'));
const TechGrid = dynamic(() => import('@/components/sections/TechGrid'));
const News = dynamic(() => import('@/components/sections/News'));
const FinalCTA = dynamic(() => import('@/components/sections/FinalCTA'));

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
