import Link from 'next/link';

/**
 * Logo oficial da Zinkra (wordmark DT Getai Grotesk, "ZinKra." com Z e ponto verdes).
 * Duas versões: texto branco (tema escuro) e texto escuro (tema claro); o CSS troca conforme o tema.
 */
export default function Logo({ className = 'h-7', asLink = true }: { className?: string; asLink?: boolean }) {
  const mark = (
    <span className="relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/zinkra-logo.png" alt="Zinkra" width={804} height={155} className={`logo-dark-theme w-auto ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/zinkra-logo-escuro.png" alt="" aria-hidden width={804} height={155} className={`logo-light-theme w-auto ${className}`} />
    </span>
  );
  if (!asLink) return mark;
  return (
    <Link href="/" aria-label="Zinkra, página inicial" className="inline-block">
      {mark}
    </Link>
  );
}
