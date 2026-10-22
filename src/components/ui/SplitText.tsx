'use client';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  text: string;
  className?: string;
  /** palavras (sem pontuação) que ficam em verde */
  highlight?: string[];
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** anima ao entrar na tela (true) ou logo ao montar (false) */
  inView?: boolean;
};

/**
 * Título que entra palavra por palavra, cada uma subindo de dentro de uma máscara.
 * O texto completo fica em aria-label, então leitores de tela leem a frase inteira.
 */
export default function SplitText({ text, className, highlight = [], delay = 0, as = 'h2', inView = true }: Props) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const Tag = motion[as];

  const anim = inView
    ? { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } }
    : { initial: 'hidden', animate: 'show' };

  let content: ReactNode = words.map((w, i) => {
    const clean = w.replace(/[.,!?]/g, '').toLowerCase();
    const isHi = highlight.map((h) => h.toLowerCase()).includes(clean);
    return (
      <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
        <motion.span
          className={`inline-block ${isHi ? 'text-brand' : ''}`}
          variants={{ hidden: { y: '110%' }, show: { y: '0%' } }}
          transition={{ duration: 0.9, delay: delay + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      </span>
    );
  });

  if (reduce) {
    return (
      <Tag className={className}>
        {words.map((w, i) => {
          const clean = w.replace(/[.,!?]/g, '').toLowerCase();
          const isHi = highlight.map((h) => h.toLowerCase()).includes(clean);
          return (
            <span key={i} className={isHi ? 'text-brand' : ''}>
              {w}{' '}
            </span>
          );
        })}
      </Tag>
    );
  }

  return (
    <Tag className={className} aria-label={text} {...anim}>
      <span aria-hidden>{content}</span>
    </Tag>
  );
}
