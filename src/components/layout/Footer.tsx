'use client';
import Link from 'next/link';
import { m } from 'framer-motion';
import { LINKS_RODAPE, SITE, whatsappLink } from '@/data/site';
import { scrollToTop } from '@/lib/lenis';

/** Rodapé limpo: marca grande, contatos, links rápidos, políticas e botão de voltar ao topo. */
export default function Footer() {
  return (
    <footer data-theme="dark" className="cv-auto relative overflow-hidden border-t border-line bg-bg text-fg">
      <div className="container-x pb-10 pt-20 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="max-w-sm text-lg text-muted">
              Software house em São Paulo. Sites, sistemas e produtos digitais feitos para o seu negócio vender mais.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow mb-5">Contato</p>
            <ul className="space-y-3 text-fg/85">
              <li><a className="link-line" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><a className="link-line" href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer">{SITE.instagram}</a></li>
              <li><a className="link-line" href={whatsappLink()} target="_blank" rel="noopener noreferrer">{SITE.whatsappTexto}</a></li>
              <li className="text-sm text-muted">CNPJ {SITE.cnpj}</li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow mb-5">Navegação</p>
            <ul className="space-y-3 text-fg/85">
              {LINKS_RODAPE.map((l) => (
                <li key={l.rotulo}><Link className="link-line" href={l.href}>{l.rotulo}</Link></li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow mb-5">Legal</p>
            <ul className="space-y-3 text-fg/85">
              <li><Link className="link-line" href="/privacidade">Privacidade</Link></li>
              <li><Link className="link-line" href="/termos">Termos de uso</Link></li>
            </ul>
          </div>
        </div>

        {/* Marca gigante */}
        <div aria-hidden className="giant-brand mt-20 select-none" />

        <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-line pt-8 md:flex-row md:items-center">
          <p className="text-sm text-muted">© 2026 Zinkra. Todos os direitos reservados.</p>
          <m.button
            type="button"
            onClick={scrollToTop}
            whileHover="hover"
            initial="rest"
            className="group flex items-center gap-3 text-sm font-medium text-fg/85"
            aria-label="Voltar ao topo da página"
          >
            Voltar ao topo
            <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-fg/25 transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-[#0A0C0B]">
              <m.svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                variants={{ rest: { y: 0 }, hover: { y: [0, -26, 26, 0], transition: { duration: 0.6, times: [0, 0.45, 0.46, 1] } } }}
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </m.svg>
            </span>
          </m.button>
        </div>
      </div>
    </footer>
  );
}
