import { media } from './media';

export type Solucao = {
  slug: string;
  titulo: string;
  tituloCurto: string;
  frase: string;
  video: string | null;
  oQueE: string;
  paraQuem: string[];
  incluso: string[];
  tecnologias: string[];
  faq: { p: string; r: string }[];
};

export const solucoes: Solucao[] = [
  {
    slug: 'sites-e-landing-pages',
    titulo: 'Sites e landing pages',
    tituloCurto: 'Sites e landing pages',
    frase: 'Páginas rápidas, bonitas e feitas para converter.',
    video: media.video.solucoesSites,
    oQueE:
      'Sites institucionais, páginas de captação e lojas virtuais pensados para uma coisa: transformar visita em contato. Cuidamos do texto, do visual, da velocidade e da busca no Google, para a sua empresa ser encontrada e escolhida.',
    paraQuem: [
      'Profissionais e clínicas que ainda dependem só do Instagram para ser encontrados',
      'Empresas com site antigo, lento ou que não aparece direito no celular',
      'Quem vai rodar anúncios e precisa de uma página que transforme o clique em conversa',
    ],
    incluso: [
      'Design exclusivo, sem modelo pronto',
      'Versão para celular feita primeiro',
      'Botão de WhatsApp e formulário de contato',
      'Otimização para o Google (títulos, descrições, velocidade)',
      'Publicação, domínio e certificado de segurança',
      'Treinamento rápido para você editar o que precisar',
    ],
    tecnologias: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
    faq: [
      { p: 'Quanto tempo leva para ficar pronto?', r: 'Depende do tamanho, mas uma landing page costuma sair em poucos dias e um site institucional em algumas semanas. Combinamos o prazo na proposta, antes de começar.' },
      { p: 'Eu consigo alterar os textos depois?', r: 'Sim. Podemos entregar com um painel simples para você mesmo editar, ou cuidar das alterações para você.' },
      { p: 'O site aparece no Google?', r: 'Construímos o site já preparado para a busca: títulos, descrições, velocidade e dados estruturados. Aparecer em primeiro lugar depende também de concorrência e tempo, e explicamos isso com clareza.' },
      { p: 'Vocês fazem loja virtual?', r: 'Fazemos. Catálogo, carrinho, pagamento e entrega, no tamanho que o seu negócio precisa agora e com espaço para crescer.' },
    ],
  },
  {
    slug: 'sistemas-sob-medida-e-erp',
    titulo: 'Sistemas sob medida e ERP',
    tituloCurto: 'Sistemas sob medida e ERP',
    frase: 'Do controle de estoque ao financeiro, tudo em um só lugar.',
    video: media.video.solucoesSistemas,
    oQueE:
      'Um sistema desenhado em cima do jeito que a sua empresa realmente trabalha. Em vez de adaptar o seu processo a um software pronto, construímos o software em volta do processo: cadastros, estoque, vendas, tarefas, agendamentos, painéis e relatórios.',
    paraQuem: [
      'Empresas que vivem em planilhas e perdem tempo conferindo números',
      'Negócios com um processo próprio que nenhum software pronto atende bem',
      'Quem quer ser dono do sistema e não pagar licença para sempre',
    ],
    incluso: [
      'Levantamento do seu processo antes de qualquer código',
      'Controle de acesso por perfil de usuário',
      'Painéis e relatórios com os números que você usa',
      'Importação dos seus dados atuais (planilhas, por exemplo)',
      'Entregas em etapas curtas, para você ver e opinar',
      'Treinamento da equipe e suporte depois da publicação',
    ],
    tecnologias: ['React', 'Node.js', 'PostgreSQL', 'Supabase'],
    faq: [
      { p: 'Qual a diferença para um software pronto?', r: 'O software pronto atende o padrão do mercado. O sistema sob medida atende o seu jeito de trabalhar, sem módulos que você não usa e sem gambiarra para o que falta.' },
      { p: 'O sistema fica sendo meu?', r: 'Conversamos isso na proposta. É possível entregar com o código e a documentação, para você não depender de ninguém.' },
      { p: 'Posso começar pequeno e crescer depois?', r: 'Deve. Começamos pelo que dói mais e evoluímos por etapas, com a arquitetura já preparada para receber novos módulos.' },
    ],
  },
  {
    slug: 'pdv-frente-de-caixa',
    titulo: 'PDV e frente de caixa',
    tituloCurto: 'PDV e frente de caixa',
    frase: 'Venda rápido, controle caixa e estoque em tempo real.',
    video: media.video.solucoesPdv,
    oQueE:
      'Uma frente de caixa simples de operar, que registra a venda, baixa o estoque e fecha o caixa sem conferência manual. Pensada para o balcão: poucos cliques, leitura rápida e funcionamento sem travar.',
    paraQuem: [
      'Lojas, lanchonetes e comércios de bairro que ainda anotam venda no caderno',
      'Negócios que querem saber o que vendeu, o que sobrou e quanto entrou no caixa',
      'Quem precisa de um PDV com a cara e as regras do seu negócio',
    ],
    incluso: [
      'Venda por código, busca ou toque na tela',
      'Abertura e fechamento de caixa',
      'Baixa automática de estoque',
      'Formas de pagamento e controle de troco',
      'Relatório diário de vendas',
      'Integração com impressora e leitor, quando o equipamento permitir',
    ],
    tecnologias: ['React', 'Node.js', 'PostgreSQL'],
    faq: [
      { p: 'Funciona se a internet cair?', r: 'É um ponto que definimos junto com você. Dá para planejar o PDV para continuar vendendo sem conexão e sincronizar depois.' },
      { p: 'Emite nota fiscal?', r: 'A emissão fiscal depende de integração com serviços especializados. Avaliamos o que o seu negócio exige antes de prometer.' },
      { p: 'Roda em qualquer computador?', r: 'Roda pelo navegador, em computador, tablet ou celular, sem instalar nada pesado.' },
    ],
  },
  {
    slug: 'sistema-financeiro',
    titulo: 'Sistema financeiro',
    tituloCurto: 'Sistema financeiro',
    frase: 'Contas, cobranças e fluxo de caixa sem planilha confusa.',
    video: media.video.solucoesFinanceiro,
    oQueE:
      'Um sistema para organizar o dinheiro da empresa: contas a pagar e a receber, cobranças, fluxo de caixa e relatórios. Você enxerga o que entrou, o que vai sair e o que sobra, sem depender de uma planilha que só uma pessoa entende.',
    paraQuem: [
      'Empresas que cobram clientes e perdem o controle de quem pagou',
      'Donos que querem ver o caixa do mês sem abrir dez abas de planilha',
      'Negócios com mais de uma pessoa mexendo nas finanças',
    ],
    incluso: [
      'Contas a pagar e a receber',
      'Fluxo de caixa com visão por período',
      'Cobranças e lembretes de vencimento',
      'Categorias, centros de custo e relatórios',
      'Perfis de acesso (quem vê e quem edita)',
      'Exportação para o seu contador',
    ],
    tecnologias: ['React', 'Node.js', 'PostgreSQL', 'Supabase'],
    faq: [
      { p: 'Integra com banco ou meio de pagamento?', r: 'Podemos integrar com serviços de cobrança e conciliação. Cada integração tem custo de terceiros, e deixamos isso claro na proposta.' },
      { p: 'Substitui o meu contador?', r: 'Não. O sistema organiza o dia a dia e facilita o trabalho dele, que continua cuidando da parte contábil e fiscal.' },
      { p: 'Meus dados ficam seguros?', r: 'Usamos login protegido, controle de acesso por perfil e banco de dados com cópias de segurança.' },
    ],
  },
  {
    slug: 'saas',
    titulo: 'SaaS',
    tituloCurto: 'SaaS',
    frase: 'Da ideia ao produto no ar, pronto para cobrar mensalidade.',
    video: media.video.solucoesSaas,
    oQueE:
      'Construímos o seu software como serviço do zero: cadastro de clientes, login, planos, cobrança recorrente, painel administrativo e a infraestrutura para crescer. Você leva a ideia, a gente leva o produto ao ar.',
    paraQuem: [
      'Quem tem uma ideia de produto digital e precisa tirá-la do papel',
      'Empresas que querem transformar um processo interno em produto vendável',
      'Empreendedores que querem validar rápido antes de investir pesado',
    ],
    incluso: [
      'Planejamento do produto e do que entra na primeira versão',
      'Cadastro, login e recuperação de senha',
      'Planos e cobrança recorrente',
      'Painel administrativo para você acompanhar os clientes',
      'Infraestrutura pronta para crescer',
      'Evolução contínua depois do lançamento',
    ],
    tecnologias: ['Next.js', 'TypeScript', 'PostgreSQL', 'Supabase', 'Vercel'],
    faq: [
      { p: 'Por onde começamos?', r: 'Por uma conversa de diagnóstico. Definimos o menor produto que já resolve o problema e pode ser vendido, e construímos isso primeiro.' },
      { p: 'Preciso ter dinheiro para tudo de uma vez?', r: 'Não. Trabalhamos em etapas curtas, e o escopo da primeira versão é pensado para você chegar ao mercado sem estourar o orçamento.' },
      { p: 'O produto é meu?', r: 'Sim. A ideia e o produto são seus, e combinamos na proposta como fica o código e a hospedagem.' },
    ],
  },
  {
    slug: 'automacao-e-ia',
    titulo: 'Automação e IA',
    tituloCurto: 'Automação e IA',
    frase: 'Tire do braço o que o computador faz sozinho.',
    video: null,
    oQueE:
      'Pegamos as tarefas repetitivas da sua rotina (copiar dados, responder as mesmas perguntas, gerar relatórios, avisar clientes) e fazemos o computador cuidar delas. Usamos inteligência artificial onde ela ajuda de verdade, e regras simples onde basta.',
    paraQuem: [
      'Equipes que perdem horas por semana em tarefa repetitiva',
      'Negócios que atendem muito pelo WhatsApp e repetem as mesmas respostas',
      'Quem tem dados espalhados em sistemas que não conversam entre si',
    ],
    incluso: [
      'Mapeamento das tarefas que mais consomem tempo',
      'Integração entre os sistemas que você já usa',
      'Atendimento automático com regras e inteligência artificial',
      'Alertas e relatórios automáticos',
      'Acompanhamento do que foi automatizado',
    ],
    tecnologias: ['Node.js', 'IA', 'APIs', 'Supabase'],
    faq: [
      { p: 'A IA substitui a minha equipe?', r: 'Não é a proposta. A ideia é tirar o trabalho chato das pessoas para sobrar tempo para o que exige cabeça e relacionamento.' },
      { p: 'Dá para automatizar o WhatsApp?', r: 'Dá, respeitando as regras da plataforma. Avaliamos o que é possível e seguro para o seu caso.' },
      { p: 'Como sei se vale a pena?', r: 'Estimamos quanto tempo a tarefa consome hoje. Se a economia não compensar, dizemos que não vale automatizar.' },
    ],
  },
  {
    slug: 'trafego-pago-e-redes-sociais',
    titulo: 'Tráfego pago e redes sociais',
    tituloCurto: 'Tráfego pago e redes sociais',
    frase: 'Atraia clientes e mantenha a marca viva.',
    video: null,
    oQueE:
      'Anúncios que levam a gente certa para o seu site ou WhatsApp, e uma presença nas redes sociais com cara de empresa séria. Cuidamos de campanhas, conteúdo e identidade visual para o seu site e os seus anúncios falarem a mesma língua.',
    paraQuem: [
      'Negócios que já têm site e agora precisam de visitas',
      'Quem posta de vez em quando e quer constância',
      'Marcas que precisam de uma identidade visual coerente',
    ],
    incluso: [
      'Planejamento de campanhas e público',
      'Criação dos anúncios e acompanhamento dos resultados',
      'Calendário e criação de conteúdo para redes sociais',
      'Identidade visual: logo, cores e padrão de posts',
      'Relatório do que funcionou e do que ajustar',
    ],
    tecnologias: ['Meta Ads', 'Google Ads', 'Analytics'],
    faq: [
      { p: 'O dinheiro dos anúncios está incluso?', r: 'Não. O valor investido em anúncio vai direto para a plataforma, e o nosso trabalho é separado. Deixamos isso claro desde o início.' },
      { p: 'Em quanto tempo vejo resultado?', r: 'Os primeiros sinais aparecem rápido, mas campanha boa se ajusta com o tempo. Acompanhamos e corrigimos o caminho com você.' },
      { p: 'Preciso ter um site primeiro?', r: 'Ajuda muito. Um site ou uma página bem feita aumenta a chance de o clique virar cliente.' },
    ],
  },
];

export const getSolucao = (slug: string) => solucoes.find((s) => s.slug === slug);
