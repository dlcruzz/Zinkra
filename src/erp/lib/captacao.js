// Captação de clientes: locais (Brasil), montagem do prompt para o Claude e leitura do resultado.
import { parseCsv } from './csv'

export const UFS = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
]
export const UF_NAME = Object.fromEntries(UFS)

// Bairros de São Paulo (capital) já conhecidos, por zona. Outras cidades ganham bairros conforme você cadastra.
export const SP_BAIRROS = {
  'Zona Norte': ['Santana', 'Tucuruvi', 'Vila Maria', 'Casa Verde', 'Freguesia do Ó', 'Pirituba', 'Jaçanã', 'Mandaqui', 'Vila Guilherme', 'Limão', 'Jaraguá'],
  'Zona Sul': ['Santo Amaro', 'Campo Belo', 'Moema', 'Vila Mariana', 'Jabaquara', 'Interlagos', 'Cidade Ademar', 'Capela do Socorro', 'Campo Limpo',
    'Grajaú', 'Cidade Dutra', 'Itaim Bibi', 'Vila Olímpia', 'Brooklin', 'Saúde', 'Ipiranga', 'Sacomã', 'Chácara Klabin', 'Capão Redondo',
    'Jardim Ângela', 'Morumbi', 'Cidade Jardim', 'Real Parque', 'Jardins', 'Jardim Paulista'],
  'Zona Leste': ['Tatuapé', 'Mooca', 'Penha', 'Itaquera', 'São Miguel Paulista', 'Vila Prudente', 'Aricanduva', 'Vila Formosa', 'Sapopemba',
    'Cidade Tiradentes', 'Guaianases', 'Itaim Paulista', 'São Mateus', 'Vila Carrão', 'Vila Matilde'],
  'Zona Oeste': ['Pinheiros', 'Lapa', 'Butantã', 'Perdizes', 'Vila Leopoldina', 'Alto de Pinheiros', 'Rio Pequeno', 'Vila Sônia', 'Vila Madalena',
    'Pompeia', 'Barra Funda', 'Jaguaré', 'Raposo Tavares'],
  Centro: ['Sé', 'Bela Vista', 'Liberdade', 'Consolação', 'Santa Cecília', 'República', 'Bom Retiro', 'Higienópolis', 'Aclimação', 'Cambuci'],
}
export const GRANDE_SP = ['Guarulhos', 'Osasco', 'Santo André', 'São Bernardo do Campo', 'São Caetano do Sul', 'Diadema', 'Mauá', 'Barueri',
  'Carapicuíba', 'Cotia', 'Itapevi', 'Taboão da Serra', 'Embu das Artes', 'Ferraz de Vasconcelos', 'Suzano', 'Mogi das Cruzes',
  'Itaquaquecetuba', 'Franco da Rocha', 'Caieiras', 'Poá', 'Jandira', 'Itapecerica da Serra', 'Embu-Guaçu', 'Arujá', 'Mairiporã',
  'Santana de Parnaíba', 'Ribeirão Pires']
const SP_REGION = Object.fromEntries(Object.entries(SP_BAIRROS).flatMap(([z, list]) => list.map((b) => [b, z])))

// bairros que o sistema já conhece para uma cidade (além dos que existirem nos termos)
export function knownHoods(city, uf) {
  if (uf === 'SP' && city === 'São Paulo') return Object.entries(SP_BAIRROS).flatMap(([z, list]) => list.map((b) => ({ neighborhood: b, region: z })))
  return []
}
export const regionOf = (city, uf, hood) => (uf === 'SP' && city === 'São Paulo' ? SP_REGION[hood] || null : null)

// Municípios de uma UF pela API pública do IBGE (com cache no navegador)
const cityCache = new Map()
export async function fetchCities(uf) {
  if (!uf) return []
  if (cityCache.has(uf)) return cityCache.get(uf)
  let list = []
  try {
    const raw = localStorage.getItem(`erp_cidades_${uf}`)
    if (raw) list = JSON.parse(raw)
  } catch { /* sem storage */ }
  if (!list.length) {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
    if (!r.ok) throw new Error('IBGE indisponível')
    list = (await r.json()).map((m) => m.nome)
    try { localStorage.setItem(`erp_cidades_${uf}`, JSON.stringify(list)) } catch { /* sem storage */ }
  }
  cityCache.set(uf, list)
  return list
}

export const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
export const locKey = (city, uf) => `${fold(city)}|${String(uf || '').toUpperCase()}`
export const termKey = (t) => `${fold(t.niche)}|${fold(t.neighborhood)}|${locKey(t.city, t.uf)}`

// o texto exato que o Claude digita no Google Maps (e devolve em "Onde achei")
export function termQuery({ niche, neighborhood, city, uf }) {
  return neighborhood ? `${niche} em ${neighborhood}, ${city} - ${uf}` : `${niche} em ${city} - ${uf}`
}

export function batchCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('')
}

export const COLS = ['Empresa', 'Telefone/WhatsApp', 'Instagram', 'Site atual?', 'Bairro', 'Onde achei']
export const NO_RESULT = 'SEM RESULTADOS'

export function buildPrompt({ code, niche, city, uf, queries, onlyNoSite }) {
  const list = queries.map((q, i) => `${i + 1}. ${q}`).join('\n')
  const filtro = onlyNoSite
    ? `- Capte SOMENTE quem NÃO tem site próprio. Linktree, Instagram, WhatsApp, Facebook ou página do iFood/Doctoralia NÃO contam como site: isso é "sem site".
- Se tiver site próprio de verdade (domínio próprio, página institucional), DESCARTE.
- Na dúvida (site fora do ar, "em construção", página muito simples), trate como sem site e capte.`
    : `- Capte TODOS os estabelecimentos, com ou sem site, e preencha "Site atual?" com Sim ou Não.
- Linktree, Instagram, WhatsApp, Facebook ou página do iFood/Doctoralia NÃO contam como site: isso é "Não".`
  return `Você é meu assistente de captação de leads da Zinkra. Use a extensão Claude in Chrome com o Google Maps.

LOTE ${code} · ${niche} · ${city} - ${uf}

OBJETIVO
Buscar no Google Maps os estabelecimentos de cada termo de busca abaixo, para eu prospectar depois oferecendo sites e sistemas.

TERMOS DE BUSCA (faça todos, um por vez, nesta ordem):
${list}

FILTRO
${filtro}

PASSO A PASSO (para cada termo)
1. Pesquise no Google Maps o termo exatamente como está escrito.
2. Role a lista de resultados até o fim para carregar todos os estabelecimentos.
3. Abra o card de cada um e confira telefone, site e, se aparecer, o Instagram.
4. Registre uma linha por estabelecimento, com as 6 colunas abaixo.
5. Se o termo não render nenhum lead válido, registre UMA linha com Empresa = "${NO_RESULT}" e Onde achei = o termo. Assim eu sei que ele foi feito.

COLUNAS (exatamente estas 6, nesta ordem, separadas por TAB)
${COLS.join(' | ')}

- Empresa: nome como aparece no Maps.
- Telefone/WhatsApp: número exibido, com DDD. Ex.: (11) 98765-4321.
- Instagram: @perfil, se aparecer no card ou no Linktree. Se não, "-".
- Site atual?: "Não"${onlyNoSite ? ' (nesta lista, sempre Não)' : ' ou "Sim"'}.
- Bairro: o bairro do endereço do estabelecimento. Se não der para saber, "-".
- Onde achei: o termo de busca EXATO da lista acima, igual, sem mudar nada.

REGRAS
- Toda célula precisa ter conteúdo. Onde faltar dado, use "-". Nunca deixe coluna vazia nem desloque colunas.
- Não duplique: mesma empresa ou mesmo telefone = uma linha só.
- Não invente dados. Só o que estiver no Google Maps.
- Não pule termos. Se não conseguir terminar todos, me diga quais faltaram.

ENTREGA
Ao final, me entregue tudo em UM bloco de código no formato TSV (com a linha de cabeçalho) e também como arquivo .tsv para baixar. Exemplo:

${COLS.join('\t')}
Clínica Exemplo\t(11) 98765-4321\t@clinicaexemplo\tNão\tSantana\t${queries[0] || ''}`
}

// Prompt de captação pelo Instagram (Google + perfil aberto no Instagram já logado)
export function buildInstagramPrompt({ code, niche, city, uf, terms, onlyNoSite }) {
  const list = terms.map((t, i) => {
    const local = t.neighborhood ? `"${t.neighborhood}" "${city}"` : `"${city}"`
    return `${i + 1}. ${t.query}\n   Google: site:instagram.com "${niche}" ${local}\n   No Instagram: ${niche} ${t.neighborhood || city}`
  }).join('\n')
  const filtro = onlyNoSite
    ? `- Capte SOMENTE quem NÃO tem site próprio. Link da bio para Linktree, WhatsApp, agenda online, Doctoralia ou página de rede social NÃO conta como site: isso é "sem site".
- Se o link da bio for um site próprio de verdade (domínio próprio, página institucional), DESCARTE.`
    : `- Capte todos e preencha "Site atual?" com Sim (link da bio é site próprio) ou Não (Linktree, WhatsApp, agenda, sem link).`
  return `Você é meu assistente de captação de leads da Zinkra. Use a extensão Claude in Chrome. Estou logado no Instagram da Zinkra neste Chrome.

LOTE ${code} · ${niche} · ${city} - ${uf} · FONTE: INSTAGRAM

OBJETIVO
Encontrar perfis comerciais de ${niche.toLowerCase()} em ${city} - ${uf} no Instagram, para eu prospectar pelo Direct oferecendo sites e sistemas.

BUSCAS (faça todas, uma por vez, nesta ordem)
${list}

COMO BUSCAR (para cada busca)
1. Pesquise no Google a linha "Google" exatamente como está. Veja as 2 primeiras páginas de resultados.
2. Se vierem poucos perfis, use também a busca do próprio Instagram (instagram.com/explore/search) com a linha "No Instagram".
3. Abra cada perfil encontrado (instagram.com/perfil) e leia o nome, a bio, o link da bio e o endereço, se tiver.
4. Fique só com perfis COMERCIAIS do nicho que atendem em ${city}: escritório, clínica, profissional autônomo com perfil de trabalho. Descarte perfis pessoais, de estudantes, de outras cidades, franquias nacionais e páginas de cursos ou vagas.
5. Se a busca não render nenhum lead válido, registre UMA linha com Empresa = "${NO_RESULT}" e Onde achei = a busca.

CUIDADO COM A CONTA (muito importante)
- Vá devagar: espere de 5 a 10 segundos entre um perfil e outro. Abra no máximo 40 perfis por lote.
- NÃO siga, NÃO curta, NÃO comente, NÃO mande Direct, NÃO clique em "Seguir" nem em botões de contato. Só leia.
- Se o Instagram mostrar aviso de "tente novamente mais tarde", limite de ações, verificação ou CAPTCHA, PARE na hora e me entregue o que já tiver.

FILTRO
${filtro}

COLUNAS (exatamente estas 6, nesta ordem, separadas por TAB)
${COLS.join(' | ')}

- Empresa: nome do perfil (o nome em negrito, não o @). Se não tiver, use o @.
- Telefone/WhatsApp: só se aparecer na bio, no botão de contato visível ou no link da bio (wa.me/55...). Com DDD. Se não tiver, "-".
- Instagram: o @perfil. Obrigatório.
- Site atual?: "Não"${onlyNoSite ? ' (nesta lista, sempre Não)' : ' ou "Sim"'}.
- Bairro: o bairro do endereço da bio ou do perfil. Se não der para saber, "-".
- Onde achei: a busca EXATA da lista acima (a primeira linha de cada item, sem o "Google:"), igual, sem mudar nada.

REGRAS
- Toda célula precisa ter conteúdo. Onde faltar dado, use "-". Nunca deixe coluna vazia nem desloque colunas.
- Não duplique: mesmo @ ou mesmo telefone = uma linha só.
- Não invente dados. Só o que estiver no perfil.
- Se não conseguir terminar todas as buscas, me diga quais faltaram.

ENTREGA
Ao final, me entregue tudo em UM bloco de código no formato TSV (com a linha de cabeçalho) e também como arquivo .tsv para baixar. Exemplo:

${COLS.join('\t')}
Escritório Exemplo\t-\t@escritorioexemplo\tNão\tCentro\t${terms[0]?.query || ''}`
}

// Mini prompt para descobrir bairros de uma cidade nova
export function hoodsPrompt(city, uf) {
  return `Liste os principais bairros e regiões comerciais de ${city} - ${uf}, onde existe mais comércio, clínicas e escritórios. Responda só com os nomes, um por linha, sem numeração e sem comentários. No máximo 40.`
}

// ---------------------------------------------------------------- leitura do resultado
const HEAD = {
  company: /empresa|nome|estabelecimento|razao/,
  phone: /telefone|whats|celular|fone/,
  instagram: /insta/,
  has_site: /site/,
  neighborhood: /bairro|regiao/,
  where: /onde|termo|busca|origem/,
}
export async function readResultFile(file) {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    const rows = await readSheet(file)
    return rows.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))).join('\t')).join('\n')
  }
  return await file.text()
}

export function parseResult(text) {
  // aceita o bloco colado com ``` em volta
  const clean = String(text || '').replace(/```[a-z]*\n?/gi, '').trim()
  const { headers, rows } = parseCsv(clean)
  if (!headers.length) return { rows: [], missing: COLS }
  const idx = {}
  headers.forEach((h, i) => {
    const f = fold(h).replace(/[^a-z ]/g, '')
    for (const [k, re] of Object.entries(HEAD)) if (idx[k] === undefined && re.test(f)) { idx[k] = i; break }
  })
  const missing = ['company', 'phone', 'where'].filter((k) => idx[k] === undefined)
  const val = (r, k) => {
    const v = idx[k] === undefined ? '' : String(r[idx[k]] ?? '').trim()
    return v === '-' || v === '—' ? '' : v
  }
  return {
    missing,
    rows: rows.map((r) => ({
      company: val(r, 'company'), phone: val(r, 'phone'), instagram: val(r, 'instagram'),
      site: val(r, 'has_site'), neighborhood: val(r, 'neighborhood'), where: val(r, 'where'),
    })).filter((o) => o.company || o.phone || o.where),
  }
}

// liga cada linha a um termo do lote: pelo texto de "Onde achei"; se não bater, pelo bairro
export function matchTerm(row, terms) {
  const w = fold(row.where)
  if (w) {
    const exact = terms.find((t) => fold(t.query) === w)
    if (exact) return exact
    const loose = [...terms].sort((a, b) => (b.neighborhood || '').length - (a.neighborhood || '').length)
      .find((t) => t.neighborhood && w.includes(fold(t.neighborhood)))
    if (loose) return loose
  }
  const b = fold(row.neighborhood)
  if (b) return terms.find((t) => t.neighborhood && fold(t.neighborhood) === b) || null
  return terms.length === 1 ? terms[0] : null
}
