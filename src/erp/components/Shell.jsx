import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Icon } from '../lib/icons'
import { useAuth, ROLES } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useData, insert, notify } from '../lib/data'
import { today, addDays, minutesLabel, isoDate } from '../lib/format'
import { stopTimer, defaultLeadStage } from '../lib/automations'
import { prefetchWorld } from '../lib/world'
import { Modal, Field, Select, MoneyInput, AsyncButton } from './ui'
import { FRONTS, PRIORITIES, RECURRENCE, MEETING_TYPES, IDEA_TYPES } from '../lib/constants'

const ErpCtx = createContext(null)
export const useErp = () => useContext(ErpCtx)

// cada página informa seu título para a barra superior
export function useMeta(crumb, title) {
  const ctx = useContext(ErpCtx)
  useEffect(() => { ctx?.setMeta({ crumb, title }) }, [crumb, title]) // eslint-disable-line react-hooks/exhaustive-deps
}

const NAV = [
  ['Visão', [
    ['dashboard', 'Dashboard', '/erp', 'dash', 'dashboard'],
    ['hoje', 'Hoje', '/erp/hoje', 'hoje', null, 'hoje'],
    ['inteligencia', 'Inteligência', '/erp/inteligencia', 'brain', null],
    ['painel', 'Painel prospector', '/erp/painel', 'user', 'prospeccao'],
  ]],
  ['Comercial', [
    ['leads', 'Leads', '/erp/leads', 'leads', 'crm', 'leads'],
    ['pipelines', 'Pipelines', '/erp/pipelines', 'pipeline', 'crm'],
    ['captacao', 'Captação', '/erp/captacao', 'search', 'prospeccao'],
    ['prospeccao', 'Prospecção', '/erp/prospeccao', 'send', 'prospeccao', 'follow'],
    ['metas', 'Metas', '/erp/metas', 'target', 'metas'],
    ['propostas', 'Propostas', '/erp/propostas', 'doc', 'propostas', 'props'],
  ]],
  ['Operação', [
    ['clientes', 'Clientes', '/erp/clientes', 'building', 'clientes'],
    ['projetos', 'Projetos', '/erp/projetos', 'folder', 'projetos', 'projs'],
    ['tarefas', 'Tarefas', '/erp/tarefas', 'check', 'tarefas'],
    ['reunioes', 'Reuniões', '/erp/reunioes', 'cal', 'reunioes'],
  ]],
  ['Financeiro', [
    ['pagar', 'Contas a pagar', '/erp/financeiro/pagar', 'down', 'financeiro', 'pay'],
    ['receber', 'Contas a receber', '/erp/financeiro/receber', 'up', 'financeiro', 'recv'],
    ['fluxo', 'Fluxo de caixa', '/erp/financeiro/fluxo', 'trend', 'financeiro'],
  ]],
  ['Empresa', [
    ['ideias', 'Ideias', '/erp/ideias', 'bulb', 'ideias'],
    ['playbooks', 'Playbooks', '/erp/playbooks', 'book', 'playbooks'],
    ['parceiros', 'Parceiros', '/erp/parceiros', 'users', 'parceiros'],
    ['relatorios', 'Relatórios', '/erp/relatorios', 'chart', 'relatorios'],
  ]],
]

async function loadCounts(uid) {
  const t = today()
  const c = async (q) => { const { count } = await q; return count || 0 }
  const [hoje, follow, props, pay, recv, projs] = await Promise.all([
    c(supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('owner_id', uid).neq('status', 'done').is('archived_at', null).lte('due_on', t)),
    c(supabase.from('leads').select('id', { count: 'exact', head: true }).is('archived_at', null).lte('next_step_at', t)),
    c(supabase.from('proposals').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['enviada', 'vista'])),
    c(supabase.from('payables').select('id', { count: 'exact', head: true }).is('archived_at', null).is('paid_on', null).lte('due_on', addDays(t, 7))),
    c(supabase.from('receivables').select('id', { count: 'exact', head: true }).is('archived_at', null).is('received_on', null).lt('due_on', t)),
    c(supabase.from('projects').select('id', { count: 'exact', head: true }).is('archived_at', null).in('stage', ['briefing', 'design', 'desenvolvimento', 'revisao', 'ajustes'])),
  ])
  return { hoje, follow, props, pay, recv, projs }
}

function Sidebar({ counts, open, onClose }) {
  const auth = useAuth()
  const loc = useLocation()
  const hot = { hoje: counts.hoje > 0, follow: counts.follow > 0, recv: counts.recv > 0, pay: counts.pay > 0 }
  return (
    <>
    {open ? <div className="side-scrim" onClick={onClose} aria-hidden="true" /> : null}
    <nav className={`side ${open ? 'open' : ''}`} aria-label="Navegação do ERP">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Link to="/erp" className="brand">
          <b><i>Z</i>inkra<i>.</i></b>
          <span className="tag-erp">ERP</span>
        </Link>
        <button type="button" className="btn ic s g only-m" aria-label="Fechar menu" onClick={onClose}><Icon name="x" /></button>
      </div>
      {NAV.map(([group, items]) => {
        const visible = items.filter(([, , , , mod]) => !mod || auth.canSee(mod))
        if (!visible.length) return null
        return (
          <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            {visible.map(([id, label, to, icon, , countKey]) => {
              const active = to === '/erp' ? loc.pathname === '/erp' || loc.pathname === '/erp/' : loc.pathname.startsWith(to)
              const n = countKey ? counts[countKey] : 0
              return (
                <NavLink key={id} to={to} end={to === '/erp'} className={`nav-item ${active ? 'on' : ''}`}>
                  <Icon name={icon} />
                  <span>{label}</span>
                  {n ? <span className={`cnt ${hot[countKey] ? 'hot' : ''}`}>{n}</span> : null}
                </NavLink>
              )
            })}
          </div>
        )
      })}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #1A1E1C', paddingTop: 12 }}>
        {auth.canSee('config') ? (
          <NavLink to="/erp/config" className={`nav-item ${loc.pathname.startsWith('/erp/config') ? 'on' : ''}`}>
            <Icon name="sliders" /><span>Configurações</span>
          </NavLink>
        ) : (
          <NavLink to="/erp/conta" className={`nav-item ${loc.pathname.startsWith('/erp/conta') ? 'on' : ''}`}>
            <Icon name="shield" /><span>Minha conta</span>
          </NavLink>
        )}
        <div className="me">
          <span className="avatar">{(auth.profile?.name || '?').slice(0, 2).toUpperCase()}</span>
          <Link to="/erp/conta" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, color: 'var(--tx)' }}>
            <span className="ellipsis" style={{ fontSize: 13, fontWeight: 500 }}>{auth.profile?.name}</span>
            <span className="lbl">{ROLES[auth.role]}</span>
          </Link>
          <button type="button" className="btn ic s g" style={{ marginLeft: 'auto' }} aria-label="Sair" onClick={() => auth.signOut()}>
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </nav>
    </>
  )
}

// barra fixa de navegação no rodapé (só no celular)
const BOTTOM = ['hoje', 'leads', 'prospeccao', 'tarefas']
function BottomNav({ counts, onMenu, menuOpen }) {
  const auth = useAuth()
  const loc = useLocation()
  const all = NAV.flatMap(([, items]) => items)
  const items = BOTTOM.map((id) => all.find((x) => x[0] === id)).filter((x) => x && (!x[4] || auth.canSee(x[4])))
  return (
    <nav className="bottom-nav" aria-label="Navegação rápida">
      {items.map(([id, label, to, icon, , countKey]) => {
        const on = !menuOpen && loc.pathname.startsWith(to)
        const n = countKey ? counts[countKey] : 0
        return (
          <NavLink key={id} to={to} className={`bn-item ${on ? 'on' : ''}`}>
            <span className="bn-ic"><Icon name={icon} size={19} />{n ? <span className="bn-cnt">{n > 99 ? '99+' : n}</span> : null}</span>
            <span>{label}</span>
          </NavLink>
        )
      })}
      <button type="button" className={`bn-item ${menuOpen ? 'on' : ''}`} onClick={onMenu} aria-expanded={menuOpen}>
        <span className="bn-ic"><Icon name="menu" size={19} /></span>
        <span>Menu</span>
      </button>
    </nav>
  )
}

function TimerPill({ entry, tasks }) {
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i) }, [])
  if (!entry) return null
  const mins = (Date.now() - new Date(entry.started_at).getTime()) / 60000
  const task = tasks?.find((t) => t.id === entry.task_id)
  return (
    <button type="button" className="timer-pill" onClick={() => stopTimer(entry)} title="Parar cronômetro">
      <span className="rec" />
      <span className="ellipsis" style={{ maxWidth: 180 }}>{task?.title || entry.note || 'Cronômetro'}</span>
      <span className="num">{minutesLabel(mins)}</span>
      <Icon name="stop" size={12} />
    </button>
  )
}

function Topbar({ crumb, title, onSearch, onNew, timer, insightsCount, onMenu }) {
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()
  const auth = useAuth()
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const items = [
    ['task', 'Tarefa', 'check', 'tarefas'], ['lead', 'Lead', 'leads', 'crm'], ['meeting', 'Reunião', 'cal', 'reunioes'],
    ['expense', 'Despesa', 'down', 'financeiro'], ['idea', 'Ideia', 'bulb', 'ideias'],
  ].filter(([, , , m]) => auth.canEdit(m) || (m === 'ideias' && auth.canSee(m)))
  return (
    <header className="top">
      <button type="button" className="icon-btn only-m" aria-label="Abrir menu" onClick={onMenu}><Icon name="menu" /></button>
      <div className="crumb">
        {crumb ? <><span>{crumb}</span><span className="sep">/</span></> : null}
        <b>{title}</b>
      </div>
      <TimerPill entry={timer.entry} tasks={timer.tasks} />
      <button type="button" className="search-trigger" onClick={onSearch} aria-label="Buscar">
        <Icon name="search" size={15} />
        <span className="hide-m">Buscar ou executar…</span>
        <kbd className="hide-m">Ctrl K</kbd>
      </button>
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button" className="btn p" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
          <Icon name="plus" size={14} stroke={2.2} /><span className="hide-m">Novo</span>
        </button>
        {menu ? (
          <div role="menu" className="card" style={{ position: 'absolute', right: 0, top: 40, width: 200, padding: 6, zIndex: 30, background: '#121513' }}>
            {items.map(([k, label, icon]) => (
              <button key={k} type="button" role="menuitem" className="cmdk-item" onClick={() => { setMenu(false); onNew(k) }}>
                <Icon name={icon} /> {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="icon-btn" aria-label={`Sugestões do sistema: ${insightsCount}`} onClick={() => nav('/erp/inteligencia')}>
        <Icon name="bell" />
        {insightsCount ? <span className="dot" /> : null}
      </button>
    </header>
  )
}

// ---------------- Paleta de comandos (Ctrl+K) ----------------
function CommandPalette({ onClose, onNew }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const auth = useAuth()

  const pages = useMemo(() => NAV.flatMap(([, items]) => items)
    .filter(([, , , , m]) => !m || auth.canSee(m))
    .map(([id, label, to, icon]) => ({ kind: 'Ir para', label, icon, run: () => nav(to) }))
    .concat(auth.canSee('config') ? [{ kind: 'Ir para', label: 'Configurações', icon: 'sliders', run: () => nav('/erp/config') }] : []), [auth, nav])
  const actions = useMemo(() => [
    ['task', 'Nova tarefa', 'check'], ['lead', 'Novo lead', 'leads'], ['meeting', 'Nova reunião', 'cal'],
    ['expense', 'Nova despesa', 'down'], ['idea', 'Nova ideia', 'bulb'],
  ].map(([k, label, icon]) => ({ kind: 'Criar', label, icon, run: () => onNew(k) })), [onNew])

  useEffect(() => {
    let alive = true
    const term = q.trim()
    if (term.length < 2) { setResults([]); return }
    const like = `%${term.replace(/[%_]/g, '')}%`
    const digits = term.replace(/\D/g, '')
    const run = async () => {
      const [l, c, p, t, pr] = await Promise.all([
        supabase.from('leads').select('id, company, niche, neighborhood').is('archived_at', null)
          .or(`company.ilike.${like},instagram.ilike.${like}${digits.length >= 4 ? `,phone_digits.like.%${digits}%` : ''}`).limit(6),
        supabase.from('clients').select('id, name').is('archived_at', null).ilike('name', like).limit(4),
        supabase.from('projects').select('id, name').is('archived_at', null).ilike('name', like).limit(4),
        supabase.from('tasks').select('id, title, project_id').is('archived_at', null).neq('status', 'done').ilike('title', like).limit(5),
        supabase.from('proposals').select('id, number, title').is('archived_at', null).ilike('title', like).limit(3),
      ])
      if (!alive) return
      setResults([
        ...(l.data || []).map((x) => ({ kind: 'Leads', label: x.company, sub: [x.niche, x.neighborhood].filter(Boolean).join(' · '), icon: 'leads', run: () => nav(`/erp/leads/${x.id}`) })),
        ...(c.data || []).map((x) => ({ kind: 'Clientes', label: x.name, icon: 'building', run: () => nav(`/erp/clientes?id=${x.id}`) })),
        ...(p.data || []).map((x) => ({ kind: 'Projetos', label: x.name, icon: 'folder', run: () => nav(`/erp/projetos/${x.id}`) })),
        ...(t.data || []).map((x) => ({ kind: 'Tarefas', label: x.title, icon: 'check', run: () => nav(x.project_id ? `/erp/projetos/${x.project_id}` : '/erp/tarefas') })),
        ...(pr.data || []).map((x) => ({ kind: 'Propostas', label: `#${x.number} ${x.title || ''}`, icon: 'doc', run: () => nav(`/erp/propostas/${x.id}`) })),
      ])
    }
    const id = setTimeout(run, 180)
    return () => { alive = false; clearTimeout(id) }
  }, [q, nav])

  const term = q.trim().toLowerCase()
  const list = [
    ...results,
    ...actions.filter((a) => !term || a.label.toLowerCase().includes(term)),
    ...pages.filter((p) => !term || p.label.toLowerCase().includes(term)),
  ]
  useEffect(() => setIdx(0), [q, results.length])

  const go = (item) => { onClose(); item?.run() }
  let lastKind = null
  return (
    <div className="erp-overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmdk" role="dialog" aria-label="Busca e comandos">
        <input autoFocus placeholder="Buscar lead, cliente, projeto, tarefa… ou digite um comando" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
            if (e.key === 'Enter') { e.preventDefault(); go(list[idx]) }
            if (e.key === 'Escape') onClose()
          }} />
        <div className="cmdk-list">
          {list.map((item, i) => {
            const head = item.kind !== lastKind ? item.kind : null
            lastKind = item.kind
            return (
              <React.Fragment key={item.kind + item.label + i}>
                {head ? <div className="cmdk-sec">{head}</div> : null}
                <button type="button" className={`cmdk-item ${i === idx ? 'on' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => go(item)}>
                  <Icon name={item.icon} />
                  <span className="ellipsis">{item.label}</span>
                  {item.sub ? <span className="k">{item.sub}</span> : null}
                </button>
              </React.Fragment>
            )
          })}
          {!list.length ? <div className="empty">Nada encontrado.</div> : null}
        </div>
      </div>
    </div>
  )
}

// ---------------- Criação rápida ----------------
export function QuickTask({ defaults = {}, onClose, onSaved }) {
  const auth = useAuth()
  const [f, setF] = useState({ title: '', priority: 'normal', due_on: today(), front: 'interno', recurrence: 'none', owner_id: auth.uid, ...defaults })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.title.trim()) return notify('Escreva o título da tarefa.', 'err')
    const r = await insert('tasks', { ...f, title: f.title.trim() })
    notify('Tarefa criada.', 'ok')
    onSaved?.(r); onClose()
  }
  return (
    <Modal title="Nova tarefa" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={save}>Criar tarefa</AsyncButton></>}>
      <Field label="Título"><input className="in" autoFocus value={f.title} onChange={(e) => set('title')(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} /></Field>
      <div className="fields">
        <Field label="Prazo"><input type="date" className="in" value={f.due_on || ''} onChange={(e) => set('due_on')(e.target.value || null)} /></Field>
        <Field label="Prioridade"><Select value={f.priority} onChange={set('priority')} options={PRIORITIES} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={set('front')} options={FRONTS} /></Field>
        <Field label="Repetir"><Select value={f.recurrence} onChange={set('recurrence')} options={RECURRENCE} /></Field>
        {auth.isTotal('tarefas') ? (
          <Field label="Responsável"><Select value={f.owner_id} onChange={set('owner_id')} options={auth.members.map((m) => [m.id, m.name])} /></Field>
        ) : null}
      </div>
      <Field label="Descrição"><textarea className="ta" rows={3} value={f.description || ''} onChange={(e) => set('description')(e.target.value)} /></Field>
    </Modal>
  )
}

export function QuickLead({ defaults = {}, onClose, onSaved }) {
  const auth = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ company: '', niche: '', neighborhood: '', phone: '', instagram: '', origin: '', has_site: false, ...defaults })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async (open) => {
    if (!f.company.trim()) return notify('Informe o nome da empresa.', 'err')
    const phone = f.phone.replace(/\D/g, '')
    if (phone.length >= 8) {
      const { data } = await supabase.from('leads').select('id, company').like('phone_digits', `%${phone.slice(-8)}`).limit(1)
      if (data?.length) return notify(`Já existe um lead com esse telefone: ${data[0].company}.`, 'err', { label: 'Abrir', run: () => { onClose(); nav(`/erp/leads/${data[0].id}`) } })
    }
    const st = await defaultLeadStage()
    const lead = await insert('leads', { ...st, ...f, company: f.company.trim(), owner_id: auth.uid, next_step: 'Primeiro contato (M1)', next_step_code: 'M1', next_step_at: today() })
    if (f.contact_name) await insert('contacts', { lead_id: lead.id, name: f.contact_name, phone: f.phone || null }, { quiet: true })
    notify('Lead criado. Ele já entrou na fila de prospecção de hoje.', 'ok')
    onSaved?.(lead); onClose()
    if (open) nav(`/erp/leads/${lead.id}`)
  }
  return (
    <Modal title="Novo lead" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      <AsyncButton className="btn" onClick={() => save(false)}>Salvar</AsyncButton>
      <AsyncButton className="btn p" onClick={() => save(true)}>Salvar e abrir</AsyncButton>
    </>}>
      <div className="fields">
        <Field label="Empresa"><input className="in" autoFocus value={f.company} onChange={(e) => set('company')(e.target.value)} /></Field>
        <Field label="Contato"><input className="in" value={f.contact_name || ''} onChange={(e) => set('contact_name')(e.target.value)} /></Field>
        <Field label="Nicho"><input className="in" list="erp-niches" value={f.niche} onChange={(e) => set('niche')(e.target.value)} /></Field>
        <Field label="Bairro"><input className="in" value={f.neighborhood} onChange={(e) => set('neighborhood')(e.target.value)} /></Field>
        <Field label="WhatsApp"><input className="in" inputMode="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} /></Field>
        <Field label="Instagram"><input className="in" value={f.instagram} onChange={(e) => set('instagram')(e.target.value)} placeholder="@perfil" /></Field>
        <Field label="Onde achou"><input className="in" value={f.origin} onChange={(e) => set('origin')(e.target.value)} placeholder="Instagram, Google Maps…" /></Field>
        <Field label="Valor estimado"><MoneyInput value={f.estimated_value_cents} onChange={set('estimated_value_cents')} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={!!f.has_site} onChange={(e) => set('has_site')(e.target.checked)} />Já tem site</label>
    </Modal>
  )
}

export function QuickMeeting({ defaults = {}, onClose, onSaved }) {
  const d = defaults.starts_at ? new Date(defaults.starts_at) : null
  const [f, setF] = useState({
    title: '', type: 'alinhamento', date: d ? isoDate(d) : today(), time: '10:00', duration_min: 30,
    location: 'Google Meet', participants: '', ...defaults,
  })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.title.trim()) return notify('Dê um título para a reunião.', 'err')
    const { date, time, ...rest } = f
    const starts_at = new Date(`${date}T${time || '10:00'}:00`).toISOString()
    const r = await insert('meetings', { ...rest, starts_at, title: f.title.trim() })
    if (r.lead_id) {
      await insert('activities', { lead_id: r.lead_id, type: 'reuniao', note: `Reunião agendada: ${date.slice(8)}/${date.slice(5, 7)} ${time}` }, { quiet: true })
    }
    notify('Reunião agendada.', 'ok')
    onSaved?.(r); onClose()
  }
  return (
    <Modal title="Nova reunião" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={save}>Agendar</AsyncButton></>}>
      <Field label="Título"><input className="in" autoFocus value={f.title} onChange={(e) => set('title')(e.target.value)} /></Field>
      <div className="fields">
        <Field label="Tipo"><Select value={f.type} onChange={set('type')} options={MEETING_TYPES} /></Field>
        <Field label="Data"><input type="date" className="in" value={f.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="in" value={f.time} onChange={(e) => set('time')(e.target.value)} /></Field>
        <Field label="Duração (min)"><input type="number" className="in num" value={f.duration_min} onChange={(e) => set('duration_min')(Number(e.target.value) || 30)} /></Field>
        <Field label="Local"><input className="in" value={f.location} onChange={(e) => set('location')(e.target.value)} /></Field>
        <Field label="Participantes"><input className="in" value={f.participants} onChange={(e) => set('participants')(e.target.value)} /></Field>
      </div>
      <Field label="Pauta"><textarea className="ta" rows={3} value={f.agenda || ''} onChange={(e) => set('agenda')(e.target.value)} placeholder="Um tópico por linha" /></Field>
    </Modal>
  )
}

export function QuickExpense({ defaults = {}, onClose, onSaved }) {
  const { data: cats } = useData(async () => (await supabase.from('categories').select('name').order('sort')).data || [], ['categories'])
  const [f, setF] = useState({ description: '', amount_cents: 0, due_on: today(), supplier: '', category: 'Ferramentas e assinaturas', front: 'interno', recurrence: 'once', link: '', paid: false, ...defaults })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.description.trim() || !f.amount_cents) return notify('Informe descrição e valor.', 'err')
    const { paid, ...rest } = f
    const r = await insert('payables', { ...rest, paid_on: paid ? today() : null, method: paid ? 'Pix' : null })
    notify(f.recurrence !== 'once' ? 'Despesa recorrente criada. As próximas se lançam sozinhas.' : 'Despesa lançada.', 'ok')
    onSaved?.(r); onClose()
  }
  return (
    <Modal title="Nova despesa" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={save}>Salvar despesa</AsyncButton></>}>
      <Field label="Descrição"><input className="in" autoFocus value={f.description} onChange={(e) => set('description')(e.target.value)} placeholder="Ex.: Figma Professional" /></Field>
      <div className="fields">
        <Field label="Valor (R$)"><MoneyInput value={f.amount_cents} onChange={set('amount_cents')} /></Field>
        <Field label="Vencimento"><input type="date" className="in" value={f.due_on} onChange={(e) => set('due_on')(e.target.value)} /></Field>
        <Field label="Fornecedor"><input className="in" value={f.supplier} onChange={(e) => set('supplier')(e.target.value)} /></Field>
        <Field label="Categoria"><Select value={f.category} onChange={set('category')} options={(cats || []).map((c) => c.name)} /></Field>
        <Field label="Frente"><Select value={f.front} onChange={set('front')} options={FRONTS} /></Field>
        <Field label="Recorrência"><Select value={f.recurrence} onChange={set('recurrence')} options={{ once: 'Única', monthly: 'Mensal', yearly: 'Anual' }} /></Field>
      </div>
      <Field label="Link do boleto ou comprovante"><input className="in" value={f.link} onChange={(e) => set('link')(e.target.value)} placeholder="https://drive.google.com/…" /></Field>
      <label className="check"><input type="checkbox" checked={f.paid} onChange={(e) => set('paid')(e.target.checked)} />Já foi paga</label>
    </Modal>
  )
}

export function QuickIdea({ onClose, onSaved }) {
  const [f, setF] = useState({ title: '', type: 'produto', note: '' })
  const save = async () => {
    if (!f.title.trim()) return notify('Escreva a ideia.', 'err')
    const r = await insert('ideas', { ...f, title: f.title.trim() })
    notify('Ideia salva.', 'ok'); onSaved?.(r); onClose()
  }
  return (
    <Modal size="sm" title="Nova ideia" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={save}>Salvar</AsyncButton></>}>
      <Field label="Ideia"><input className="in" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') save() }} /></Field>
      <Field label="Tipo"><Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={IDEA_TYPES} /></Field>
      <Field label="Detalhe (opcional)"><textarea className="ta" rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
    </Modal>
  )
}

// ---------------- Shell ----------------
export function Shell() {
  const auth = useAuth()
  const [meta, setMeta] = useState({ crumb: '', title: '' })
  const { crumb, title } = meta
  const [palette, setPalette] = useState(false)
  const routeKey = useLocation().pathname
  // depois que o ERP abre: baixa o código das outras telas e os dados principais sem travar a tela atual
  useEffect(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200))
    const id = idle(async () => {
      prefetchWorld()
      const { PAGE_LOADERS } = await import('../ErpApp')
      for (const load of PAGE_LOADERS) { await load().catch(() => {}) }
    })
    return () => (window.cancelIdleCallback || clearTimeout)(id)
  }, [])
  const [drawer, setDrawer] = useState(false)
  useEffect(() => { setDrawer(false) }, [routeKey])
  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [drawer])
  const [quick, setQuick] = useState(null)
  const counts = useData(() => loadCounts(auth.uid), ['tasks', 'leads', 'proposals', 'payables', 'receivables', 'projects'], [auth.uid])
  const timer = useData(async () => {
    const { data } = await supabase.from('time_entries').select('*').eq('owner_id', auth.uid).is('ended_at', null).order('started_at', { ascending: false }).limit(1)
    const entry = data?.[0] || null
    let tasks = []
    if (entry?.task_id) tasks = (await supabase.from('tasks').select('id, title').eq('id', entry.task_id)).data || []
    return { entry, tasks }
  }, ['time_entries'], [auth.uid])

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const ctx = useMemo(() => ({
    openQuick: (kind, defaults) => setQuick({ kind, defaults }),
    timer: timer.data || {},
    setMeta,
  }), [timer.data])

  useEffect(() => { if (title) document.title = `${title} · ERP Zinkra` }, [title])

  return (
    <ErpCtx.Provider value={ctx}>
      <div className="shell">
        <Sidebar counts={counts.data || {}} open={drawer} onClose={() => setDrawer(false)} />
        <main className="main">
          <Topbar onMenu={() => setDrawer(true)} crumb={crumb} title={title} onSearch={() => setPalette(true)} onNew={(k) => setQuick({ kind: k })}
            timer={timer.data || {}} insightsCount={(counts.data?.recv || 0) + (counts.data?.hoje || 0)} />
          <React.Suspense fallback={<div className="page"><div className="skel" style={{ height: 28, width: 240 }} /></div>}>
            <div className="route" key={routeKey}><Outlet /></div>
          </React.Suspense>
        </main>
        <BottomNav counts={counts.data || {}} menuOpen={drawer} onMenu={() => setDrawer((d) => !d)} />
      </div>
      {palette ? <CommandPalette onClose={() => setPalette(false)} onNew={(k) => setQuick({ kind: k })} /> : null}
      {quick?.kind === 'task' ? <QuickTask defaults={quick.defaults} onClose={() => setQuick(null)} /> : null}
      {quick?.kind === 'lead' ? <QuickLead defaults={quick.defaults} onClose={() => setQuick(null)} /> : null}
      {quick?.kind === 'meeting' ? <QuickMeeting defaults={quick.defaults} onClose={() => setQuick(null)} /> : null}
      {quick?.kind === 'expense' ? <QuickExpense defaults={quick.defaults} onClose={() => setQuick(null)} /> : null}
      {quick?.kind === 'idea' ? <QuickIdea onClose={() => setQuick(null)} /> : null}
    </ErpCtx.Provider>
  )
}
