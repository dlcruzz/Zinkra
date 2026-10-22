// Motor de inteligência: lê o estado da empresa e devolve sugestões
// priorizadas, cada uma com a ação que resolve. Sem custo de API.
import { addDays, today, daysSince, daysFromToday, brl0, pctLabel, inRange, startOfMonth, endOfMonth, localDay } from './format'
import { metricValue, periodRange, cashSummary, monthlyFlow, weekdayCount, proposalTotal } from './world'
import { METRICS, MONEY_METRICS } from './constants'

const OPEN_PROJECT = new Set(['briefing', 'design', 'desenvolvimento', 'revisao', 'ajustes'])
const CONTACT_TYPES = new Set(['whatsapp', 'ligacao', 'email', 'visita'])

export function buildInsights(w, ctx) {
  const { uid, isDirector, canSee, memberName } = ctx
  const t = today()
  const rules = w.settings.lead_rules || {}
  const stale = rules.stale_days ?? 7
  const out = []
  const push = (i) => out.push(i)
  const stageOf = (id) => w.P.stage(id)
  const openLead = (l) => { const s = stageOf(l.stage_id); return s && (s.kind === 'open') }
  const myLead = (l) => isDirector || l.owner_id === uid || (!l.owner_id && canSee('crm'))
  const leads = w.leads.filter((l) => !l.archived_at)

  // ---------------- Comercial ----------------
  if (canSee('crm')) {
    const due = leads.filter((l) => openLead(l) && myLead(l) && l.next_step_at && l.next_step_at <= t)
    const late = due.filter((l) => l.next_step_at < t)
    if (due.length) push({
      key: `followups:${t}`, level: late.length ? 'hi' : 'md', area: 'Comercial',
      title: `${due.length} follow-up${due.length > 1 ? 's' : ''} para hoje${late.length ? `, ${late.length} atrasado${late.length > 1 ? 's' : ''}` : ''}`,
      detail: 'A sessão de prospecção já monta a fila com a mensagem certa de cada um.',
      action: { label: 'Abrir sessão', to: '/erp/prospeccao' },
    })

    const hot = leads.filter((l) => myLead(l) && stageOf(l.stage_id)?.name?.toLowerCase().startsWith('respond')
      && (!l.last_contact_at || daysSince(localDay(l.last_contact_at)) >= 1))
    hot.slice(0, 3).forEach((l) => push({
      key: `hot:${l.id}`, level: 'hi', area: 'Comercial',
      title: `${l.company} respondeu e está esperando`,
      detail: `Último contato ${l.last_contact_at ? `há ${daysSince(localDay(l.last_contact_at))} dia(s)` : 'sem registro'}. Lead quente esfria rápido: responda hoje.`,
      action: { label: 'Abrir lead', to: `/erp/leads/${l.id}` },
    }))

    const noStep = leads.filter((l) => openLead(l) && myLead(l) && !l.next_step_at && stageOf(l.stage_id)?.sort > 1)
    if (noStep.length) push({
      key: `nostep:${t}`, level: 'md', area: 'Comercial',
      title: `${noStep.length} lead${noStep.length > 1 ? 's' : ''} sem próximo passo`,
      detail: 'Lead sem data de próxima ação é lead esquecido. Filtre e defina em lote.',
      action: { label: 'Ver leads', to: '/erp/leads?view=sem-passo' },
    })

    const stuck = leads.filter((l) => openLead(l) && myLead(l) && daysSince(localDay(l.stage_changed_at)) > stale
      && (!l.last_contact_at || daysSince(localDay(l.last_contact_at)) > stale))
    if (stuck.length >= 3) push({
      key: `stuck:${t.slice(0, 7)}`, level: 'md', area: 'Comercial',
      title: `${stuck.length} leads parados há mais de ${stale} dias`,
      detail: 'Mande a reativação (R1) ou marque como perdido para limpar o funil e medir de verdade.',
      action: { label: 'Ver parados', to: '/erp/leads?view=parados' },
    })

    if (isDirector) {
      const ownerless = leads.filter((l) => !l.owner_id && openLead(l))
      if (ownerless.length >= 10) push({
        key: `ownerless:${t}`, level: 'op', area: 'Comercial',
        title: `${ownerless.length} leads sem dono`,
        detail: 'Distribua para o prospector ou deixe na fila "sem dono" para ele assumir.',
        action: { label: 'Distribuir', to: '/erp/leads?view=sem-dono' },
      })
    }

    // scripts: o que mais converte
    const byCode = scriptStats(w.activities)
    const scored = Object.entries(byCode).filter(([, s]) => s.sent >= 15).map(([code, s]) => ({ code, ...s }))
      .sort((a, b) => b.rate - a.rate)
    if (scored.length >= 2) {
      const best = scored[0], worst = scored[scored.length - 1]
      if (best.rate > worst.rate * 1.5) push({
        key: `scripts:${t.slice(0, 7)}`, level: 'op', area: 'Comercial',
        title: `${best.code} responde ${pctLabel(best.rep, best.sent)}, ${worst.code} só ${pctLabel(worst.rep, worst.sent)}`,
        detail: `Use mais a ${best.code} e reescreva a ${worst.code} no Playbooks. Base: ${best.sent + worst.sent} envios.`,
        action: { label: 'Abrir playbooks', to: '/erp/playbooks' },
      })
    }

    // nicho que mais converte em cliente
    const byNiche = {}
    leads.concat(w.leads.filter((l) => l.archived_at)).forEach((l) => {
      if (!l.niche) return
      const s = (byNiche[l.niche] ||= { n: 0, won: 0 })
      s.n++
      if (l.won_at) s.won++
    })
    const nich = Object.entries(byNiche).filter(([, s]) => s.n >= 20).map(([k, s]) => ({ k, ...s, r: s.won / s.n })).sort((a, b) => b.r - a.r)
    if (nich.length >= 2 && nich[0].r > 0 && nich[0].r >= nich[nich.length - 1].r * 2) push({
      key: `niche:${t.slice(0, 7)}`, level: 'op', area: 'Comercial',
      title: `${nich[0].k} converte ${pctLabel(nich[0].won, nich[0].n, 1)} em cliente`,
      detail: `${nich[nich.length - 1].k} converte ${pctLabel(nich[nich.length - 1].won, nich[nich.length - 1].n, 1)}. Concentre os próximos termos de busca em ${nich[0].k}.`,
      action: { label: 'Ver relatório', to: '/erp/relatorios?r=nicho' },
    })

    // motivo de perda dominante
    const lostRe = leads.concat(w.leads.filter((l) => l.archived_at)).filter((l) => l.lost_reason)
    if (lostRe.length >= 10) {
      const c = {}
      lostRe.forEach((l) => { c[l.lost_reason] = (c[l.lost_reason] || 0) + 1 })
      const [top, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]
      if (n / lostRe.length >= 0.3) push({
        key: `lost:${top}:${t.slice(0, 7)}`, level: 'op', area: 'Comercial',
        title: `"${top}" explica ${pctLabel(n, lostRe.length)} das perdas`,
        detail: top === 'Preço'
          ? 'Crie uma oferta de entrada parcelada e reative esses leads com a mensagem P1.'
          : 'Vale ajustar o script de abordagem para tratar esse motivo antes que ele apareça.',
        action: { label: 'Ver perdidos', to: '/erp/leads?view=perdidos' },
      })
    }
  }

  // propostas
  if (canSee('propostas')) {
    w.proposals.filter((p) => ['enviada', 'vista'].includes(p.status) && (isDirector || p.owner_id === uid)).forEach((p) => {
      const days = daysSince(localDay(p.sent_at))
      const exp = p.valid_until ? daysFromToday(p.valid_until) : null
      const name = w.clients.find((c) => c.id === p.client_id)?.name || w.leads.find((l) => l.id === p.lead_id)?.company || `#${p.number}`
      if (exp !== null && exp < 0) push({
        key: `prop-exp:${p.id}`, level: 'md', area: 'Comercial', title: `Proposta para ${name} expirou`,
        detail: 'Renove a validade e retome a conversa, ou marque como expirada.',
        action: { label: 'Abrir proposta', to: `/erp/propostas/${p.id}` },
      })
      else if (days !== null && days >= 4) push({
        key: `prop-wait:${p.id}:${Math.floor(days / 4)}`, level: days >= 8 ? 'hi' : 'md', area: 'Comercial',
        title: `Proposta para ${name} sem resposta há ${days} dias`,
        detail: `Valor ${brl0(proposalTotal(p, w.items).once)}${proposalTotal(p, w.items).monthly ? ` + ${brl0(proposalTotal(p, w.items).monthly)}/mês` : ''}. Ligue em vez de mandar mensagem.`,
        action: { label: 'Abrir proposta', to: `/erp/propostas/${p.id}` },
      })
    })
  }

  // metas fora do ritmo
  w.goals.filter((g) => !g.archived_at && (g.user_id === uid || (isDirector))).forEach((g) => {
    if (g.period === 'day') return
    const [from, to] = periodRange(g.period, t)
    const total = weekdayCount(from, to)
    const passed = weekdayCount(from, t)
    if (passed < 2) return
    const done = metricValue(w, g.metric, g.user_id, from, t)
    const proj = passed ? (done / passed) * total : 0
    const ratio = Number(g.target) ? proj / Number(g.target) : 1
    if (ratio < 0.8) {
      const left = Math.max(0, Number(g.target) - done)
      const daysLeft = Math.max(1, total - passed)
      const fmt = MONEY_METRICS.has(g.metric) ? brl0 : (v) => Math.ceil(v)
      push({
        key: `goal:${g.id}:${t}`, level: ratio < 0.6 ? 'hi' : 'md', area: 'Metas',
        title: `${METRICS[g.metric]}${g.user_id ? ` · ${memberName(g.user_id)}` : ''}: ritmo de ${Math.round(ratio * 100)}% da meta`,
        detail: `Faltam ${fmt(left)} em ${daysLeft} dia(s) útil(eis): ${fmt(left / daysLeft)} por dia para bater.`,
        action: { label: 'Ver metas', to: '/erp/metas' },
      })
    }
  })

  // cobertura do funil x meta de faturamento
  if (isDirector) {
    const goal = w.settings.goals?.monthly_revenue_cents
    if (goal) {
      const cs = cashSummary(w, t)
      const remaining = goal - cs.billedMonth
      const openPipe = leads.filter(openLead).reduce((a, l) => a + (l.estimated_value_cents || 0) * ((stageOf(l.stage_id)?.probability || 0) / 100), 0)
      if (remaining > 0 && openPipe < remaining && daysFromToday(endOfMonth(t)) < 20) push({
        key: `coverage:${t.slice(0, 7)}`, level: 'md', area: 'Comercial',
        title: `Funil ponderado (${brl0(openPipe)}) não cobre o que falta da meta (${brl0(remaining)})`,
        detail: 'Aumente o volume de contatos esta semana ou ofereça upsell aos clientes ativos.',
        action: { label: 'Ver upsell', to: '/erp/pipelines/upsell' },
      })
    }
  }

  // ---------------- Operação ----------------
  if (canSee('projetos')) {
    w.projects.filter((p) => OPEN_PROJECT.has(p.stage) && (isDirector || p.owner_id === uid)).forEach((p) => {
      if (p.due_on && p.due_on < t) push({
        key: `proj-late:${p.id}:${t}`, level: 'hi', area: 'Operação',
        title: `${p.name} está ${-daysFromToday(p.due_on)} dia(s) atrasado`,
        detail: 'Combine nova data com o cliente e registre, ou acelere as tarefas que faltam.',
        action: { label: 'Abrir projeto', to: `/erp/projetos/${p.id}` },
      })
      const mins = w.timeEntries.filter((e) => e.project_id === p.id || w.tasks.some((tk) => tk.id === e.task_id && tk.project_id === p.id))
        .reduce((a, e) => a + (e.minutes || 0), 0)
      if (p.est_hours && mins / 60 > Number(p.est_hours)) push({
        key: `proj-hours:${p.id}`, level: 'md', area: 'Operação',
        title: `${p.name} passou das horas estimadas`,
        detail: `${Math.round(mins / 60)}h gastas de ${p.est_hours}h. ${p.value_cents ? `Valor/hora atual: ${brl0((p.value_cents / mins) * 60)}.` : ''} Revise o escopo antes de aceitar novos ajustes.`,
        action: { label: 'Abrir projeto', to: `/erp/projetos/${p.id}` },
      })
    })
  }

  if (canSee('tarefas')) {
    const mineOpen = w.tasks.filter((x) => x.status !== 'done' && x.owner_id === uid)
    const lateT = mineOpen.filter((x) => x.due_on && x.due_on < t)
    if (lateT.length) push({
      key: `tasks-late:${t}`, level: lateT.length > 3 ? 'hi' : 'md', area: 'Tarefas',
      title: `${lateT.length} tarefa${lateT.length > 1 ? 's' : ''} atrasada${lateT.length > 1 ? 's' : ''}`,
      detail: 'Reagende tudo para hoje com um clique ou conclua as que já foram feitas.',
      action: { label: 'Abrir Hoje', to: '/erp/hoje' },
    })
    if (isDirector) {
      const wk = addDays(t, -7)
      const created = w.tasks.filter((x) => x.created_at >= wk).length
      const done = w.tasks.filter((x) => x.done_at && x.done_at >= wk).length
      if (created >= 10 && done < created * 0.6) push({
        key: `tasks-backlog:${t.slice(0, 7)}:${Math.floor(Number(t.slice(8)) / 7)}`, level: 'md', area: 'Produtividade',
        title: `Entraram ${created} tarefas e saíram ${done} nesta semana`,
        detail: 'A pilha está crescendo. Corte, delegue ou mova prazos antes que tudo vire urgente.',
        action: { label: 'Ver tarefas', to: '/erp/tarefas' },
      })
    }
  }

  if (canSee('reunioes')) {
    w.meetings.filter((m) => (isDirector || m.owner_id === uid)).forEach((m) => {
      const d = localDay(m.starts_at)
      if (d < t && daysSince(d) <= 7 && !m.notes && !m.decisions) push({
        key: `meet-notes:${m.id}`, level: 'md', area: 'Reuniões',
        title: `Registre o que foi decidido em "${m.title}"`,
        detail: 'Sem notas, os próximos passos se perdem. Cada passo vira tarefa com um clique.',
        action: { label: 'Abrir reunião', to: `/erp/reunioes?id=${m.id}` },
      })
      if (d === t && !m.agenda) push({
        key: `meet-agenda:${m.id}`, level: 'op', area: 'Reuniões',
        title: `"${m.title}" é hoje e está sem pauta`,
        detail: 'Três tópicos bastam. A reunião rende o dobro.',
        action: { label: 'Escrever pauta', to: `/erp/reunioes?id=${m.id}` },
      })
    })
  }

  // clientes: check-in e upsell
  if (canSee('clientes') && isDirector) {
    const active = w.clients.filter((c) => c.status === 'ativo')
    active.forEach((c) => {
      const lastMeet = w.meetings.filter((m) => m.client_id === c.id).map((m) => localDay(m.starts_at)).sort().pop()
      const lastAct = w.activities.filter((a) => a.client_id === c.id).map((a) => localDay(a.happened_at)).sort().pop()
      const last = [lastMeet, lastAct, c.since].filter(Boolean).sort().pop()
      if (daysSince(last) > 60) push({
        key: `checkin:${c.id}:${t.slice(0, 7)}`, level: 'op', area: 'Clientes',
        title: `${c.name} sem contato há ${daysSince(last)} dias`,
        detail: 'Um check-in rápido evita cancelamento e costuma gerar indicação ou upsell.',
        action: { label: 'Abrir cliente', to: `/erp/clientes?id=${c.id}` },
      })
      const cts = w.contracts.filter((k) => k.client_id === c.id && k.active)
      const hasRec = cts.some((k) => k.kind === 'recurring')
      const delivered = w.projects.find((p) => p.client_id === c.id && p.stage === 'entregue' && p.delivered_on && daysSince(p.delivered_on) <= 30)
      if (delivered && !hasRec) push({
        key: `upsell:${c.id}`, level: 'op', area: 'Clientes',
        title: `${c.name} recebeu o projeto e não tem plano mensal`,
        detail: 'Momento ideal para oferecer Social Media Basic (R$ 227/mês) e pedir uma indicação (30% para quem indica).',
        action: { label: 'Criar oportunidade', to: `/erp/clientes?id=${c.id}&upsell=1` },
      })
    })
  }

  // ---------------- Financeiro ----------------
  if (canSee('financeiro')) {
    const cs = cashSummary(w, t)
    if (cs.overdueR.length) {
      const sum = cs.overdueR.reduce((a, r) => a + r.amount_cents, 0)
      push({
        key: `overdue-r:${t}`, level: 'hi', area: 'Financeiro',
        title: `${brl0(sum)} vencidos para receber (${cs.overdueR.length})`,
        detail: 'A mensagem de cobrança já está pronta com valor e chave Pix.',
        action: { label: 'Cobrar', to: '/erp/financeiro/receber?f=vencidas' },
      })
    }
    const soon = w.receivables.filter((r) => !r.received_on && r.due_on > t && r.due_on <= addDays(t, 2))
    if (soon.length) push({
      key: `soon-r:${t}`, level: 'op', area: 'Financeiro',
      title: `${soon.length} cobrança${soon.length > 1 ? 's' : ''} vence${soon.length > 1 ? 'm' : ''} em até 2 dias`,
      detail: 'Mande o lembrete agora e reduza atrasos.',
      action: { label: 'Enviar lembretes', to: '/erp/financeiro/receber?f=semana' },
    })
    const payDue = w.payables.filter((p) => !p.paid_on && p.due_on <= addDays(t, 3))
    if (payDue.length) push({
      key: `pay-due:${t}`, level: payDue.some((p) => p.due_on < t) ? 'hi' : 'md', area: 'Financeiro',
      title: `${payDue.length} conta${payDue.length > 1 ? 's' : ''} a pagar até ${addDays(t, 3).slice(8)}/${addDays(t, 3).slice(5, 7)}`,
      detail: `Total ${brl0(payDue.reduce((a, p) => a + p.amount_cents, 0))}.`,
      action: { label: 'Ver contas', to: '/erp/financeiro/pagar' },
    })
    const flow = monthlyFlow(w, 1, 3, t).filter((m) => !m.past)
    const neg = flow.find((m) => m.in < m.out)
    if (neg) push({
      key: `flow-neg:${neg.key}`, level: 'hi', area: 'Financeiro',
      title: `Previsão de ${neg.key.slice(5)}/${neg.key.slice(0, 4)} fecha no negativo`,
      detail: `Entradas previstas ${brl0(neg.in)} contra saídas ${brl0(neg.out)}. Feche projetos ou antecipe recebimentos.`,
      action: { label: 'Ver fluxo', to: '/erp/financeiro/fluxo' },
    })
    // concentração de receita
    const from90 = addDays(t, -90)
    const rec90 = w.receivables.filter((r) => r.received_on && r.received_on >= from90)
    const tot90 = rec90.reduce((a, r) => a + r.amount_cents, 0)
    if (tot90) {
      const byC = {}
      rec90.forEach((r) => { byC[r.client_id] = (byC[r.client_id] || 0) + r.amount_cents })
      const [cid, v] = Object.entries(byC).sort((a, b) => b[1] - a[1])[0]
      if (v / tot90 > 0.45 && Object.keys(byC).length > 1) push({
        key: `concentration:${t.slice(0, 7)}`, level: 'md', area: 'Financeiro',
        title: `${w.clients.find((c) => c.id === cid)?.name || 'Um cliente'} é ${pctLabel(v, tot90)} da receita`,
        detail: 'Dependência alta de um cliente é risco. Priorize fechar contratos recorrentes com outros.',
        action: { label: 'Ver relatório', to: '/erp/relatorios?r=receita' },
      })
    }
    const commDue = w.commissions.filter((c) => c.status === 'a_pagar')
    if (commDue.length) push({
      key: `comm:${t}`, level: 'op', area: 'Parceiros',
      title: `${commDue.length} comissão(ões) liberada(s) para pagar`,
      detail: `Total ${brl0(commDue.reduce((a, c) => a + c.amount_cents, 0))}. Pagar em dia mantém os parceiros indicando.`,
      action: { label: 'Ver parceiros', to: '/erp/parceiros' },
    })
    // valor por hora baixo
    if (isDirector) {
      const byClient = {}
      w.timeEntries.forEach((e) => {
        const task = w.tasks.find((x) => x.id === e.task_id)
        const proj = w.projects.find((p) => p.id === (e.project_id || task?.project_id))
        const cid = proj?.client_id || task?.client_id
        if (cid) byClient[cid] = (byClient[cid] || 0) + (e.minutes || 0)
      })
      Object.entries(byClient).forEach(([cid, mins]) => {
        if (mins < 600) return
        const money = w.receivables.filter((r) => r.client_id === cid).reduce((a, r) => a + r.amount_cents, 0)
        const perHour = money / (mins / 60)
        if (perHour < 5000) push({
          key: `perhour:${cid}:${t.slice(0, 7)}`, level: 'md', area: 'Financeiro',
          title: `${w.clients.find((c) => c.id === cid)?.name || 'Cliente'} rende ${brl0(perHour)} por hora`,
          detail: `${Math.round(mins / 60)}h trabalhadas para ${brl0(money)} faturados. Reajuste o preço ou limite o escopo.`,
          action: { label: 'Ver horas', to: '/erp/relatorios?r=horas' },
        })
      })
    }
  }

  // ideias aprovadas paradas
  w.ideas.filter((i) => i.status === 'aprovada' && daysSince(localDay(i.updated_at)) > 14 && (isDirector || i.owner_id === uid)).slice(0, 2)
    .forEach((i) => push({
      key: `idea:${i.id}`, level: 'op', area: 'Ideias',
      title: `Ideia aprovada parada: ${i.title}`,
      detail: 'Transforme em tarefa com prazo ou volte para avaliação.',
      action: { label: 'Ver ideias', to: '/erp/ideias' },
    }))

  // dispensadas
  const dismissed = new Set(w.dismissals.filter((d) => d.until >= t).map((d) => d.key))
  const order = { hi: 0, md: 1, op: 2, info: 3 }
  return out.filter((i) => !dismissed.has(i.key)).sort((a, b) => order[a.level] - order[b.level])
}

// ---------------- Briefing do dia ----------------
export function buildBriefing(w, ctx, insights) {
  const { uid } = ctx
  const t = today()
  const myTasks = w.tasks.filter((x) => x.owner_id === uid && x.status !== 'done' && x.due_on && x.due_on <= t)
  const meetingsToday = w.meetings.filter((m) => localDay(m.starts_at) === t && (m.owner_id === uid || ctx.isDirector))
  const followups = w.leads.filter((l) => !l.archived_at && (l.owner_id === uid || (!l.owner_id && ctx.isDirector))
    && l.next_step_at && l.next_step_at <= t && w.P.stage(l.stage_id)?.kind === 'open')
  const parts = []
  if (meetingsToday.length) parts.push(`${meetingsToday.length} reunião(ões)`)
  if (myTasks.length) parts.push(`${myTasks.length} tarefa(s) para hoje ou atrasadas`)
  if (followups.length) parts.push(`${followups.length} follow-up(s)`)
  const top = insights.filter((i) => i.level === 'hi').slice(0, 3)
  return {
    summary: parts.length ? `Hoje: ${parts.join(', ')}.` : 'Nada urgente para hoje. Bom dia para prospectar e adiantar projetos.',
    focus: top.map((i) => i.title),
  }
}

// ---------------- Prioridade de tarefas ("o que fazer agora") ----------------
export function rankTasks(tasks, w) {
  const t = today()
  const pr = { urgente: 40, alta: 25, normal: 10, baixa: 0 }
  return [...tasks].map((x) => {
    let s = pr[x.priority] || 0
    if (x.due_on) {
      const d = daysFromToday(x.due_on)
      s += d < 0 ? 30 + Math.min(20, -d * 3) : d === 0 ? 25 : d === 1 ? 12 : d <= 3 ? 6 : 0
    }
    const proj = w?.projects?.find((p) => p.id === x.project_id)
    if (proj?.due_on && daysFromToday(proj.due_on) <= 3) s += 10
    if (x.front === 'comercial') s += 4 // dinheiro novo primeiro
    if (x.status === 'doing') s += 8
    return { ...x, _score: s }
  }).sort((a, b) => b._score - a._score)
}

// funil de prospecção num período
export function prospectFunnel(w, from, to, userId) {
  const acts = w.activities.filter((a) => inRange(a.happened_at, from, to) && (!userId || a.owner_id === userId))
  const contacted = new Set(acts.filter((a) => CONTACT_TYPES.has(a.type)).map((a) => a.lead_id))
  const replied = new Set(acts.filter((a) => a.result === 'respondeu').map((a) => a.lead_id))
  const meetings = new Set(w.meetings.filter((m) => m.lead_id && inRange(m.created_at, from, to) && (!userId || m.owner_id === userId)).map((m) => m.lead_id))
  const proposals = new Set(w.proposals.filter((p) => p.sent_at && inRange(p.sent_at, from, to) && p.lead_id).map((p) => p.lead_id))
  const won = w.leads.filter((l) => l.won_at && inRange(l.won_at, from, to) && (!userId || l.owner_id === userId || l.handed_off_by === userId))
  return [
    { label: 'Contatados', value: contacted.size },
    { label: 'Responderam', value: replied.size },
    { label: 'Reunião', value: meetings.size },
    { label: 'Proposta', value: proposals.size },
    { label: 'Ganho', value: won.length },
  ]
}

export const monthRange = (ref = today()) => [startOfMonth(ref), endOfMonth(ref)]

// taxa de resposta por mensagem: envio conta resposta do mesmo lead nos 7 dias seguintes
export function scriptStats(activities) {
  const repliesByLead = {}
  activities.filter((a) => a.result === 'respondeu').forEach((a) => { (repliesByLead[a.lead_id] ||= []).push(a.happened_at) })
  const by = {}
  activities.filter((a) => a.script_code && (a.result === 'enviado' || a.result === 'sem_resposta')).forEach((a) => {
    const s = (by[a.script_code] ||= { sent: 0, rep: 0, rate: 0 })
    s.sent++
    const lim = new Date(new Date(a.happened_at).getTime() + 7 * 86400000).toISOString()
    if ((repliesByLead[a.lead_id] || []).some((r) => r > a.happened_at && r <= lim)) s.rep++
  })
  Object.values(by).forEach((s) => { s.rate = s.sent ? s.rep / s.sent : 0 })
  return by
}
