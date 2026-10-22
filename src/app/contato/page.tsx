import type { Metadata } from 'next';
import PageHero from '@/components/sections/PageHero';
import ContactForm from '@/components/sections/ContactForm';
import Reveal from '@/components/ui/Reveal';
import Button from '@/components/ui/Button';
import { SITE, whatsappLink } from '@/data/site';

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a Zinkra pelo WhatsApp, e-mail ou formulário. Respondemos com um caminho claro: o que fazer, em quanto tempo e como começar.',
  alternates: { canonical: '/contato' },
};

export default function ContatoPage() {
  return (
    <>
      <PageHero etiqueta="Contato" titulo="Conte o que você precisa." destaque={['precisa']} texto="Respondemos com um caminho claro: o que fazer, em quanto tempo e como começar." />
      <section className="pb-24 md:pb-40">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-5">
            <Reveal>
              <p className="eyebrow mb-3">WhatsApp</p>
              <a className="display link-line text-4xl" href={whatsappLink()} target="_blank" rel="noopener noreferrer">{SITE.whatsappTexto}</a>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="eyebrow mb-3">E-mail</p>
              <a className="link-line text-xl" href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="eyebrow mb-3">Instagram</p>
              <a className="link-line text-xl" href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer">{SITE.instagram}</a>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="eyebrow mb-3">Onde estamos</p>
              <p className="text-xl text-fg/85">{SITE.cidade}</p>
              <p className="mt-1 text-sm text-muted">CNPJ {SITE.cnpj}</p>
            </Reveal>
            <Reveal delay={0.2}>
              <Button href={whatsappLink()} external size="lg">Falar no WhatsApp</Button>
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal><ContactForm /></Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
