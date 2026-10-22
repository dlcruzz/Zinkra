'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useHasMedia } from '@/hooks/useMedia';

/** Fundo de reserva: degradê verde escuro com ruído. Usado quando a mídia ainda não existe. */
export function MediaFallback({ className = '', label }: { className?: string; label?: string }) {
  return (
    <div className={`media-fallback relative h-full w-full overflow-hidden ${className}`} aria-hidden={!label}>
      {label && (
        <span className="display absolute bottom-4 left-5 z-10 text-2xl text-fg/50 md:text-3xl">{label}</span>
      )}
    </div>
  );
}

type ImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Texto exibido no fundo de reserva (ex.: nome do projeto) */
  label?: string;
};

/** Imagem preenchendo o pai. Se o arquivo não existir (ou falhar), mostra o fundo de reserva. */
export function MediaImage({ src, alt, className = '', sizes = '100vw', priority, label }: ImageProps) {
  const exists = useHasMedia(src);
  const [failed, setFailed] = useState(false);
  if (!exists || failed) return <MediaFallback label={label} className={className} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

type VideoProps = {
  src: string | null;
  poster?: string;
  className?: string;
  /** undefined = toca só quando está visível na tela; true/false = controle externo (ex.: mouse em cima) */
  play?: boolean;
  /** quando true, só toca se `play` for true (ignora visibilidade) */
  hoverOnly?: boolean;
  opacity?: number;
};

/** Vídeo de fundo em loop: sem som, playsInline, pôster, carregamento preguiçoso e pausa fora da tela. */
export function LoopVideo({ src, poster, className = '', play, hoverOnly, opacity = 1 }: VideoProps) {
  const exists = useHasMedia(src);
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);

  // Só começa a baixar o vídeo quando o bloco está perto da tela
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [exists]);

  const shouldPlay = hoverOnly ? !!play : play ?? visible;

  useEffect(() => {
    const v = ref.current;
    if (!v || !near) return;
    if (shouldPlay && visible) v.play().catch(() => undefined);
    else v.pause();
  }, [shouldPlay, visible, near]);

  if (!src || !exists || failed) return null;
  return (
    <video
      ref={ref}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      style={{ opacity }}
      src={near ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      onError={() => setFailed(true)}
    />
  );
}
