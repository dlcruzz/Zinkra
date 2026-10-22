import Link from 'next/link';

/**
 * Marca em texto: "Zinkra." com Z e ponto em verde.
 * A fonte oficial (DT Getai Grotesk) não está no projeto; usamos Space Grotesk (font-brand).
 * Para trocar: adicione o arquivo da fonte e aponte a variável --font-brand em layout.tsx.
 */
export default function Logo({ className = '', asLink = true }: { className?: string; asLink?: boolean }) {
  const mark = (
    <span className={`font-brand font-bold tracking-tightest ${className}`} aria-label="Zinkra">
      <span className="text-brand">Z</span>inkra<span className="text-brand">.</span>
    </span>
  );
  if (!asLink) return mark;
  return (
    <Link href="/" aria-label="Zinkra, página inicial" className="inline-block text-2xl">
      {mark}
    </Link>
  );
}
