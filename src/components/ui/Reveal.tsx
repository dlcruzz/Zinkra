'use client';
import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'article';
};

/** Revelação suave ao entrar na tela: sobe e aparece. `delay` escalona itens de uma lista. */
export default function Reveal({ children, delay = 0, y = 36, className, as = 'div' }: Props) {
  const reduce = useReducedMotion();
  const Tag = motion[as as keyof typeof motion] as ElementType;
  if (reduce) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
