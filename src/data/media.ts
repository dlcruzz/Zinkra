/**
 * Único lugar com os caminhos de mídia do site.
 * Coloque os arquivos em /public/media/ com EXATAMENTE estes nomes.
 * Se um arquivo não existir, o componente <Media> mostra um fundo de reserva
 * (degradê verde escuro com granulado) e a página continua funcionando.
 */
export const MEDIA_DIR = '/media';

export const media = {
  video: {
    heroShowreel: `${MEDIA_DIR}/hero-showreel.mp4`, // modal de apresentação, 16:9, 20 a 40 s
    heroLoop: `${MEDIA_DIR}/hero-loop.mp4`, // fundo da abertura, 8 a 10 s, sem som
    solucoesSistemas: `${MEDIA_DIR}/solucoes-sistemas.mp4`, // loops de 5 a 8 s para os cartões
    solucoesSites: `${MEDIA_DIR}/solucoes-sites.mp4`,
    solucoesPdv: `${MEDIA_DIR}/solucoes-pdv.mp4`,
    solucoesSaas: `${MEDIA_DIR}/solucoes-saas.mp4`,
    processoLoop: `${MEDIA_DIR}/processo-loop.mp4`,
    ctaLoop: `${MEDIA_DIR}/cta-loop.mp4`,
  },
  image: {
    heroPoster: `${MEDIA_DIR}/hero-poster.jpg`,
    sobreEquipe: `${MEDIA_DIR}/sobre-equipe.jpg`,
    caseKingmidia: `${MEDIA_DIR}/case-kingmidia.jpg`,
    caseDaniely: `${MEDIA_DIR}/case-daniely.jpg`,
    caseSantosferreira: `${MEDIA_DIR}/case-santosferreira.jpg`,
    caseSistemaFinanceiro: `${MEDIA_DIR}/case-sistema-financeiro.jpg`,
    casePdv: `${MEDIA_DIR}/case-pdv.jpg`,
    caseSaas: `${MEDIA_DIR}/case-saas.jpg`,
    ogImage: `${MEDIA_DIR}/og-image.jpg`, // 1200x630
    ruido: `${MEDIA_DIR}/ruido.png`, // granulado fino e transparente
    // Foto real do fundador (já existia no site antigo).
    fundador: `${MEDIA_DIR}/fundador-danilo.png`,
  },
} as const;
