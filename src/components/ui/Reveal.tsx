import type { CSSProperties, ElementType, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'article';
};

/**
 * Revelação suave ao entrar na tela: sobe e aparece. `delay` escalona itens de uma lista.
 *
 * É só marcação (componente de servidor, sem JavaScript próprio): o <RevealObserver /> global
 * observa todos os elementos .reveal da página e adiciona "is-in" quando eles aparecem.
 * Isso evita hidratar uma centena de componentes pequenos e deixa a página mais leve.
 */
export default function Reveal({ children, delay = 0, y = 36, className = '', as = 'div' }: Props) {
  const Tag = as as ElementType;
  const style = { '--ry': `${y}px`, '--rd': `${delay}s` } as CSSProperties;
  return (
    <Tag className={`reveal ${className}`} style={style}>
      {children}
    </Tag>
  );
}
