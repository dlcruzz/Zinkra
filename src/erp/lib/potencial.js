// Quanto ainda dá para captar e prospectar. Estimativa feita com o seu próprio rendimento:
// média de leads que cada busca já trouxe × buscas que ainda faltam.
import { UF_NAME } from './captacao'
import { CITY_POOL } from './locais'
import { CATALOG } from './nichos'

const fold = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function potential({ terms, leads, acts = [] }) {
  const done = terms.filter((t) => t.done)
  const measured = done.filter((t) => t.leads_found != null)
  const yieldPer = measured.length >= 5 ? measured.reduce((a, t) => a + Number(t.leads_found || 0), 0) / measured.length : 8
  const byUf = new Map()
  terms.forEach((t) => {
    const u = t.uf || 'SP'
    const s = byUf.get(u) || { uf: u, name: UF_NAME[u] || u, total: 0, done: 0, cities: new Set() }
    s.total++; if (t.done) s.done++; s.cities.add(fold(t.city))
    byUf.set(u, s)
  })
  const states = [...byUf.values()].map((s) => ({ ...s, cities: s.cities.size, left: s.total - s.done, pct: s.total ? s.done / s.total : 0, est: Math.round((s.total - s.done) * yieldPer) }))
    .sort((a, b) => b.est - a.est)
  const toCapture = states.reduce((a, s) => a + s.est, 0)

  // cidades sugeridas que ainda não têm nenhuma busca cadastrada
  const open = new Set(terms.map((t) => `${fold(t.city)}|${t.uf}`))
  const newCities = CITY_POOL.filter((c) => !open.has(`${fold(c.city)}|${c.uf}`))
  const newEst = Math.round(newCities.length * CATALOG.length * yieldPer * 0.25) // cidade inteira, 1 busca por público, só 1/4 dos públicos

  const contactedIds = new Set(acts.filter((a) => a.lead_id && ['whatsapp', 'ligacao', 'email', 'visita'].includes(a.type)).map((a) => a.lead_id))
  const isContacted = (l) => Boolean(l.last_contact_at) || contactedIds.has(l.id)
  const contacted = leads.filter(isContacted).length
  const notContacted = leads.length - contacted
  const wins = leads.filter((l) => l.won_at || l.client_id).length
  const perSale = wins ? Math.max(1, Math.round(contacted / wins)) : null
  return { yieldPer, states, toCapture, newCities, newEst, contacted, notContacted, wins, perSale, leads: leads.length }
}

export const short = (n) => (n >= 10000 ? `${Math.round(n / 1000).toLocaleString('pt-BR')} mil` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} mil` : n.toLocaleString('pt-BR'))
