'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import ThemeToggle from './ThemeToggle';
import MobileMenu from './MobileMenu';
import { MENU_SOLUCOES, MENU_TECNOLOGIA, NAV_ITENS, whatsappLink } from '@/data/site';

type MenuId = 'solucoes' | 'tecnologia' | null;

/**
 * Barra fixa: esconde ao rolar para baixo, volta ao rolar para cima, com fundo desfocado e transparente.
 * Soluções e Tecnologia abrem painéis grandes (mouse, teclado e toque).
 */
export default function Navbar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(pathname === '/');
  const [open, setOpen] = useState<MenuId>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setOverHero(pathname === '/' && y < window.innerHeight * 0.75);
      if (Math.abs(y - lastY.current) > 8) {
        setHidden(y > lastY.current && y > 120);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Fecha painéis ao trocar de página
  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openMenu = (id: MenuId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 160);
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href.split('#')[0]) && href !== '/#tecnologia');

  // Sobre a abertura escura, o tema do cabeçalho é sempre escuro (mesmo no tema claro)
  const theme = overHero || mobileOpen ? 'dark' : undefined;

  return (
    <>
      <m.header
        data-theme={theme}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500 ${
          scrolled || open ? 'border-b border-line/60 bg-bg/60 backdrop-blur-xl' : 'border-b border-transparent'
        }`}
        animate={{ y: hidden && !open && !mobileOpen ? '-100%' : '0%' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseLeave={scheduleClose}
      >
        <a
          href="#conteudo"
          className="sr-only rounded-full bg-brand px-4 py-2 font-semibold text-[#0A0C0B] focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>
        <div className="container-x flex h-[72px] items-center justify-between text-fg">
          <Logo />

          <nav aria-label="Principal" className="hidden items-center gap-9 lg:flex">
            {NAV_ITENS.map((item) =>
              item.menu ? (
                <div key={item.rotulo} className="relative" onMouseEnter={() => openMenu(item.menu!)}>
                  <button
                    type="button"
                    aria-expanded={open === item.menu}
                    aria-controls={`menu-${item.menu}`}
                    onClick={() => setOpen(open === item.menu ? null : item.menu!)}
                    className="link-line flex items-center gap-1.5 py-2 text-sm font-medium text-fg/90 transition-colors hover:text-fg"
                  >
                    {item.rotulo}
                    <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform duration-300 ${open === item.menu ? 'rotate-180' : ''}`} aria-hidden>
                      <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <Link
                  key={item.rotulo}
                  href={item.href}
                  onMouseEnter={() => setOpen(null)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className="link-line overflow-hidden py-2 text-sm font-medium text-fg/90 transition-colors hover:text-fg"
                >
                  <span className="inline-block transition-transform duration-500 ease-out hover:-translate-y-0.5">{item.rotulo}</span>
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden lg:block">
              <Button href={whatsappLink()} external size="md">
                Pedir orçamento
              </Button>
            </div>
            <button
              type="button"
              className="relative z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-fg/20 lg:hidden"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="relative block h-3 w-5" aria-hidden>
                <span className={`absolute left-0 h-[2px] w-5 bg-fg transition-all duration-300 ${mobileOpen ? 'top-[5px] rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 top-[5px] h-[2px] w-5 bg-fg transition-opacity duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
                <span className={`absolute left-0 h-[2px] w-5 bg-fg transition-all duration-300 ${mobileOpen ? 'top-[5px] -rotate-45' : 'top-[10px]'}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Painéis grandes (computador) */}
        <AnimatePresence>
          {open === 'solucoes' && (
            <m.div
              id="menu-solucoes"
              key="sol"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => openMenu('solucoes')}
              className="absolute inset-x-0 top-full hidden border-t border-line/60 bg-bg/[0.98] backdrop-blur-2xl lg:block"
            >
              <div className="container-x grid grid-cols-4 gap-10 py-12 text-fg">
                {MENU_SOLUCOES.map((col, ci) => (
                  <div key={col.titulo}>
                    <p className="eyebrow mb-5">{col.titulo}</p>
                    <ul className="space-y-1">
                      {col.itens.map((it, i) => (
                        <m.li
                          key={it.rotulo}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + ci * 0.05 + i * 0.04, duration: 0.4 }}
                        >
                          <Link href={it.href} className="group flex items-center gap-3 py-2 text-xl font-semibold tracking-tight text-fg/80 transition-colors hover:text-fg">
                            <span aria-hidden className="h-[2px] w-0 bg-brand transition-all duration-500 ease-out group-hover:w-6" />
                            <span className="transition-transform duration-500 ease-out group-hover:translate-x-1">{it.rotulo}</span>
                          </Link>
                        </m.li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </m.div>
          )}
          {open === 'tecnologia' && (
            <m.div
              id="menu-tecnologia"
              key="tec"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => openMenu('tecnologia')}
              className="absolute inset-x-0 top-full hidden border-t border-line/60 bg-bg/[0.98] backdrop-blur-2xl lg:block"
            >
              <div className="container-x grid grid-cols-3 gap-x-10 gap-y-2 py-12 text-fg">
                {MENU_TECNOLOGIA.map((t, i) => (
                  <m.div key={t.rotulo} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                    <Link href="/#tecnologia" className="group flex flex-col gap-1 py-3">
                      <span className="flex items-center gap-3 text-xl font-semibold tracking-tight text-fg/80 transition-colors group-hover:text-fg">
                        <span aria-hidden className="h-[2px] w-0 bg-brand transition-all duration-500 ease-out group-hover:w-6" />
                        <span className="transition-transform duration-500 ease-out group-hover:translate-x-1">{t.rotulo}</span>
                      </span>
                      <span className="pl-0 text-sm text-muted">{t.desc}</span>
                    </Link>
                  </m.div>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
