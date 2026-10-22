// Sugestão de onde captar. Ponto de partida: cidades fora da capital paulista, de vários estados,
// com comércio e serviços fortes. Quem ordena são os resultados: onde os leads respondem mais
// sobe; estado onde você já tem muito lead perde força, para não ficar preso num polo só.
import { nicheKey } from './nichos'

export const CITY_POOL = [
  // SP interior
  ['Campinas', 'SP'], ['Ribeirão Preto', 'SP'], ['Sorocaba', 'SP'], ['São José do Rio Preto', 'SP'], ['Bauru', 'SP'],
  ['Piracicaba', 'SP'], ['Presidente Prudente', 'SP'], ['Franca', 'SP'], ['Marília', 'SP'], ['Araraquara', 'SP'],
  // Maranhão
  ['São Luís', 'MA'], ['Imperatriz', 'MA'], ['Balsas', 'MA'], ['Caxias', 'MA'], ['Açailândia', 'MA'],
  // Bahia
  ['Feira de Santana', 'BA'], ['Vitória da Conquista', 'BA'], ['Barreiras', 'BA'], ['Luís Eduardo Magalhães', 'BA'],
  ['Teixeira de Freitas', 'BA'], ['Jequié', 'BA'], ['Itabuna', 'BA'], ['Guanambi', 'BA'], ['Brumado', 'BA'], ['Livramento de Nossa Senhora', 'BA'],
  // Distrito Federal e Centro-Oeste
  ['Brasília', 'DF'], ['Goiânia', 'GO'], ['Anápolis', 'GO'], ['Rio Verde', 'GO'], ['Sinop', 'MT'], ['Rondonópolis', 'MT'],
  ['Campo Grande', 'MS'], ['Dourados', 'MS'],
  // Paraná
  ['Londrina', 'PR'], ['Maringá', 'PR'], ['Cascavel', 'PR'], ['Ponta Grossa', 'PR'], ['Foz do Iguaçu', 'PR'], ['Toledo', 'PR'], ['Guarapuava', 'PR'],
  // Sul
  ['Chapecó', 'SC'], ['Joinville', 'SC'], ['Blumenau', 'SC'], ['Passo Fundo', 'RS'], ['Caxias do Sul', 'RS'],
  // Minas
  ['Uberlândia', 'MG'], ['Montes Claros', 'MG'], ['Juiz de Fora', 'MG'], ['Uberaba', 'MG'],
  // Norte e Nordeste
  ['Teresina', 'PI'], ['Palmas', 'TO'], ['Marabá', 'PA'], ['Petrolina', 'PE'], ['Caruaru', 'PE'], ['Mossoró', 'RN'], ['Campina Grande', 'PB'],
].map(([city, uf]) => ({ city, uf }))

const fold = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const locKey = (city, uf) => `${fold(city)}|${String(uf || '').toUpperCase()}`

function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000
}

// leads: { id, niche, city, uf, last_contact_at, won_at, client_id }; replied: Set de lead_id que responderam
export function rankPlaces({ leads, replied, contacted, niche, day }) {
  const nk = nicheKey(niche)
  const byLoc = new Map()
  const ufCount = new Map()
  const get = (city, uf) => {
    const k = locKey(city, uf)
    let s = byLoc.get(k)
    if (!s) { s = { key: k, city, uf: String(uf || '').toUpperCase(), leads: 0, nicheLeads: 0, contacted: 0, replied: 0, pool: false }; byLoc.set(k, s) }
    return s
  }
  CITY_POOL.forEach((c) => { get(c.city, c.uf).pool = true })
  let total = 0, tc = 0, tr = 0
  leads.forEach((l) => {
    if (!l.city || !l.uf) return
    const s = get(l.city, l.uf)
    s.leads++; total++
    ufCount.set(s.uf, (ufCount.get(s.uf) || 0) + 1)
    if (nk && nicheKey(l.niche) === nk) s.nicheLeads++
    const c = contacted.has(l.id) || Boolean(l.last_contact_at)
    const r = replied.has(l.id) || Boolean(l.won_at) || Boolean(l.client_id)
    if (c) { s.contacted++; tc++ }
    if (c && r) { s.replied++; tr++ }
  })
  const gReply = tc >= 20 && tr ? tr / tc : 0.05
  const list = [...byLoc.values()].map((s) => {
    const reply = (s.replied + 15 * gReply) / (s.contacted + 15)
    const share = total ? (ufCount.get(s.uf) || 0) / total : 0
    const explore = 1 + 0.6 / Math.sqrt(s.contacted + 1)
    const spread = 1 / (1 + 3 * share) // estado com muitos leads seus perde força
    const covered = s.nicheLeads > 120 ? 0.6 : s.nicheLeads > 60 ? 0.8 : 1 // esse nicho já foi bem captado aqui
    const score = (reply / gReply) * explore * spread * covered * (s.pool ? 1 : 0.85) * (1 + seeded(day + '|' + nk + '|' + s.key) * 0.35)
    return { ...s, reply, share, score }
  })
  return { list: list.sort((a, b) => b.score - a.score), gReply, total }
}

export function placeReasons(p, gReply, niche) {
  const pct = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0).replace('.', ',')}%`
  const out = []
  if (p.contacted >= 10) out.push(`${p.contacted} contatado(s) aqui, ${pct(p.replied / p.contacted)} responderam (média geral ${pct(gReply)})`)
  else if (p.contacted) out.push(`Só ${p.contacted} contato(s) aqui até agora: o sistema quer medir esta praça`)
  else out.push('Nenhum contato aqui ainda: praça nova para testar')
  if (p.share < 0.1) out.push(p.share ? `Só ${Math.round(p.share * 100)}% dos seus leads estão em ${p.uf}: ajuda a sair de um polo só` : `Você ainda não tem leads em ${p.uf}`)
  if (niche) out.push(p.nicheLeads ? `${p.nicheLeads} lead(s) de ${niche} já captados aqui` : `Nenhum ${niche} captado aqui ainda`)
  return out
}
