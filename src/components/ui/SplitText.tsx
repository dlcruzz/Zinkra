import type { CSSProperties } from 'react';

type Props = {
  text: string;
  className?: string;
  /** palavras (sem pontuação) que ficam em verde */
  highlight?: string[];
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** anima ao entrar na tela (true) ou logo ao carregar a página (false, sem esperar o JavaScript) */
  inView?: boolean;
};

/**
 * Título que entra palavra por palavra, cada uma subindo de dentro de uma máscara.
 * Só marcação + CSS (.split / .split-now em globals.css). O texto completo fica em aria-label.
 */
export default function SplitText({ text, className = '', highlight = [], delay = 0, as: Tag = 'h2', inView = true }: Props) {
  const words = text.split(' ');
  const hi = highlight.map((h) => h.toLowerCase());

  return (
    <Tag className={`split ${inView ? '' : 'split-now'} ${className}`} aria-label={text} style={{ '--sd': `${delay}s` } as CSSProperties}>
      <span aria-hidden>
        {words.map((w, i) => {
          const clean = w.replace(/[.,!?]/g, '').toLowerCase();
          return (
            <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
              <span className={`split-w inline-block ${hi.includes(clean) ? 'text-brand' : ''}`} style={{ '--i': i } as CSSProperties}>
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
