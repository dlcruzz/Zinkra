'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import Magnetic from './Magnetic';

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'md' | 'lg';
  external?: boolean;
  magnetic?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  'aria-label'?: string;
};

const base =
  'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-colors duration-500 ease-out will-change-transform disabled:opacity-60 disabled:pointer-events-none';
const sizes = { md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' };
const variants = {
  solid: 'bg-brand text-[#0A0C0B]',
  outline: 'border border-fg/25 text-fg hover:border-brand',
  ghost: 'text-fg hover:text-brand',
};

/** Botão com preenchimento que sobe no hover e texto que desliza. */
export default function Button({
  children,
  href,
  onClick,
  variant = 'solid',
  size = 'md',
  external,
  magnetic = true,
  className = '',
  type = 'button',
  disabled,
  ...rest
}: Props) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  const inner = (
    <>
      {/* camada que sobe no hover */}
      <span
        aria-hidden
        className={`absolute inset-0 translate-y-full rounded-[inherit] transition-transform duration-500 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0 ${
          variant === 'solid' ? 'bg-fg' : 'bg-brand'
        }`}
      />
      <span
        className={`relative z-10 flex items-center gap-2 transition-colors duration-500 ${
          variant === 'solid' ? 'group-hover:text-bg' : variant === 'outline' ? 'group-hover:text-[#0A0C0B]' : ''
        }`}
      >
        {children}
      </span>
    </>
  );

  const el = href ? (
    external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onClick} {...rest}>
        {inner}
      </a>
    ) : (
      <Link href={href} className={cls} onClick={onClick} {...rest}>
        {inner}
      </Link>
    )
  ) : (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} {...rest}>
      {inner}
    </button>
  );

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}

export function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
