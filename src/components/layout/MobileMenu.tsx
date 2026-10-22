'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { getLenis } from '@/lib/lenis';
import { solucoes } from '@/data/solucoes';
import { NAV_ITENS, SITE, whatsappLink } from '@/data/site';
import Button from '@/components/ui/Button';

/** Menu em tela cheia para celular, com entrada em cascata. */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sub, setSub] = useState(false);

  useEffect(() => {
    if (!open) {
      setSub(false);
      return;
    }
    getLenis()?.stop();
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      getLenis()?.start();
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const itens = NAV_ITENS;

  return (
    <AnimatePresence>
      {open && (
        <m.div
          data-theme="dark"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[45] flex flex-col bg-bg px-6 pb-8 pt-24 text-fg lg:hidden"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          <nav aria-label="Menu móvel" className="flex-1 overflow-y-auto">
            <ul>
              {itens.map((item, i) => (
                <m.li
                  key={item.rotulo}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-line"
                >
                  {item.menu === 'solucoes' ? (
                    <>
                      <button
                        type="button"
                        aria-expanded={sub}
                        onClick={() => setSub((v) => !v)}
                        className="display flex w-full items-center justify-between py-4 text-4xl"
                      >
                        {item.rotulo}
                        <span className={`text-brand transition-transform ${sub ? 'rotate-45' : ''}`} aria-hidden>+</span>
                      </button>
                      {sub && (
                        <ul className="pb-4 pl-1">
                          {solucoes.map((s) => (
                            <li key={s.slug}>
                              <Link href={`/solucoes/${s.slug}`} onClick={onClose} className="block py-2 text-lg text-fg/70">
                                {s.tituloCurto}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link href={item.href} onClick={onClose} className="display block py-4 text-4xl">
                      {item.rotulo}
                    </Link>
                  )}
                </m.li>
              ))}
            </ul>
          </nav>
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex flex-col gap-4"
          >
            <Button href={whatsappLink()} external size="lg" magnetic={false} className="w-full">
              Pedir orçamento
            </Button>
            <p className="text-center text-sm text-muted">
              {SITE.whatsappTexto} · {SITE.instagram}
            </p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
