/** Dados fixos da empresa e da navegação. */
export const SITE = {
  nome: 'Zinkra',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zinkra.com.br',
  descricao:
    'Software house em São Paulo. Criamos sites, landing pages, sistemas sob medida, PDV, sistemas financeiros e SaaS para empresas que querem crescer.',
  email: 'contato@zinkra.com.br',
  instagram: '@zinkra.dev',
  instagramUrl: 'https://instagram.com/zinkra.dev',
  whatsappNumero: '5511941164044',
  whatsappTexto: '(11) 94116-4044',
  cnpj: '64.312.169/0001-60',
  cidade: 'São Paulo, SP',
} as const;

export function whatsappLink(mensagem = 'Olá! Vim pelo site da Zinkra e quero pedir um orçamento.') {
  return `https://wa.me/${SITE.whatsappNumero}?text=${encodeURIComponent(mensagem)}`;
}

export const NAV_ITENS = [
  { rotulo: 'Início', href: '/' },
  { rotulo: 'Sobre', href: '/sobre' },
  { rotulo: 'Projetos', href: '/projetos' },
  { rotulo: 'Soluções', href: '/solucoes/sites-e-landing-pages', menu: 'solucoes' as const },
  { rotulo: 'Tecnologia', href: '/#tecnologia', menu: 'tecnologia' as const },
  { rotulo: 'Contato', href: '/contato' },
];

/** Colunas do menu grande de Soluções. Cada item aponta para a página da solução correspondente. */
export const MENU_SOLUCOES = [
  {
    titulo: 'Sites e páginas',
    itens: [
      { rotulo: 'Sites institucionais', href: '/solucoes/sites-e-landing-pages' },
      { rotulo: 'Landing pages', href: '/solucoes/sites-e-landing-pages' },
      { rotulo: 'Lojas virtuais', href: '/solucoes/sites-e-landing-pages' },
    ],
  },
  {
    titulo: 'Sistemas',
    itens: [
      { rotulo: 'Sistemas sob medida', href: '/solucoes/sistemas-sob-medida-e-erp' },
      { rotulo: 'ERP', href: '/solucoes/sistemas-sob-medida-e-erp' },
      { rotulo: 'PDV (frente de caixa)', href: '/solucoes/pdv-frente-de-caixa' },
      { rotulo: 'Sistema financeiro', href: '/solucoes/sistema-financeiro' },
      { rotulo: 'Agendamento e gestão', href: '/solucoes/sistemas-sob-medida-e-erp' },
    ],
  },
  {
    titulo: 'Produtos',
    itens: [
      { rotulo: 'SaaS (software como serviço)', href: '/solucoes/saas' },
      { rotulo: 'Painéis e relatórios', href: '/solucoes/sistemas-sob-medida-e-erp' },
      { rotulo: 'Automações', href: '/solucoes/automacao-e-ia' },
    ],
  },
  {
    titulo: 'Crescimento',
    itens: [
      { rotulo: 'Tráfego pago', href: '/solucoes/trafego-pago-e-redes-sociais' },
      { rotulo: 'Gestão de redes sociais', href: '/solucoes/trafego-pago-e-redes-sociais' },
      { rotulo: 'Identidade visual', href: '/solucoes/trafego-pago-e-redes-sociais' },
    ],
  },
];

export const MENU_TECNOLOGIA = [
  { rotulo: 'React', desc: 'Interfaces rápidas e reaproveitáveis' },
  { rotulo: 'Next.js', desc: 'Sites que carregam em um piscar' },
  { rotulo: 'Node.js', desc: 'Servidores e integrações' },
  { rotulo: 'Supabase', desc: 'Banco de dados e login' },
  { rotulo: 'Vercel', desc: 'Publicação com segurança' },
  { rotulo: 'IA e automação', desc: 'Tarefas que se resolvem sozinhas' },
];

export const LINKS_RODAPE = [
  { rotulo: 'Início', href: '/' },
  { rotulo: 'Sobre', href: '/sobre' },
  { rotulo: 'Projetos', href: '/projetos' },
  { rotulo: 'Soluções', href: '/solucoes/sites-e-landing-pages' },
  { rotulo: 'Contato', href: '/contato' },
];
