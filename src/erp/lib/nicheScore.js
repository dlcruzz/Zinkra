// Desempenho de cada público (nicho) calculado com o que foi registrado no ERP:
// contatos, respostas, vendas e quanto cada venda vale. Nada aqui é opinião:
// o nível (fácil, médio, difícil) sai das respostas reais comparadas com a média geral.
import { CATALOG, nicheKey, nicheInfo } from './nichos'

const CONTACT = new Set(['whatsapp', 'ligacao', 'email', 'visita'])
export const MIN_DATA = 15 // contatos mínimos para o sistema dar um nível ao público

// valor de um contrato em 12 meses (mensalidade conta 12x)
const contractValue = (c) => (c.kind === 'recurring' ? Number(c.monthly_cents || 0) * 12 : Number(c.total_cents || 0))

export function nicheStats({ leads, activities, clients, contracts, P }) {
  const byKey = new Map()
  const get = (name) => {
    const k = nicheKey(name)
    if (!k) return null
    let s = byKey.get(k)
    if (!s) {
      const info = nicheInfo(name)
      s = { key: k, name: info.name && nicheKey(info.name) === k ? info.name : String(name).trim(), kind: info.kind, area: info.area, pair: info.pair, leads: 0, contacted: 0, replied: 0, won: 0, wonAll: 0, value: 0 }
      byKey.set(k, s)
    }
    return s
  }
  CATALOG.forEach((c) => get(c.name))

  const contactedIds = new Set(), repliedIds = new Set()
  activities.forEach((a) => {
    if (!a.lead_id) return
    if (CONTACT.has(a.type)) contactedIds.add(a.lead_id)
    if (a.result === 'respondeu') repliedIds.add(a.lead_id)
  })

  const valueByClient = new Map()
  contracts.forEach((c) => { valueByClient.set(c.client_id, (valueByClient.get(c.client_id) || 0) + contractValue(c)) })
  const clientByLead = new Map(clients.filter((c) => c.lead_id).map((c) => [c.lead_id, c]))
  const usedClients = new Set()

  leads.forEach((l) => {
    const s = get(l.niche)
    if (!s) return
    s.leads++
    const st = P.stage(l.stage_id)
    const client = clientByLead.get(l.id) || clients.find((c) => c.id === l.client_id)
    const won = st?.kind === 'won' || Boolean(l.won_at) || Boolean(client)
    const contacted = contactedIds.has(l.id) || Boolean(l.last_contact_at) || won
    const replied = repliedIds.has(l.id) || won || st?.kind === 'handoff' || /^respond/i.test(st?.name || '')
    if (contacted) s.contacted++
    if (replied && contacted) s.replied++
    if (won && contacted) s.won++
    if (won) {
      s.wonAll++
      if (client) { usedClients.add(client.id); s.value += valueByClient.get(client.id) || 0 } else s.value += Number(l.estimated_value_cents || 0)
    }
  })
  // clientes que não vieram de um lead (antigos, indicação): contam no valor da venda do público
  clients.forEach((c) => {
    if (usedClients.has(c.id) || !c.niche) return
    const s = get(c.niche)
    s.wonAll++; s.value += valueByClient.get(c.id) || 0
  })

  const all = [...byKey.values()]
  const sum = (f) => all.reduce((a, s) => a + f(s), 0)
  const tc = sum((s) => s.contacted), tr = sum((s) => s.replied), tw = sum((s) => s.won), twa = sum((s) => s.wonAll), tv = sum((s) => s.value)
  const g = {
    contacted: tc, replied: tr, won: tw, value: tv,
    reply: tc >= 20 ? tr / tc : 0.1,
    win: tc >= 50 && tw ? tw / tc : 0.02,
    ticket: twa ? tv / twa : 0,
  }
  // médias "puxadas" para a média geral enquanto o público tem poucos dados
  all.forEach((s) => {
    s.replyRate = s.contacted ? s.replied / s.contacted : null
    s.reply = (s.replied + 10 * g.reply) / (s.contacted + 10)
    // sem venda ainda, quem responde mais tende a fechar mais: a resposta puxa a estimativa de venda
    s.win = (s.won + 20 * g.win * (s.reply / g.reply)) / (s.contacted + 20)
    s.ticket = g.ticket ? (s.value + 2 * g.ticket) / (s.wonAll + 2) : s.wonAll ? s.value / s.wonAll : 0
    s.perContact = s.win * s.ticket
    s.level = s.contacted < MIN_DATA ? 'aprendendo' : s.reply >= g.reply * 1.25 ? 'facil' : s.reply <= g.reply * 0.75 ? 'dificil' : 'medio'
  })

  const kinds = ['profissional', 'empresa'].map((k) => {
    const list = all.filter((s) => s.kind === k)
    const c = list.reduce((a, s) => a + s.contacted, 0), r = list.reduce((a, s) => a + s.replied, 0)
    return { kind: k, contacted: c, replied: r, reply: c ? r / c : null, won: list.reduce((a, s) => a + s.wonAll, 0), value: list.reduce((a, s) => a + s.value, 0) }
  })
  return { list: all, global: g, kinds }
}

export const LEVEL = {
  facil: ['Fácil', 'g', 'Responde mais que a média'],
  medio: ['Médio', '', 'Responde perto da média'],
  dificil: ['Difícil', 'r', 'Responde menos que a média'],
  aprendendo: ['Aprendendo', 'y', `Menos de ${MIN_DATA} contatos: o sistema ainda está medindo`],
}

export const MODES = [
  ['vender', 'Para vender', 'O que mais traz dinheiro por contato, testando de vez em quando um público novo.'],
  ['facil', 'Mais fácil', 'Quem mais responde. Bom para aquecer o dia ou ganhar confiança.'],
  ['dificil', 'Desafio', 'Quem menos responde, para você treinar e melhorar a abordagem.'],
  ['testar', 'Testar novo', 'Públicos com pouco ou nenhum contato, para o sistema aprender.'],
]

// número fixo por dia e público: a sugestão não muda a cada clique, só no dia seguinte
function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000
}

// ordena os públicos para o modo escolhido. avail: Map(nicheKey → leads disponíveis)
export function rankNiches(stats, mode, avail, day) {
  const { list, global: g } = stats
  const jit = (s) => seeded(day + '|' + mode + '|' + s.key)
  const has = (s) => (avail.get(s.key) || 0) > 0
  let scored
  const known = list.filter((s) => has(s) || s.contacted || s.wonAll)
  if (mode === 'facil') {
    scored = (known.length ? known : list).map((s) => ({ s, v: s.reply * (has(s) ? 1.1 : 1) + jit(s) * 0.002 }))
  } else if (mode === 'dificil') {
    scored = list.filter((s) => s.contacted >= MIN_DATA).map((s) => ({ s, v: -s.reply + (has(s) ? 0.01 : 0) + jit(s) * 0.0001 }))
  } else if (mode === 'testar') {
    scored = list.filter((s) => s.contacted < MIN_DATA).map((s) => ({ s, v: -s.contacted * 10 + (has(s) ? 5 : 0) + jit(s) * 3 }))
  } else {
    const base = g.ticket ? null : 1
    // para vender: só públicos que já têm lead na base ou histórico; nicho nunca captado fica no "Testar novo"
    scored = (known.length ? known : list).map((s) => {
      const value = base ?? s.perContact
      const explore = 1 + 0.5 / Math.sqrt(s.contacted + 1)
      const rep = s.reply / (g.reply || 0.1)
      return { s, v: value * explore * (base ? rep : 1) * (has(s) ? 1.4 : 1) * (1 + jit(s) * 0.2) }
    })
  }
  return scored.sort((a, b) => b.v - a.v).map((x) => x.s)
}

// por que o sistema escolheu este público (frases curtas para a tela)
export function reasons(s, g, mode) {
  const out = []
  const pct = (x) => `${Math.round(x * 100)}%`
  if (s.contacted) out.push(`${s.contacted} contatado(s), ${s.replied} respondeu(ram) (${pct(s.replyRate)} · média geral ${pct(g.reply)})`)
  else out.push('Nenhum contato registrado ainda')
  if (s.wonAll) out.push(`${s.wonAll} venda(s) · ${brl(s.value)} em 12 meses${s.wonAll ? ` · ticket ${brl(s.value / s.wonAll)}` : ''}`)
  if (mode === 'vender' && g.ticket && s.contacted) out.push(`Cada contato vale em média ${brl(s.perContact)}`)
  if (mode === 'vender' && s.contacted < MIN_DATA) out.push('Pouco testado: o sistema quer medir este público')
  if (mode === 'dificil') out.push('Pede mais follow-up e uma primeira mensagem bem curta')
  return out
}
const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
