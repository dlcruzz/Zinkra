// Locais do Brasil para a Captação: porte da cidade e bairros em níveis (distrito → bairro → sub-bairro).
// Fontes públicas, sem chave: IBGE (municípios, população estimada, distritos) e Wikidata (bairros com o "pertence a").
// Tudo fica em cache no navegador; os termos de busca só entram no banco quando você marca o local num lote.

const foldTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

export const UF_CODE = {
  AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15,
  PB: 25, PR: 41, PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17,
}

// quanto uma busca no Maps costuma render: ~60 lugares (Google) e, na lista, uns 100+.
// Barbeiro, dentista etc. chegam a 1 para cada ~1.500 habitantes: acima de ~80 mil, uma busca só da cidade perde gente.
export const SATURADO = 25 // um local com mais leads que isso provavelmente tem mais gente escondida

export function tierOf(pop) {
  const n = Number(pop) || 0
  if (!n) return { key: 'desconhecido', label: 'Porte não informado', dividir: false, hint: 'Sem dado de população. Se a busca da cidade inteira vier cheia, divida em bairros.' }
  const hab = n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi hab.` : `${Math.round(n / 1000).toLocaleString('pt-BR')} mil hab.`
  if (n < 30_000) return { key: 'pequena', label: `Cidade pequena · ${hab}`, dividir: false, hint: 'Uma busca na cidade inteira costuma pegar quase tudo. Divida em bairros só se vier lotada.' }
  if (n < 120_000) return { key: 'media', label: `Cidade média · ${hab}`, dividir: false, hint: 'Comece pela cidade inteira; se vier lotada (muitos resultados), abra os bairros.' }
  return { key: 'grande', label: `Cidade grande · ${hab}`, dividir: true, hint: 'Uma busca só da cidade perde muita empresa. Busque por distrito e bairro e detalhe os que lotarem.' }
}

// ------------------------------------------------------------------ municípios + população (IBGE)
const memo = new Map()
export async function fetchCityInfo(uf) {
  if (!uf || !UF_CODE[uf]) return []
  if (memo.has(uf)) return memo.get(uf)
  let list = []
  const key = `erp_cidades2_${uf}`
  try { list = JSON.parse(localStorage.getItem(key) || '[]') } catch { list = [] }
  if (!list.length) {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
    if (!r.ok) throw new Error('IBGE indisponível')
    const muni = await r.json()
    const pop = new Map()
    try {
      const s = await fetch(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[N3[${UF_CODE[uf]}]]`)
      if (s.ok) {
        const j = await s.json()
        for (const x of j?.[0]?.resultados?.[0]?.series || []) pop.set(String(x.localidade.id), Number(Object.values(x.serie)[0]) || 0)
      }
    } catch { /* sem população: o porte fica "não informado" */ }
    list = muni.map((m) => ({ id: String(m.id), nome: m.nome, pop: pop.get(String(m.id)) || 0 }))
    try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* sem storage */ }
  }
  memo.set(uf, list)
  return list
}

// ------------------------------------------------------------------ bairros em níveis
const cleanName = (s) => String(s || '').replace(/\s*\((bairro|distrito|subdistrito|localidade|povoado)[^)]*\)\s*$/i, '').trim()
const SKIP_CLASS = /patrim[oó]nio|monumento|parque|esta[cç][aã]o|hospital|escola|universidade|shopping/i

// linhas cruas {l, pl, cls} do Wikidata → nós {name, parent, level}
//   nível 1: distrito (ou bairro sem pai conhecido) · nível 2: bairro dentro de um distrito · nível 3: sub-bairro
export function buildNodes(rows, cityName) {
  const city = foldTxt(cityName)
  const byName = new Map()
  for (const r of rows || []) {
    const name = cleanName(r.l).replace(new RegExp(`\\s*\\(${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*$`, 'i'), '')
    if (!name || /^Q\d+$/.test(name) || foldTxt(name) === city) continue
    if (SKIP_CLASS.test(r.cls || '')) continue
    const parent = cleanName(r.pl)
    const k = foldTxt(name)
    const cur = byName.get(k)
    // se o mesmo nome aparece com pais diferentes, fica o primeiro que tem pai conhecido
    if (!cur || (!cur.parent && parent)) byName.set(k, { name, parent: parent && foldTxt(parent) !== city ? parent : '' })
  }
  const nodes = Array.from(byName.values())
  const known = new Set(byName.keys())
  const depth = (n, seen = new Set()) => {
    const pk = foldTxt(n.parent)
    if (!n.parent || !known.has(pk) || seen.has(pk)) return 1
    seen.add(foldTxt(n.name))
    return 1 + depth(byName.get(pk), seen)
  }
  return nodes.map((n) => ({ ...n, level: Math.min(3, depth(n)) })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

// nós → locais para as caixinhas da tela: { neighborhood, region, level, parent }
//   sub-bairros (nível 3) só aparecem quando o pai foi aberto (`aberto` = Set de nomes sem acento)
export function locaisDosNos(nodes, aberto = new Set()) {
  const hasKids = new Set(nodes.filter((n) => n.parent).map((n) => foldTxt(n.parent)))
  const out = []
  for (const n of nodes) {
    if (n.level === 1) {
      // distrito com filhos vira grupo: a própria caixinha é "distrito inteiro"
      out.push({ neighborhood: n.name, region: hasKids.has(foldTxt(n.name)) ? n.name : n.parent || 'Bairros', level: 1, parent: n.parent })
    } else if (n.level === 2) {
      out.push({ neighborhood: n.name, region: n.parent, level: 2, parent: n.parent })
    } else if (aberto.has(foldTxt(n.parent))) {
      out.push({ neighborhood: subName(n.name, n.parent), region: `Dentro de ${n.parent}`, level: 3, parent: n.parent })
    }
  }
  return out
}
export const filhosDe = (nodes, hood) => nodes.filter((n) => n.parent && foldTxt(n.parent) === foldTxt(hood))

// sub-bairro guardado no banco como "Sub (Pai)": a busca vira "Sub, Pai, Cidade - UF"
export const subName = (name, parent) => `${name} (${parent})`
export function splitHood(h) {
  const m = String(h || '').match(/^(.*?)\s*\(([^()]+)\)\s*$/)
  return m ? { name: m[1].trim(), parent: m[2].trim() } : { name: String(h || '').trim(), parent: '' }
}

// ------------------------------------------------------------------ busca dos bairros (Wikidata, com IBGE de reserva)
async function wikidataRows(ibgeId) {
  const q = `SELECT DISTINCT ?l ?pl ?cls WHERE { ?m wdt:P1585 "${ibgeId}". ?b wdt:P131+ ?m. ?b wdt:P31/wdt:P279* wd:Q123705.
    ?b rdfs:label ?l. FILTER(LANG(?l)="pt")
    OPTIONAL { ?b wdt:P131 ?p. ?p rdfs:label ?pl. FILTER(LANG(?pl)="pt") }
    OPTIONAL { ?b wdt:P31 ?c. ?c rdfs:label ?cls. FILTER(LANG(?cls)="pt") } } LIMIT 8000`
  for (let tent = 0; tent < 2; tent++) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 30000)
    try {
      const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { signal: ac.signal, headers: { Accept: 'application/sparql-results+json' } })
      if (r.ok) {
        const j = await r.json()
        return (j.results?.bindings || []).map((x) => ({ l: x.l?.value, pl: x.pl?.value, cls: x.cls?.value }))
      }
    } catch { /* tenta de novo */ } finally { clearTimeout(t) }
  }
  throw new Error('Wikidata indisponível')
}
async function ibgeDistritos(ibgeId) {
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${ibgeId}/distritos`)
  if (!r.ok) return []
  const j = await r.json()
  return j.length > 1 ? j.map((d) => ({ l: d.nome, pl: '', cls: 'distrito' })) : []
}

// devolve { nodes, source }. Cache de 90 dias por cidade.
export async function fetchBairros({ ibgeId, city, uf }) {
  const key = `erp_bairros_${uf}_${ibgeId}`
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null')
    if (c && Date.now() - c.at < (c.nodes?.length ? 90 : 7) * 864e5) return c
  } catch { /* sem cache */ }
  let rows = []
  let source = 'Wikidata'
  try { rows = await wikidataRows(ibgeId) } catch { rows = [] }
  if (!rows.length) { rows = await ibgeDistritos(ibgeId).catch(() => []); source = 'IBGE (distritos)' }
  const out = { at: Date.now(), source, nodes: buildNodes(rows, city) }
  try { localStorage.setItem(key, JSON.stringify(out)) } catch { /* sem storage */ }
  return out
}
