'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLenis } from '@/lib/lenis';
import { media } from '@/data/media';
import { useHasMedia } from '@/hooks/useMedia';

type Origin = { top: number; left: number; right: number; bottom: number };
type Ctx = { open: (origin?: DOMRect) => void };
const VideoContext = createContext<Ctx>({ open: () => undefined });
export const useVideoModal = () => useContext(VideoContext);

/**
 * Modal de vídeo em tela cheia. Abre com uma expansão a partir do botão que foi clicado.
 * Teclado: Esc fecha, Tab fica preso dentro do modal, e o foco volta ao botão ao fechar.
 */
export function VideoModalProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [isOpen, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const hasVideo = useHasMedia(media.video.heroShowreel);
  const hasPoster = useHasMedia(media.image.heroPoster);

  const open = useCallback((rect?: DOMRect) => {
    opener.current = document.activeElement as HTMLElement;
    const w = window.innerWidth;
    const h = window.innerHeight;
    setOrigin(
      rect
        ? { top: rect.top, left: rect.left, right: w - rect.right, bottom: h - rect.bottom }
        : { top: h / 2, left: w / 2, right: w / 2, bottom: h / 2 },
    );
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    getLenis()?.stop();
    document.documentElement.style.overflow = 'hidden';
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        // só existe um elemento focável útil (o botão de fechar) mais o vídeo: mantém o foco dentro
        const focusables = document.querySelectorAll<HTMLElement>('[data-modal] button, [data-modal] video');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      getLenis()?.start();
      document.documentElement.style.overflow = '';
      opener.current?.focus?.();
    };
  }, [isOpen, close]);

  const o = origin ?? { top: 0, left: 0, right: 0, bottom: 0 };

  return (
    <VideoContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-modal
            role="dialog"
            aria-modal="true"
            aria-label="Vídeo de apresentação da Zinkra"
            className="fixed inset-0 z-[85] bg-black"
            initial={{ clipPath: `inset(${o.top}px ${o.right}px ${o.bottom}px ${o.left}px round 999px)` }}
            animate={{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }}
            exit={{ clipPath: `inset(${o.top}px ${o.right}px ${o.bottom}px ${o.left}px round 999px)` }}
            transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="flex h-full w-full items-center justify-center">
              {hasVideo ? (
                <video
                  className="max-h-full w-full"
                  src={media.video.heroShowreel}
                  poster={hasPoster ? media.image.heroPoster : undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="media-fallback relative flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="display relative z-10 text-4xl md:text-6xl">Vídeo em breve</p>
                  <p className="relative z-10 max-w-md text-muted">
                    Estamos finalizando o vídeo de apresentação da Zinkra. Enquanto isso, fale com a gente pelo WhatsApp.
                  </p>
                </div>
              )}
            </div>
            <button
              ref={closeBtn}
              onClick={close}
              aria-label="Fechar vídeo"
              className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-brand hover:text-[#0A0C0B] md:right-8 md:top-8"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </VideoContext.Provider>
  );
}
