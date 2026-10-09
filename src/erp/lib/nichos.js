// Catálogo de públicos para captar e prospectar.
// Cada área tem a versão PROFISSIONAL (a pessoa que decide: dentista, advogado, contador…)
// e a versão EMPRESA (clínica, escritório, onde quem atende quase sempre é recepção).
// Aqui NÃO existe nota de dificuldade: quem decide isso são os resultados registrados (lib/nicheScore.js).

const AREAS = [
  ['Saúde', [
    ['Dentista', 'Clínica odontológica'],
    ['Ortodontista', 'Clínica de ortodontia'],
    ['Nutricionista', 'Clínica de nutrição'],
    ['Psicólogo', 'Clínica de psicologia'],
    ['Psicopedagogo', 'Clínica de psicopedagogia'],
    ['Fisioterapeuta', 'Clínica de fisioterapia'],
    ['Fonoaudiólogo', 'Clínica de fonoaudiologia'],
    ['Terapeuta ocupacional', 'Clínica de terapia ocupacional'],
    ['Dermatologista', 'Clínica dermatológica'],
    ['Cardiologista', 'Clínica de cardiologia'],
    ['Ginecologista', 'Clínica ginecológica'],
    ['Pediatra', 'Clínica pediátrica'],
    ['Ortopedista', 'Clínica ortopédica'],
    ['Oftalmologista', 'Clínica oftalmológica'],
    ['Otorrinolaringologista', 'Clínica de otorrino'],
    ['Psiquiatra', 'Clínica psiquiátrica'],
    ['Endocrinologista', 'Clínica de endocrinologia'],
    ['Urologista', 'Clínica urológica'],
    ['Cirurgião plástico', 'Clínica de cirurgia plástica'],
    ['Médico clínico geral', 'Clínica médica'],
    ['Podólogo', 'Clínica de podologia'],
    ['Quiropraxista', 'Clínica de quiropraxia'],
    ['Acupunturista', 'Clínica de acupuntura'],
    ['Osteopata', 'Clínica de osteopatia'],
    ['Biomédico esteta', 'Clínica de estética'],
    ['Enfermeiro (home care)', 'Empresa de home care'],
    ['Farmacêutico', 'Farmácia de manipulação'],
    ['Médico veterinário', 'Clínica veterinária'],
  ]],
  ['Jurídico e negócios', [
    ['Advogado', 'Escritório de advocacia'],
    ['Advogado trabalhista', 'Escritório de direito trabalhista'],
    ['Advogado previdenciário', 'Escritório de direito previdenciário'],
    ['Advogado de família', 'Escritório de direito de família'],
    ['Contador', 'Escritório de contabilidade'],
    ['Consultor financeiro', 'Consultoria financeira'],
    ['Corretor de seguros', 'Corretora de seguros'],
    ['Despachante', 'Despachante documentalista'],
    ['Consultor empresarial', 'Consultoria empresarial'],
    ['Tradutor', 'Agência de tradução'],
  ]],
  ['Casa e construção', [
    ['Arquiteto', 'Escritório de arquitetura'],
    ['Designer de interiores', 'Escritório de design de interiores'],
    ['Engenheiro civil', 'Construtora'],
    ['Paisagista', 'Empresa de paisagismo'],
    ['Marceneiro', 'Marcenaria'],
    ['Eletricista', 'Empresa de instalações elétricas'],
    ['Encanador', 'Empresa de hidráulica'],
    ['Pintor', 'Empresa de pintura'],
    ['Serralheiro', 'Serralheria'],
    ['Vidraceiro', 'Vidraçaria'],
    ['Instalador de ar-condicionado', 'Empresa de climatização'],
    ['Instalador de energia solar', 'Empresa de energia solar'],
    ['Dedetizador', 'Dedetizadora'],
    ['Diarista', 'Empresa de limpeza'],
    ['Técnico em segurança eletrônica', 'Empresa de segurança eletrônica'],
  ]],
  ['Imóveis', [
    ['Corretor de imóveis', 'Imobiliária'],
    ['Avaliador de imóveis', 'Administradora de condomínios'],
  ]],
  ['Beleza e bem-estar', [
    ['Esteticista', 'Clínica de estética'],
    ['Cabeleireiro', 'Salão de beleza'],
    ['Barbeiro', 'Barbearia'],
    ['Manicure', 'Esmalteria'],
    ['Designer de sobrancelhas', 'Studio de sobrancelhas'],
    ['Lash designer', 'Studio de cílios'],
    ['Maquiador', 'Studio de maquiagem'],
    ['Massoterapeuta', 'Spa'],
    ['Depiladora', 'Clínica de depilação'],
    ['Tatuador', 'Estúdio de tatuagem'],
  ]],
  ['Esporte', [
    ['Personal trainer', 'Academia'],
    ['Professor de pilates', 'Studio de pilates'],
    ['Professor de yoga', 'Studio de yoga'],
    ['Professor de lutas', 'Academia de lutas'],
    ['Professor de natação', 'Escola de natação'],
    ['Professor de dança', 'Escola de dança'],
    ['Treinador de corrida', 'Assessoria esportiva'],
  ]],
  ['Educação', [
    ['Professor particular', 'Escola de reforço'],
    ['Professor de inglês', 'Escola de idiomas'],
    ['Professor de música', 'Escola de música'],
    ['Instrutor de autoescola', 'Autoescola'],
    ['Pedagogo', 'Escola particular'],
    ['Coach', 'Empresa de treinamentos'],
  ]],
  ['Alimentação', [
    ['Confeiteiro', 'Confeitaria'],
    ['Chef de cozinha', 'Restaurante'],
    ['Personal chef', 'Buffet'],
    ['Padeiro', 'Padaria'],
    ['Hamburgueiro', 'Hamburgueria'],
    ['Pizzaiolo', 'Pizzaria'],
    ['Cervejeiro artesanal', 'Cervejaria'],
    ['Marmiteiro', 'Empresa de marmitas'],
  ]],
  ['Eventos e criativos', [
    ['Fotógrafo', 'Estúdio de fotografia'],
    ['Videomaker', 'Produtora de vídeo'],
    ['Cerimonialista', 'Empresa de eventos'],
    ['Decorador de festas', 'Casa de festas'],
    ['DJ', 'Empresa de som e iluminação'],
    ['Designer gráfico', 'Agência de design'],
    ['Florista', 'Floricultura'],
  ]],
  ['Automotivo', [
    ['Mecânico', 'Oficina mecânica'],
    ['Funileiro', 'Funilaria e pintura'],
    ['Eletricista automotivo', 'Auto elétrica'],
    ['Lavador de carros', 'Lava-rápido'],
    ['Especialista em estética automotiva', 'Estética automotiva'],
    ['Vendedor de veículos', 'Loja de veículos'],
    ['Instrutor de direção', 'Centro de formação de condutores'],
  ]],
  ['Pets', [
    ['Adestrador', 'Escola de adestramento'],
    ['Tosador', 'Pet shop'],
    ['Pet sitter', 'Hotel para cães'],
  ]],
  ['Comércio e serviços', [
    ['Costureira', 'Ateliê de costura'],
    ['Sapateiro', 'Sapataria'],
    ['Chaveiro', 'Chaveiro 24h'],
    ['Técnico de celular', 'Assistência técnica de celular'],
    ['Técnico de informática', 'Assistência técnica de informática'],
    ['Óptico', 'Ótica'],
    ['Joalheiro', 'Joalheria'],
    ['Lojista de roupas', 'Loja de roupas'],
    ['Agente de viagens', 'Agência de viagens'],
    ['Motorista particular', 'Empresa de transporte executivo'],
    ['Fretista', 'Empresa de mudanças'],
  ]],
]

export const KIND_LABEL = { profissional: 'Profissional', empresa: 'Empresa' }

export const CATALOG = (() => {
  const out = []
  const seen = new Set()
  AREAS.forEach(([area, pairs]) => pairs.forEach(([pro, emp]) => {
    ;[[pro, 'profissional'], [emp, 'empresa']].forEach(([name, kind]) => {
      const k = nicheKey(name)
      if (seen.has(k)) return
      seen.add(k)
      out.push({ name, kind, area, pair: kind === 'profissional' ? emp : pro })
    })
  }))
  return out
})()

export const CATALOG_NAMES = CATALOG.map((c) => c.name)

// chave para comparar nichos: sem acento, minúsculo, singular simples ("Arquitetos" = "Arquiteto")
export function nicheKey(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').split(' ').map((w) => (w.length > 4 ? w.replace(/(oes|aes)$/, 'ao').replace(/ores$/, 'or').replace(/ais$/, 'al').replace(/eis$/, 'el').replace(/([^s])s$/, '$1') : w)).join(' ')
}

const BY_KEY = new Map(CATALOG.map((c) => [nicheKey(c.name), c]))
// nicho fora do catálogo: tenta adivinhar se é empresa pelo começo do nome
const COMPANY_WORDS = /^(clinica|escritorio|consultorio|studio|estudio|loja|academia|escola|salao|empresa|agencia|centro|instituto|laboratorio|oficina|imobiliaria|construtora|restaurante|pet ?shop|farmacia|hotel|buffet|casa|ateli|assistencia|corretora|consultoria|produtora|grupo|rede)\b/

export function nicheInfo(name) {
  const k = nicheKey(name)
  const c = BY_KEY.get(k)
  if (c) return c
  return { name, kind: COMPANY_WORDS.test(k) ? 'empresa' : 'profissional', area: 'Outros', pair: '' }
}
