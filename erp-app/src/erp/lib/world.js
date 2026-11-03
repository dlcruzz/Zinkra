// Carrega o "mundo" da empresa para dashboards, metas e inteligência.
// O volume é pequeno (centenas de linhas), então ler e calcular no navegador
// é mais simples e barato do que manter dezenas de views no banco.
import { useData, fetchRows, onChange } from './data'
import { getPipelines } from './automations'
import { calcularCarteira, semDuplicidade } from './financeiro'
import { addDays, today, inRange, startOfMonth, endOfMonth, startOfWeek } from './format'

const TABLES = ['leads', 'activities', 'tasks', 'projects', 'receivables', 'payables', 'proposals', 'proposal_items',
  'contracts', 'clients', 'goals', 'meetings', 'time_entries', 'commissions', 'pipeline_stages', 'ideas',
  'insight_dismissals', 'settings', 'playbooks', 'partners', 'milestones',
  'project_valores', 'project_recebimentos', 'project_comissao', 'project_comissao_pagamentos', 'project_comissao_abatimentos']

const safe = (p) => p.catch(() => [])

// o "mundo" é usado por várias telas: uma carga em andamento ou recente é reaproveitada
let worldPromise = null
let worldAt = 0
onChange(TABLES, () => { worldPromise = null })
export function loadWorld() {
  if (!worldPromise || Date.now() - worldAt > 60000) { worldAt = Date.now(); worldPromise = loadWorldFresh().catch((e) => { worldPromise = null; throw e }) }
  return worldPromise
}
export function prefetchWorld() { loadWorld().catch(() => {}) }

async function loadWorldFresh() {
  const since = addDays(today(), -400)
  const [P, leads, activities, tasks, projects, receivables, payables, proposals, items, contracts, clients, goals,
    meetings, timeEntries, commissions, ideas, dismissals, settingsRows, playbooks, partners, milestones,
    finValores, finRecebimentos, finParceiros, finPagamentos, finAbatimentos] = await Promise.all([
    getPipelines(),
    safe(fetchRows('leads', { limit: 5000 })),
    safe(fetchRows('activities', { where: (q) => q.gte('happened_at', since), order: 'happened_at', limit: 10000 })),
    safe(fetchRows('tasks', { limit: 5000 })),
    safe(fetchRows('projects')),
    safe(fetchRows('receivables', { order: 'due_on', ascending: true })),
    safe(fetchRows('payables', { order: 'due_on', ascending: true })),
    safe(fetchRows('proposals')),
    safe(fetchRows('proposal_items', { order: null })),
    safe(fetchRows('contracts')),
    safe(fetchRows('clients')),
    safe(fetchRows('goals')),
    safe(fetchRows('meetings', { order: 'starts_at', ascending: true })),
    safe(fetchRows('time_entries', { where: (q) => q.gte('started_at', since), order: 'started_at' })),
    safe(fetchRows('commissions', { order: null })),
    safe(fetchRows('ideas')),
    safe(fetchRows('insight_dismissals', { order: null })),
    safe(fetchRows('settings', { order: null })),
    safe(fetchRows('playbooks')),
    safe(fetchRows('partners')),
    safe(fetchRows('milestones', { order: null })),
    safe(fetchRows('project_valores', { order: null })),
    safe(fetchRows('project_recebimentos', { order: null })),
    safe(fetchRows('project_comissao', { order: null })),
    safe(fetchRows('project_comissao_pagamentos', { order: null })),
    safe(fetchRows('project_comissao_abatimentos', { order: null })),
  ])
  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
  const world = {
    P, leads, activities, tasks, projects, receivables, payables, proposals, items, contracts, clients, goals, meetings,
    timeEntries, commissions, terms: [], ideas, dismissals, settings, playbooks, partners, milestones,
  }
  return comFinanceiroDosProjetos(world, {
    valores: finValores, recebimentos: finRecebimentos, parceiros: finParceiros, pagamentos: finPagamentos, abatimentos: finAbatimentos,
  })
}

// Financeiro dos projetos entra no caixa SEM contar duas vezes:
//  - parcelas do contrato (e contas de comissão dele) de um projeto no modelo novo saem da conta;
//  - cada recebimento do projeto vira uma entrada já recebida, cada pagamento de comissão uma saída já paga
//    (um lançamento conciliado com o banco é UM recebimento só: o banco nunca soma por fora);
//  - o que falta receber e a comissão a pagar (sem data certa) ficam em w.carteira, fora da projeção de 30 dias.
export function comFinanceiroDosProjetos(w, fin) {
  const { linhas, totais } = calcularCarteira(fin, w.projects)
  if (!linhas.length) return { ...w, fin, carteira: { linhas, totais } }
  const { receivables, payables } = semDuplicidade(w, fin)
  const frente = (id) => w.projects.find((p) => p.id === id)?.front || 'sites'
  const entradas = fin.recebimentos.map((r) => ({ id: 'proj-rec-' + r.id, contract_id: null, front: frente(r.project_id),
    amount_cents: r.amount_cents, due_on: r.received_on, received_on: r.received_on }))
  const saidas = fin.pagamentos.map((p) => ({ id: 'proj-pag-' + p.id, category: 'Comissões', recurrence: 'once', series_id: null,
    amount_cents: p.amount_cents, due_on: p.paid_on, paid_on: p.paid_on }))
  return { ...w, receivables: [...receivables, ...entradas], payables: [...payables, ...saidas], fin, carteira: { linhas, totais } }
}

export function useWorld(deps = []) {
  return useData(loadWorld, TABLES, deps)
}

// ------------------------------------------------------------------
// Métricas de metas
// ------------------------------------------------------------------
export function periodRange(period, ref = today()) {
  if (period === 'day') return [ref, ref]
  if (period === 'week') return [startOfWeek(ref), addDays(startOfWeek(ref), 6)]
  return [startOfMonth(ref), endOfMonth(ref)]
}

const CONTACT_TYPES = new Set(['whatsapp', 'ligacao', 'email', 'visita'])

export function proposalTotal(p, items) {
  const its = items.filter((i) => i.proposal_id === p.id)
  const disc = 1 - (Number(p.discount_pct) || 0) / 100
  const once = its.filter((i) => !i.recurring).reduce((a, i) => a + i.unit_cents * (Number(i.qty) || 1), 0)
  const rec = its.filter((i) => i.recurring).reduce((a, i) => a + i.unit_cents * (Number(i.qty) || 1), 0)
  return { once: Math.round(once * disc), monthly: Math.round(rec * disc), year: Math.round((once + rec * 12) * disc) }
}

export function metricValue(w, metric, userId, from, to) {
  const mine = (ownerField) => (r) => !userId || r[ownerField] === userId
  switch (metric) {
    case 'contatos':
      return w.activities.filter((a) => CONTACT_TYPES.has(a.type) && inRange(a.happened_at, from, to) && mine('owner_id')(a)).length
    case 'respostas':
      return w.activities.filter((a) => a.result === 'respondeu' && inRange(a.happened_at, from, to) && mine('owner_id')(a)).length
    case 'reunioes':
      return w.meetings.filter((m) => m.lead_id && inRange(m.created_at, from, to) && mine('owner_id')(m)).length
    case 'handoffs':
      return w.leads.filter((l) => l.handed_off_at && inRange(l.handed_off_at, from, to) && (!userId || l.handed_off_by === userId)).length
    case 'propostas':
      return w.proposals.filter((p) => p.sent_at && inRange(p.sent_at, from, to) && mine('owner_id')(p)).length
    case 'fechamentos':
      return w.leads.filter((l) => l.won_at && inRange(l.won_at, from, to) && (!userId || l.owner_id === userId || l.handed_off_by === userId)).length
    case 'valor_fechado':
      return w.leads.filter((l) => l.won_at && inRange(l.won_at, from, to) && (!userId || l.owner_id === userId || l.handed_off_by === userId))
        .reduce((a, l) => a + (l.estimated_value_cents || 0), 0)
    case 'faturamento':
      return w.receivables.filter((r) => r.received_on && inRange(r.received_on, from, to)).reduce((a, r) => a + r.amount_cents, 0)
    default:
      return 0
  }
}

// ------------------------------------------------------------------
// Financeiro
// ------------------------------------------------------------------
export function cashSummary(w, ref = today()) {
  const m0 = startOfMonth(ref), m1 = endOfMonth(ref), in30 = addDays(ref, 30)
  const open = (r) => !r.received_on
  const unpaid = (p) => !p.paid_on
  const received = w.receivables.filter((r) => r.received_on && inRange(r.received_on, m0, m1)).reduce((a, r) => a + r.amount_cents, 0)
  const billedMonth = w.receivables.filter((r) => inRange(r.due_on, m0, m1)).reduce((a, r) => a + r.amount_cents, 0)
  const recv30 = w.receivables.filter((r) => open(r) && r.due_on <= in30).reduce((a, r) => a + r.amount_cents, 0)
  const overdueR = w.receivables.filter((r) => open(r) && r.due_on < ref)
  const pay30 = w.payables.filter((p) => unpaid(p) && p.due_on <= in30).reduce((a, p) => a + p.amount_cents, 0)
  const payWeek = w.payables.filter((p) => unpaid(p) && p.due_on >= ref && p.due_on <= addDays(ref, 7))
  const overdueP = w.payables.filter((p) => unpaid(p) && p.due_on < ref)
  const mrr = w.contracts.filter((c) => c.kind === 'recurring' && c.active && (!c.ends_on || c.ends_on >= ref))
    .reduce((a, c) => a + (c.monthly_cents || 0), 0)
  // saldo: tudo que entrou menos tudo que saiu (desde o início do uso do ERP)
  const cash = w.receivables.filter((r) => r.received_on).reduce((a, r) => a + r.amount_cents, 0)
    - w.payables.filter((p) => p.paid_on).reduce((a, p) => a + p.amount_cents, 0)
  return {
    received, billedMonth, recv30, pay30, mrr, cash, projected: cash + recv30 - pay30,
    projRecv: w.carteira?.totais.faltaReceber || 0, projComm: w.carteira?.totais.comissaoAPagar || 0,
    overdueR, overdueP, payWeek,
  }
}

export function monthlyFlow(w, months = 6, ahead = 3, ref = today()) {
  const keys = []
  const d = new Date(Number(ref.slice(0, 4)), Number(ref.slice(5, 7)) - 1 - (months - 1), 1)
  for (let i = 0; i < months + ahead; i++) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  const cur = ref.slice(0, 7)
  return keys.map((k) => {
    const past = k < cur, isCur = k === cur
    const inR = w.receivables.filter((r) => (r.received_on || r.due_on).slice(0, 7) === k)
    const outP = w.payables.filter((p) => (p.paid_on || p.due_on).slice(0, 7) === k)
    const inDone = inR.filter((r) => r.received_on).reduce((a, r) => a + r.amount_cents, 0)
    let inOpen = inR.filter((r) => !r.received_on).reduce((a, r) => a + r.amount_cents, 0)
    const outDone = outP.filter((p) => p.paid_on).reduce((a, p) => a + p.amount_cents, 0)
    let outOpen = outP.filter((p) => !p.paid_on).reduce((a, p) => a + p.amount_cents, 0)
    if (k > cur) {
      // meses ainda não gerados: projeta contratos mensais e despesas recorrentes
      w.contracts.filter((c) => c.kind === 'recurring' && c.active && c.monthly_cents && c.starts_on.slice(0, 7) <= k && (!c.ends_on || c.ends_on.slice(0, 7) >= k))
        .forEach((c) => { if (!w.receivables.some((r) => r.contract_id === c.id && r.due_on.slice(0, 7) === k)) inOpen += c.monthly_cents })
      w.payables.filter((p) => p.recurrence !== 'once' && p.series_id === p.id).forEach((p) => {
        if (p.due_on.slice(0, 7) > k) return
        if (p.recurrence === 'yearly' && p.due_on.slice(5, 7) !== k.slice(5, 7)) return
        if (!w.payables.some((x) => x.series_id === p.series_id && x.due_on.slice(0, 7) === k)) outOpen += p.amount_cents
      })
    }
    return { key: k, past, isCur, inDone, inOpen, outDone, outOpen, in: inDone + (past ? 0 : inOpen), out: outDone + (past ? 0 : outOpen) }
  })
}

export function weekdayCount(from, to) {
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const w = new Date(d + 'T12:00:00').getDay()
    if (w && w !== 6) n++
  }
  return n
}
