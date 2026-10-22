import SplitText from '@/components/ui/SplitText';

/** Abertura das páginas internas: etiqueta, título grande e texto de apoio. */
export default function PageHero({
  etiqueta,
  titulo,
  destaque = [],
  texto,
}: {
  etiqueta: string;
  titulo: string;
  destaque?: string[];
  texto?: string;
}) {
  return (
    <section className="relative overflow-hidden pb-16 pt-40 md:pb-24 md:pt-52">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand/15 blur-[120px]" />
      <div className="container-x relative">
        <p className="eyebrow fade-up mb-6" style={{ ['--d' as string]: '0.05s' }}>{etiqueta}</p>
        <SplitText as="h1" inView={false} delay={0.1} text={titulo} highlight={destaque} className="display max-w-5xl text-[clamp(2.8rem,8vw,7.5rem)]" />
        {texto && (
          <p className="fade-up mt-8 max-w-2xl text-lg leading-relaxed text-muted md:text-xl" style={{ ['--d' as string]: '0.3s' }}>
            {texto}
          </p>
        )}
      </div>
    </section>
  );
}
