import Button from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';

export const metadata = { title: 'Página não encontrada' };

export default function NotFound() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[130px]" />
      <div className="container-x relative text-center">
        <Reveal><p className="eyebrow mb-6">Erro 404</p></Reveal>
        <Reveal delay={0.1}>
          <h1 className="display text-[clamp(7rem,28vw,24rem)] leading-[0.8]">
            4<span className="text-brand">0</span>4
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-md text-lg text-muted">Essa página não existe ou mudou de endereço. Vamos voltar para um lugar conhecido.</p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10 flex justify-center">
          <Button href="/" size="lg">Voltar ao início</Button>
        </Reveal>
      </div>
    </section>
  );
}
