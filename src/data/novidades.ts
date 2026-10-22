/** Lista de novidades. Itens marcados com PREENCHER são exemplos: troque pelos reais. */
export type Novidade = {
  data: string;
  iso: string;
  categoria: 'Lançamento' | 'Parceria' | 'Conteúdo';
  titulo: string;
  href?: string;
};

export const novidades: Novidade[] = [
  { data: '20 out 2026', iso: '2026-10-20', categoria: 'Lançamento', titulo: 'Primeira versão do site da Santos Ferreira Contábil entregue', href: '/projetos/santos-ferreira-contabil' },
  { data: '22 set 2026', iso: '2026-09-22', categoria: 'Lançamento', titulo: 'Sistema de sinalização digital da King Mídia entra em operação', href: '/projetos/king-midia' },
  { data: '21 ago 2026', iso: '2026-08-21', categoria: 'Lançamento', titulo: 'Site da clínica Nexus Psicopedagogia passa a ter domínio próprio', href: '/projetos/daniely-psicopedagoga' }, // PREENCHER: confirmar texto
  { data: '01 out 2026', iso: '2026-10-01', categoria: 'Conteúdo', titulo: 'Site institucional ou landing page: qual escolher para o seu negócio?' }, // PREENCHER: exemplo, ligar ao conteúdo real
];
