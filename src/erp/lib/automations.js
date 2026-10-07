// Automações: o que o sistema faz sozinho para você não repetir trabalho.
import { supabase } from './supabase'
import { insert, update, fetchRows, notify, emitChange, rpc } from './data'
import { addDays, addMonths, today, toCents } from './format'

// ------------------------------------------------------------------
// Pipelines
// ------------------------------------------------------------------
let stagesCache = null
export async function getPipelines(force) {
  if (stagesCache && !force) return stagesCache
  const [pipelines, stages] = await Promise.all([
    fetchRows('pipelines', { order: 'sort', ascending: true }),
    fetchRows('pipeline_stages', { order: 'sort', ascending: true }),
  ])
  stagesCache = {
    pipelines: pipelines.filter((p) => p.active),
    stages,
    stage: (id) => stages.find((s) => s.id === id),
    of: (pipelineId) => stages.filter((s) => s.pipeline_id === pipelineId),
    bySlug: (slug) => pipelines.find((p) => p.slug === slug),
    find(slug, pred) {
      const p = pipelines.find((x) => x.slug === slug)
      return p ? stages.find((s) => s.pipeline_id === p.id && pred(s)) : null
    },
  }
  return stagesCache
}
export const resetPipelineCache = () => { stagesCache = null }

export async function defaultLeadStage() {
  const P = await getPipelines()
  const p = P.bySlug('fria') || P.pipelines[0]
  const s = P.of(p?.id)[0]
  return { pipeline_id: p?.id || null, stage_id: s?.id || null }
}

async function stageByName(pipelineId, names) {
  const P = await getPipelines()
  const list = P.of(pipelineId)
  return list.find((s) => names.some((n) => s.name.toLowerCase().startsWith(n)))
}

export async function moveLead(lead, stageId, extra = {}) {
  const P = await getPipelines()
  const st = P.stage(stageId)
  if (!st) return
  const patch = { stage_id: stageId, pipeline_id: st.pipeline_id, ...extra }
  await update('leads', lead.id, patch)
  if (st.kind === 'handoff') emitChange('tasks')
  return st
}

// ------------------------------------------------------------------
// Registro de contato com follow-up automático
// ------------------------------------------------------------------
export async function registerActivity(lead, { type = 'whatsapp', result = null, script_code = null, note = null }) {
  const P = await getPipelines()
  const settings = (await fetchRows('settings', { order: null })).reduce((a, r) => ({ ...a, [r.key]: r.value }), {})
  const fu = settings.lead_rules?.follow_up_days ?? 3

  await insert('activities', { lead_id: lead.id, type, result, script_code, note })

  const st = P.stage(lead.stage_id)
  const pipeline = P.pipelines.find((p) => p.id === lead.pipeline_id)
  const patch = {}
  let moveTo = null

  if (result === 'invalido') {
    const lost = P.of(lead.pipeline_id).find((s) => s.kind === 'lost')
    if (lost) { moveTo = lost.id; patch.lost_reason = 'Número inválido' }
    patch.next_step = null; patch.next_step_at = null; patch.next_step_code = null
  } else if (result === 'respondeu') {
    if (pipeline?.slug === 'fria' && st && st.sort < 3) {
      const s = await stageByName(lead.pipeline_id, ['respond'])
      if (s) moveTo = s.id
    }
    patch.next_step = 'Responder e enviar análise (V2)'
    patch.next_step_code = 'V2'
    patch.next_step_at = today()
  } else if (result === 'enviado' || result === 'sem_resposta') {
    if (pipeline?.slug === 'fria' && st && st.sort === 1) {
      const s = await stageByName(lead.pipeline_id, ['contat'])
      if (s) moveTo = s.id
    }
    // quantas tentativas sem resposta nos últimos 30 dias?
    const { count } = await supabase.from('activities').select('id', { count: 'exact', head: true })
      .eq('lead_id', lead.id).in('result', ['enviado', 'sem_resposta']).gte('happened_at', addDays(today(), -30))
    if ((count || 0) >= 3) {
      patch.next_step = 'Reativar daqui a 30 dias (R1)'; patch.next_step_code = 'R1'; patch.next_step_at = addDays(today(), 30)
    } else {
      patch.next_step = 'Follow-up (F1)'; patch.next_step_code = 'F1'; patch.next_step_at = addDays(today(), fu)
    }
  }
  if (moveTo && moveTo !== lead.stage_id) {
    // o trigger da etapa pode definir a data; a nossa regra vem depois e prevalece
    await update('leads', lead.id, { stage_id: moveTo, pipeline_id: lead.pipeline_id }, { quiet: true })
  }
  if (Object.keys(patch).length) await update('leads', lead.id, patch, { quiet: true })
  emitChange('leads', 'activities')
}

// ------------------------------------------------------------------
// Projetos a partir de template
// ------------------------------------------------------------------
export async function createProjectFromTemplate(templateId, base) {
  const starts = base.starts_on || today()
  let tpl = null, items = []
  if (templateId) {
    const [t] = await fetchRows('project_templates', { where: (q) => q.eq('id', templateId), order: null })
    tpl = t
    items = await fetchRows('template_items', { where: (q) => q.eq('template_id', templateId), order: 'sort', ascending: true })
  }
  const project = await insert('projects', {
    stage: 'briefing',
    est_hours: tpl?.est_hours ?? null,
    due_on: base.due_on || (tpl?.duration_days ? addDays(starts, tpl.duration_days) : null),
    front: tpl?.front || base.front || 'sites',
    template_id: templateId || null,
    ...base,
    starts_on: starts,
  })
  if (items.length) {
    const tasks = items.filter((i) => i.kind === 'task').map((i, n) => ({
      title: i.title, project_id: project.id, client_id: project.client_id, front: project.front,
      due_on: addDays(starts, i.offset_days || 0), est_minutes: i.est_minutes, sort: n, owner_id: project.owner_id || undefined,
    }))
    const checklist = items.filter((i) => i.kind === 'checklist').map((i, n) => ({ project_id: project.id, title: i.title, sort: n }))
    const milestones = items.filter((i) => i.kind === 'milestone').map((i, n) => ({
      project_id: project.id, title: i.title, due_on: addDays(starts, i.offset_days || 0), sort: n,
    }))
    if (tasks.length) await insert('tasks', tasks, { quiet: true })
    if (checklist.length) await insert('project_checklist', checklist, { quiet: true })
    if (milestones.length) await insert('milestones', milestones, { quiet: true })
  }
  return project
}

// ------------------------------------------------------------------
// Cliente, contrato e cobranças
// ------------------------------------------------------------------
export async function ensureClient(lead, extra = {}) {
  if (lead?.client_id) {
    const [c] = await fetchRows('clients', { where: (q) => q.eq('id', lead.client_id), order: null, archived: true })
    if (c) return c
  }
  const contacts = lead ? await fetchRows('contacts', { where: (q) => q.eq('lead_id', lead.id), order: 'created_at', ascending: true }) : []
  const main = contacts.find((c) => c.decision_role === 'decisor') || contacts[0]
  const client = await insert('clients', {
    lead_id: lead?.id || null,
    name: extra.name || lead?.company,
    contact_name: extra.contact_name || main?.name || null,
    phone: main?.phone || lead?.phone || null,
    email: main?.email || null,
    instagram: lead?.instagram || null,
    niche: lead?.niche || null,
    partner_id: lead?.partner_id || null,
  })
  if (lead) await update('leads', lead.id, { client_id: client.id }, { quiet: true })
  if (contacts.length) {
    await Promise.all(contacts.map((c) => update('contacts', c.id, { client_id: client.id }, { quiet: true }).catch(() => {})))
  }
  return client
}

// parcelas de um contrato de projeto único
export async function createInstallments(contract, { firstDue = today(), installments = 1 } = {}) {
  const n = Math.max(1, installments)
  const each = Math.floor(contract.total_cents / n)
  const rows = Array.from({ length: n }).map((_, i) => ({
    client_id: contract.client_id, contract_id: contract.id, description: contract.title,
    part_label: `${i + 1}/${n}`, front: contract.front,
    amount_cents: i === n - 1 ? contract.total_cents - each * (n - 1) : each,
    due_on: addMonths(firstDue, i),
  }))
  return insert('receivables', rows, { quiet: true })
}

export async function createCommission(partnerId, contract, base, lead) {
  if (!partnerId || !base) return
  const [partner] = await fetchRows('partners', { where: (q) => q.eq('id', partnerId), order: null })
  const pctv = Number(partner?.pct ?? 30)
  await insert('commissions', {
    partner_id: partnerId, client_id: contract.client_id, contract_id: contract.id, lead_id: lead?.id || null,
    description: contract.title, base_cents: base, pct: pctv, amount_cents: Math.round((base * pctv) / 100),
  }, { quiet: true })
}

// Proposta aceita: cliente, contratos, cobranças, projetos e comissão — tudo de uma vez
export async function acceptProposal(proposal, items, opts = {}) {
  const firstDue = opts.firstDue || proposal.first_due_on || today()
  let lead = null
  if (proposal.lead_id) [lead] = await fetchRows('leads', { where: (q) => q.eq('id', proposal.lead_id), order: null, archived: true })
  const client = proposal.client_id
    ? (await fetchRows('clients', { where: (q) => q.eq('id', proposal.client_id), order: null }))[0]
    : await ensureClient(lead, { contact_name: proposal.contact_name })

  const services = await fetchRows('services', { order: null })
  const disc = 1 - (Number(proposal.discount_pct) || 0) / 100
  const once = items.filter((i) => !i.recurring)
  const rec = items.filter((i) => i.recurring)
  const created = { contracts: [], projects: [] }
  const partnerId = lead?.partner_id || client?.partner_id || null

  if (once.length) {
    const total = Math.round(once.reduce((a, i) => a + i.unit_cents * (Number(i.qty) || 1), 0) * disc)
    const title = once.map((i) => i.description).join(' + ')
    const svc = services.find((s) => s.id === once[0].service_id)
    const contract = await insert('contracts', {
      client_id: client.id, proposal_id: proposal.id, title, kind: 'once', front: svc?.front || 'sites',
      total_cents: total, installments: proposal.installments || 1, starts_on: today(), partner_id: partnerId,
    })
    await createInstallments(contract, { firstDue, installments: proposal.installments || 1 })
    await createCommission(partnerId, contract, total, lead)
    created.contracts.push(contract)
    for (const it of once) {
      const s = services.find((x) => x.id === it.service_id)
      if (opts.createProjects === false) continue
      const p = await createProjectFromTemplate(s?.template_id || null, {
        name: `${it.description} · ${client.name}`, client_id: client.id, contract_id: contract.id,
        type: it.description, front: s?.front || 'sites', value_cents: Math.round(it.unit_cents * (Number(it.qty) || 1) * disc),
      })
      created.projects.push(p)
    }
  }
  for (const it of rec) {
    const s = services.find((x) => x.id === it.service_id)
    const monthly = Math.round(it.unit_cents * (Number(it.qty) || 1) * disc)
    const contract = await insert('contracts', {
      client_id: client.id, proposal_id: proposal.id, title: it.description, kind: 'recurring', front: s?.front || 'social',
      monthly_cents: monthly, billing_day: Math.min(28, Number(firstDue.slice(8, 10)) || 10), starts_on: firstDue, partner_id: partnerId,
    })
    await createCommission(partnerId, contract, monthly, lead)
    created.contracts.push(contract)
    if (opts.createProjects !== false && s?.template_id) {
      const p = await createProjectFromTemplate(s.template_id, {
        name: `${it.description} · ${client.name}`, client_id: client.id, contract_id: contract.id,
        type: it.description, front: s.front, stage: 'manutencao', value_cents: monthly,
      })
      created.projects.push(p)
    }
  }
  await rpc('erp_generate_recurring', {}, { quiet: true }).catch(() => {})
  await update('proposals', proposal.id, { status: 'aceita', accepted_at: new Date().toISOString(), client_id: client.id })

  if (lead) {
    const P = await getPipelines()
    const curKind = P.stage(lead.stage_id)?.kind
    if (curKind !== 'won') {
      const won = P.of(lead.pipeline_id).find((s) => s.kind === 'won') || P.find('vendas', (s) => s.kind === 'won')
      if (won) await update('leads', lead.id, { stage_id: won.id, pipeline_id: won.pipeline_id, next_step: null, next_step_at: null }, { quiet: true })
    }
    await insert('activities', { lead_id: lead.id, client_id: client.id, type: 'sistema', note: `Proposta #${proposal.number} aceita` }, { quiet: true })
  }
  emitChange('clients', 'contracts', 'receivables', 'projects', 'tasks', 'leads', 'commissions')
  notify(`Proposta aceita: ${created.contracts.length} contrato(s) e ${created.projects.length} projeto(s) criados.`, 'ok')
  return { client, ...created }
}

// Ganho direto pelo kanban (sem proposta no sistema)
export async function winLead(lead, { title, kind = 'once', amount_cents, installments = 1, firstDue = today(), templateId, createProject = true }) {
  const client = await ensureClient(lead)
  const contract = await insert('contracts', {
    client_id: client.id, title: title || lead.company, kind, front: 'sites',
    total_cents: kind === 'once' ? amount_cents : 0, monthly_cents: kind === 'recurring' ? amount_cents : 0,
    installments, billing_day: Math.min(28, Number(firstDue.slice(8, 10)) || 10), starts_on: firstDue, partner_id: lead.partner_id || null,
  })
  if (kind === 'once' && amount_cents) await createInstallments(contract, { firstDue, installments })
  else await rpc('erp_generate_recurring', {}, { quiet: true }).catch(() => {})
  await createCommission(lead.partner_id, contract, amount_cents, lead)
  let project = null
  if (createProject) {
    project = await createProjectFromTemplate(templateId || null, {
      name: `${title || 'Projeto'} · ${client.name}`, client_id: client.id, contract_id: contract.id, value_cents: amount_cents,
    })
  }
  emitChange('clients', 'contracts', 'receivables', 'projects', 'tasks')
  return { client, contract, project }
}

// ------------------------------------------------------------------
// Reunião: próximos passos viram tarefas
// ------------------------------------------------------------------
export async function actionToTask(meeting, action) {
  const task = await insert('tasks', {
    title: action.title, due_on: action.due_on || addDays(today(), 2), meeting_id: meeting.id,
    lead_id: meeting.lead_id, client_id: meeting.client_id, project_id: meeting.project_id,
    owner_id: action.owner_id || undefined, front: meeting.project_id ? undefined : meeting.type === 'prospeccao' ? 'comercial' : 'interno',
    auto_key: `meeting-action:${action.id}`,
  })
  await update('meeting_actions', action.id, { task_id: task.id }, { quiet: true })
  return task
}

// ------------------------------------------------------------------
// Cronômetro
// ------------------------------------------------------------------
export async function startTimer({ task_id = null, project_id = null, note = null }) {
  const { data: running } = await supabase.from('time_entries').select('*').is('ended_at', null)
  for (const r of running || []) await update('time_entries', r.id, { ended_at: new Date().toISOString() }, { quiet: true })
  const e = await insert('time_entries', { task_id, project_id, note })
  if (task_id) await supabase.from('tasks').update({ status: 'doing' }).eq('id', task_id).eq('status', 'todo')
  emitChange('time_entries', 'tasks')
  return e
}
export async function stopTimer(entry) {
  await update('time_entries', entry.id, { ended_at: new Date().toISOString() })
  emitChange('time_entries')
}

// ------------------------------------------------------------------
// Financeiro
// ------------------------------------------------------------------
export async function markReceived(r, { date = today(), method = 'Pix' } = {}) {
  await update('receivables', r.id, { received_on: date, method })
  emitChange('commissions', 'payables')
}
export async function markPaid(p, { date = today(), method = 'Pix' } = {}) {
  await update('payables', p.id, { paid_on: date, method })
  emitChange('commissions')
}

// roda a geração de recorrências uma vez por dia por navegador
export async function dailyHousekeeping() {
  const key = 'zinkra-erp-housekeeping'
  if (localStorage.getItem(key) === today()) return
  try {
    const n = await rpc('erp_generate_recurring', {}, { quiet: true })
    localStorage.setItem(key, today())
    if (n > 0) emitChange('receivables', 'payables')
  } catch (e) {
    console.warn('housekeeping', e)
  }
}

export { toCents }
