/** Ícones de linha simples (SVG), desenhados para o site. Sem imagens pesadas. */
type P = { className?: string; size?: number };

const base = (size = 32) => ({
  width: size,
  height: size,
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function SolucaoIcon({ slug, size = 36 }: { slug: string; size?: number }) {
  const p = base(size);
  switch (slug) {
    case 'sites-e-landing-pages':
      return (
        <svg {...p}><rect x="3" y="6" width="26" height="20" rx="3" /><path d="M3 12h26M8 9h.01M11.5 9h.01M15 9h.01" /><path d="M9 18h8M9 21.5h5" /></svg>
      );
    case 'sistemas-sob-medida-e-erp':
      return (
        <svg {...p}><rect x="4" y="4" width="10" height="10" rx="2" /><rect x="18" y="4" width="10" height="10" rx="2" /><rect x="4" y="18" width="10" height="10" rx="2" /><path d="M18 23h10M23 18v10" /></svg>
      );
    case 'pdv-frente-de-caixa':
      return (
        <svg {...p}><rect x="6" y="3" width="20" height="9" rx="2" /><path d="M4 16h24v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM9 20h.01M14 20h.01M19 20h.01M9 24h.01M14 24h.01M19 24h5" /></svg>
      );
    case 'sistema-financeiro':
      return (
        <svg {...p}><path d="M4 26h24M7 22v-6M14 22V9M21 22v-9M27 22V5" /><path d="M5 11l6-3 6 4 9-7" /></svg>
      );
    case 'saas':
      return (
        <svg {...p}><path d="M9 24a6 6 0 0 1-.5-12A8 8 0 0 1 24 12a5.5 5.5 0 0 1-.5 12z" /><path d="M13 19l3-3 3 3M16 16v7" /></svg>
      );
    case 'automacao-e-ia':
      return (
        <svg {...p}><path d="M16 4l2.2 6.3L25 12l-6.8 1.7L16 20l-2.2-6.3L7 12l6.8-1.7zM25 21l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" /></svg>
      );
    default:
      return (
        <svg {...p}><path d="M4 22l7-8 5 5 6-9 6 6" /><path d="M4 28h24" /></svg>
      );
  }
}

/** Ícones das etapas do processo. `n` é a etapa de 1 a 6. */
export function EtapaIcon({ n, size = 64 }: { n: number; size?: number }) {
  const p = { ...base(size), strokeWidth: 1.4 };
  const dp = (len: number) => ({ className: 'draw-path', style: { ['--len' as string]: len } as React.CSSProperties });
  switch (n) {
    case 1: // conversa
      return (
        <svg {...p}><path {...dp(110)} d="M5 7h17a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H13l-5 4v-4H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /><path {...dp(40)} d="M9 12h9M9 15.5h6" /></svg>
      );
    case 2: // proposta e prazo
      return (
        <svg {...p}><rect {...dp(100)} x="6" y="4" width="20" height="24" rx="2" /><path {...dp(40)} d="M11 11h10M11 16h10M11 21h5" /><circle {...dp(30)} cx="22" cy="22" r="3.5" /></svg>
      );
    case 3: // design
      return (
        <svg {...p}><path {...dp(90)} d="M6 26l4-1 15-15a2.8 2.8 0 0 0-4-4L6 21z" /><path {...dp(20)} d="M19 8l5 5" /></svg>
      );
    case 4: // código
      return (
        <svg {...p}><path {...dp(40)} d="M11 10l-6 6 6 6" /><path {...dp(40)} d="M21 10l6 6-6 6" /><path {...dp(26)} d="M18 6l-4 20" /></svg>
      );
    case 5: // publicação (foguete)
      return (
        <svg {...p}><path {...dp(110)} d="M16 3c5 3 8 8 7 15l-4 3h-6l-4-3C8 11 11 6 16 3z" /><circle {...dp(20)} cx="16" cy="13" r="2.4" /><path {...dp(30)} d="M10 23l-3 5M22 23l3 5" /></svg>
      );
    default: // suporte e evolução (ciclo)
      return (
        <svg {...p}><path {...dp(60)} d="M26 16a10 10 0 0 1-17.5 6.6" /><path {...dp(60)} d="M6 16a10 10 0 0 1 17.5-6.6" /><path {...dp(14)} d="M24 4v6h-6M8 28v-6h6" /></svg>
      );
  }
}

/** Ícones simples das tecnologias (desenhos próprios, não os logos oficiais). */
export function TechIcon({ nome, size = 48 }: { nome: string; size?: number }) {
  const p = { ...base(size), viewBox: '0 0 48 48', strokeWidth: 2 };
  switch (nome) {
    case 'React':
      return (
        <svg {...p}><circle cx="24" cy="24" r="3" fill="currentColor" /><ellipse cx="24" cy="24" rx="19" ry="7.5" /><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)" /><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(120 24 24)" /></svg>
      );
    case 'Next.js':
      return (
        <svg {...p}><circle cx="24" cy="24" r="19" /><path d="M18 17v14M18 17l14 16M31 17v9" /></svg>
      );
    case 'TypeScript':
      return (
        <svg {...p}><rect x="5" y="5" width="38" height="38" rx="5" /><path d="M14 22h12M20 22v14M36 24c-1.5-2-6-2.5-6 .6 0 3.6 6.5 2 6.5 5.6 0 3.4-5.5 3.4-7.5.8" /></svg>
      );
    case 'Node.js':
      return (
        <svg {...p}><path d="M24 4l17 10v20L24 44 7 34V14z" /><path d="M24 15v18M17 20v8a3 3 0 0 0 3 3h0M31 18v9" /></svg>
      );
    case 'Supabase':
      return (
        <svg {...p}><path d="M26 4L8 27h14l-2 17 20-25H26z" /></svg>
      );
    case 'PostgreSQL':
      return (
        <svg {...p}><ellipse cx="24" cy="11" rx="15" ry="6" /><path d="M9 11v13c0 3.3 6.7 6 15 6s15-2.7 15-6V11M9 24v13c0 3.3 6.7 6 15 6s15-2.7 15-6V24" /></svg>
      );
    case 'Vercel':
      return (
        <svg {...p}><path d="M24 7l19 33H5z" /></svg>
      );
    case 'Tailwind CSS':
      return (
        <svg {...p}><path d="M5 19c2-6 6-9 12-9 9 0 10 8 17 8 3 0 6-2 9-6-2 6-6 9-12 9-9 0-10-8-17-8-3 0-6 2-9 6zM5 33c2-6 6-9 12-9 9 0 10 8 17 8 3 0 6-2 9-6-2 6-6 9-12 9-9 0-10-8-17-8-3 0-6 2-9 6z" /></svg>
      );
    default: // IA
      return (
        <svg {...p}><path d="M24 5l3.5 10L38 18.5 27.5 22 24 32l-3.5-10L10 18.5 20.5 15zM38 32l1.5 4.5L44 38l-4.5 1.5L38 44l-1.5-4.5L32 38l4.5-1.5z" /></svg>
      );
  }
}
