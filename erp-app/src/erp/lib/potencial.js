// Quanto ainda dá para captar e prospectar. Estimativa feita com o seu próprio rendimento:
// média de leads que cada busca já trouxe × buscas que ainda faltam.
import { UF_NAME } from './captacao'
import { CITY_POOL } from './locais'
import { CATALOG } from './nichos'

const fold = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// summary vem da função captacao_resumo() do banco: a conta é feita lá, o navegador não baixa as tabelas
export function potential({ summary }) {
  const yieldPer = summary.yield_n >= 5 ? summary.yield_sum / summary.yield_n : 8
  const states = (summary.by_uf || []).map((x) => {
    const u = x.uf || 'SP'
    return { uf: u, name: UF_NAME[u] || u, total: x.total, done: x.done, cities: x.cities, left: x.total - x.done, pct: x.total ? x.done / x.total : 0, est: Math.round((x.total - x.done) * yieldPer) }
  }).sort((a, b) => b.est - a.est)
  const toCapture = states.reduce((a, s) => a + s.est, 0) // só bairros cadastrados (antes das sugestões)

  // cidades sugeridas que ainda não têm nenhuma busca cadastrada
  const open = new Set((summary.open_cities || []).map(([city, uf]) => `${fold(city)}|${uf}`))
  const newCities = CITY_POOL.filter((c) => !open.has(`${fold(c.city)}|${c.uf}`))
  const perCity = Math.round(CATALOG.length * yieldPer * 0.25) // cidade inteira, 1 busca por público, só 1/4 dos públicos
  const newEst = newCities.length * perCity
  // as cidades sugeridas entram no gráfico do estado delas, para mostrar que há mercado fora de um polo só
  const idx = new Map(states.map((x) => [x.uf, x]))
  newCities.forEach((c) => {
    let x = idx.get(c.uf)
    if (!x) { x = { uf: c.uf, name: UF_NAME[c.uf] || c.uf, total: 0, done: 0, cities: 0, left: 0, pct: 0, est: 0, suggested: 0 }; idx.set(c.uf, x); states.push(x) }
    x.suggested = (x.suggested || 0) + 1
    x.est += perCity
  })
  states.sort((a2, b2) => b2.est - a2.est)

  const contacted = summary.leads_contacted || 0
  const notContacted = (summary.leads_total || 0) - contacted
  const wins = summary.leads_wins || 0
  const perSale = wins ? Math.max(1, Math.round(contacted / wins)) : null
  return { yieldPer, states, toCapture, newCities, newEst, contacted, notContacted, wins, perSale, leads: summary.leads_total || 0 }
}

export const short = (n) => (n >= 10000 ? `${Math.round(n / 1000).toLocaleString('pt-BR')} mil` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} mil` : n.toLocaleString('pt-BR'))
