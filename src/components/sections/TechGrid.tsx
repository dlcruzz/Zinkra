'use client';
import Reveal from '@/components/ui/Reveal';
import SplitText from '@/components/ui/SplitText';
import { TechIcon } from '@/components/ui/Icons';

const TECNOLOGIAS = ['React', 'Next.js', 'TypeScript', 'Node.js', 'Supabase', 'PostgreSQL', 'Vercel', 'Tailwind CSS', 'IA'];

/** Grade de tecnologias: flutuam de leve e brilham ao passar o mouse. */
export default function TechGrid() {
  const onMove = (e: React.PointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <section id="tecnologia" className="py-24 md:py-40">
      <div className="container-x">
        <div className="mb-14 md:mb-20">
          <Reveal><p className="eyebrow mb-5">Tecnologia</p></Reveal>
          <SplitText text="Ferramentas modernas, escolhidas a dedo." className="display max-w-4xl text-[clamp(2.6rem,7vw,6.5rem)]" highlight={['modernas']} />
        </div>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {TECNOLOGIAS.map((t, i) => (
            <li
              key={t}
              onPointerMove={onMove}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface/70"
              style={{ animation: `float-y ${5 + (i % 4)}s ease-in-out ${i * -0.7}s infinite` }}
            >
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: 'radial-gradient(180px circle at var(--mx,50%) var(--my,50%), rgb(var(--brand)/0.35), transparent 70%)' }}
              />
              <div className="relative flex h-36 flex-col items-center justify-center gap-4 text-fg/70 transition-all duration-500 group-hover:text-brand md:h-48">
                <div className="transition-transform duration-500 ease-out group-hover:scale-110 group-hover:drop-shadow-[0_0_14px_rgb(var(--brand)/0.7)]">
                  <TechIcon nome={t} size={52} />
                </div>
                <span className="text-sm font-medium tracking-wide text-fg">{t === 'IA' ? 'IA e automação' : t}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
