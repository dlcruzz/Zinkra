import { media } from './media';

export type Projeto = {
  slug: string;
  nome: string;
  tipo: string;
  ano: string;
  imagem: string;
  /** true = projeto conceito / em breve (ainda sem case real confirmado) */
  conceito: boolean;
  resumo: string;
  problema: string;
  solucao: string;
  resultado: string;
  tecnologias: string[];
  /** Imagens extras da galeria. PREENCHER depois com as mídias reais. */
  galeria: string[];
};

export const projetos: Projeto[] = [
  {
    slug: 'king-midia',
    nome: 'King Mídia',
    tipo: 'Sistema de sinalização digital para TVs',
    ano: '2026',
    imagem: media.image.caseKingmidia,
    conceito: false,
    resumo:
      'Uma plataforma própria para gerenciar, à distância, as TVs que exibem anúncios em ambientes comerciais.',
    problema:
      'A King Mídia vende espaço publicitário em telas instaladas em ambientes comerciais e precisava controlar tudo isso sem alugar plataforma de terceiros: o que passa em cada TV, quando passa e quais telas estão no ar. Sem um sistema, cada atualização dependia de ir até o local.',
    solucao:
      'Construímos um painel online para cadastrar telas, montar playlists e agendar conteúdo por data e horário, e um aplicativo Android que roda nas TVs, recebe tudo automaticamente e continua exibindo mesmo sem internet, sincronizando quando a conexão volta. O painel mostra também quais telas estão online.',
    resultado:
      'O sistema foi entregue e está em operação. A King Mídia controla as telas de forma centralizada e passou a depender de uma ferramenta própria, pensada para crescer junto com a rede de TVs.',
    tecnologias: ['React', 'Node.js', 'PostgreSQL', 'Android'],
    galeria: [],
  },
  {
    slug: 'daniely-psicopedagoga',
    nome: 'Daniely Psicopedagoga',
    tipo: 'Site profissional',
    ano: '2026',
    imagem: media.image.caseDaniely,
    conceito: false,
    resumo:
      'Site de uma clínica de psicopedagogia, com identidade visual própria e foco em gerar contatos pelo WhatsApp.',
    problema:
      'A profissional atendia por indicação e tinha pouca presença na busca. Faltava um lugar para apresentar a clínica, as áreas de atuação e facilitar o primeiro contato das famílias.',
    solucao:
      'Criamos um site de uma página com apresentação, áreas de atuação, como funciona o atendimento, perguntas frequentes e contato direto pelo WhatsApp, além da identidade visual (logo e padrão de cores). O visual tem animações e interações cuidadosas, sem pesar no celular.',
    resultado:
      'O site está no ar com domínio próprio e deu à clínica um endereço profissional para divulgar nas redes e nas conversas com as famílias.',
    tecnologias: ['React', 'Vercel', 'Tailwind CSS'],
    galeria: [],
  },
  {
    slug: 'santos-ferreira-contabil',
    nome: 'Santos Ferreira Contábil',
    tipo: 'Site para escritório contábil',
    ano: '2026',
    imagem: media.image.caseSantosferreira,
    conceito: false,
    resumo:
      'Site institucional sóbrio para um escritório de contabilidade, com a cara de tradição e confiança que o setor pede.',
    problema:
      'Escritórios de contabilidade vivem de confiança, e um site genérico passa o contrário. O escritório precisava de uma presença digital que transmitisse seriedade e explicasse os serviços sem juridiquês.',
    solucao:
      'Desenvolvemos um site institucional de uma página: apresentação do escritório, os serviços em linguagem direta, números, contato e rodapé institucional. A identidade segue o logotipo do cliente, com tipografia clássica e paleta em azul-marinho e dourado.',
    resultado:
      'A primeira versão foi entregue. Os dados de contato definitivos e as fotos reais do escritório entram na etapa de publicação.',
    tecnologias: ['HTML', 'CSS', 'SVG'],
    galeria: [],
  },
  {
    slug: 'sistema-financeiro',
    nome: 'Sistema financeiro',
    tipo: 'Projeto conceito · Gestão financeira',
    ano: '2026',
    imagem: media.image.caseSistemaFinanceiro,
    conceito: true,
    resumo:
      'Um conceito de sistema para organizar contas, cobranças e fluxo de caixa de pequenas e médias empresas.',
    problema:
      'Muitas empresas controlam o dinheiro em planilhas que só uma pessoa entende, e perdem cobranças e vencimentos no meio do caminho.',
    solucao:
      'O conceito reúne contas a pagar e a receber, fluxo de caixa, cobranças com lembrete e relatórios em um painel simples, com perfis de acesso para cada pessoa da equipe.',
    resultado: 'Projeto conceito, em construção. Os resultados reais serão publicados quando houver um caso confirmado.',
    tecnologias: ['React', 'Node.js', 'PostgreSQL', 'Supabase'],
    galeria: [],
  },
  {
    slug: 'pdv',
    nome: 'PDV',
    tipo: 'Projeto conceito · Frente de caixa',
    ano: '2026',
    imagem: media.image.casePdv,
    conceito: true,
    resumo: 'Um conceito de frente de caixa rápida para pequenos comércios, com estoque e caixa em tempo real.',
    problema:
      'O comércio de bairro ainda anota venda no caderno ou usa sistemas pesados, caros e difíceis de aprender para o balcão.',
    solucao:
      'O conceito pensa em venda com poucos cliques, baixa automática de estoque, abertura e fechamento de caixa e um relatório simples no fim do dia, rodando no navegador.',
    resultado: 'Projeto conceito, em construção. Os resultados reais serão publicados quando houver um caso confirmado.',
    tecnologias: ['React', 'Node.js', 'PostgreSQL'],
    galeria: [],
  },
  {
    slug: 'saas',
    nome: 'SaaS',
    tipo: 'Projeto conceito · Software como serviço',
    ano: '2026',
    imagem: media.image.caseSaas,
    conceito: true,
    resumo: 'Um conceito de produto por assinatura, do cadastro à cobrança mensal, pronto para receber clientes.',
    problema:
      'Quem tem uma ideia de software costuma travar na parte invisível: login, planos, cobrança recorrente e painel de administração.',
    solucao:
      'O conceito entrega a base completa de um SaaS: cadastro e login, planos, cobrança recorrente e painel administrativo, para a ideia de negócio ser a única coisa que falta construir.',
    resultado: 'Projeto conceito, em construção. Os resultados reais serão publicados quando houver um caso confirmado.',
    tecnologias: ['Next.js', 'TypeScript', 'Supabase', 'Vercel'],
    galeria: [],
  },
];

export const getProjeto = (slug: string) => projetos.find((p) => p.slug === slug);
