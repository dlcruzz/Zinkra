import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth, ROLES, MODULES } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useData, fetchRows, insert, update, remove, upsert, saveSetting, notify, emitChange, useSettings } from '../lib/data'
import { resetPipelineCache } from '../lib/automations'
import { brl0, dm, hm, today } from '../lib/format'
import { PageHead, Card, Loading, ErrorBox, Field, Select, MoneyInput, AsyncButton, Modal, useConfirm } from '../components/ui'
import { FRONTS, LEVELS } from '../lib/constants'
import { Icon } from '../lib/icons'

const SECTIONS = [['users', 'Usuários'], ['roles', 'Papéis e permissões'], ['pipes', 'Pipelines e etapas'], ['services', 'Catálogo de serviços'], ['templates', 'Templates de projeto'],
  ['lists', 'Listas e regras'], ['company', 'Empresa'], ['audit', 'Log de auditoria']]

export default function Config() {
  useMeta('Sistema', 'Configurações')
  const [sp, setSp] = useSearchParams()
  const s = sp.get('s') || 'users'
  return (
    <div className="page">
      <PageHead title="Configurações" sub="Só o Diretor geral vê esta área" />
      <div className="cols">
        <nav aria-label="Seções" className="card" style={{ flex: '0 1 220px', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(([k, l]) => <button key={k} type="button" className={`nav-item ${k === s ? 'on' : ''}`} style={{ border: 0, background: k === s ? undefined : 'transparent', cursor: 'pointer', textAlign: 'left' }} onClick={() => setSp({ s: k })}>{l}</button>)}
        </nav>
        <div style={{ flex: '1 1 560px', minWidth: 0 }}>
          {s === 'users' ? <Users /> : null}
          {s === 'roles' ? <Roles /> : null}
          {s === 'pipes' ? <Pipes /> : null}
          {s === 'services' ? <Services /> : null}
          {s === 'templates' ? <Templates /> : null}
          {s === 'lists' ? <Lists /> : null}
          {s === 'company' ? <Company /> : null}
          {s === 'audit' ? <Audit /> : null}
        </div>
      </div>
    </div>
  )
}

function Users() {
  const auth = useAuth()
  const [inviting, setInviting] = useState(false)
  const { data, loading, error, reload } = useData(() => fetchRows('profiles', { order: 'created_at', ascending: true }), ['profiles'])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <Loading />
  return (
    <Card title={<h2 style={{ fontSize: 15 }}>Usuários</h2>} action={<button type="button" className="btn p" onClick={() => setInviting(true)}>Convidar usuário</button>}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Situação</th><th /></tr></thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id}>
              <td style={{ fontWeight: 500 }}>{p.name}{p.id === auth.uid ? <span className="lbl"> (você)</span> : null}</td>
              <td className="lbl">{p.email}</td>
              <td>{p.id === auth.uid ? ROLES[p.role] : <Select value={p.role} onChange={(v) => update('profiles', p.id, { role: v }).then(() => { notify('Papel atualizado. Vale no próximo acesso da pessoa.', 'ok'); auth.reloadProfile() })} options={ROLES} style={{ width: 190 }} aria-label={`Papel de ${p.name}`} />}</td>
              <td>{p.role === 'pendente' ? <span className="b y dot">Aguardando liberação</span> : p.active ? <span className="b g dot">Ativo</span> : <span className="b dot">Desativado</span>}</td>
              <td>{p.id !== auth.uid ? <button type="button" className="btn s" onClick={() => update('profiles', p.id, { active: !p.active }).then(() => auth.reloadProfile())}>{p.active ? 'Desativar' : 'Reativar'}</button> : null}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="lbl" style={{ padding: '12px 16px', lineHeight: 1.6 }}>
        Cadastro público fica desligado no Supabase. Quem é convidado recebe um e-mail, cria a senha e ativa o app autenticador (2FA) em Minha conta.
        Se o convite automático não estiver configurado, crie o usuário no painel do Supabase (Authentication → Users → Add user); ele aparece aqui como "Aguardando liberação" e você escolhe o papel.
      </p>
      {inviting ? <Invite onClose={() => setInviting(false)} /> : null}
    </Card>
  )
}

function Invite({ onClose }) {
  const [f, setF] = useState({ name: '', email: '', role: 'prospector' })
  return (
    <Modal size="sm" title="Convidar usuário" onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/erp-invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify(f) })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) return notify(out.error || 'Não foi possível convidar.', 'err')
      emitChange('profiles'); notify(`Convite enviado para ${f.email}.`, 'ok'); onClose()
    }}>Enviar convite</AsyncButton></>}>
      <Field label="Nome"><input className="in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="E-mail"><input className="in" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Papel"><Select value={f.role} onChange={(v) => setF({ ...f, role: v })} options={Object.entries(ROLES).filter(([k]) => k !== 'pendente')} /></Field>
    </Modal>
  )
}

function Roles() {
  const auth = useAuth()
  const { data, loading, error, reload } = useData(() => fetchRows('role_permissions', { order: null }), ['role_permissions'])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <Loading />
  const roles = Object.keys(ROLES).filter((r) => r !== 'pendente')
  const lv = (role, mod) => data.find((x) => x.role === role && x.module === mod)?.level || 'none'
  const cycle = { total: 'own', own: 'read', read: 'none', none: 'total' }
  const cls = { total: 'b g', own: 'b bl', read: 'b', none: 'lbl' }
  return (
    <Card title={<h2 style={{ fontSize: 15 }}>Papéis e permissões</h2>} action={<div className="row" style={{ gap: 8 }}>{Object.entries(LEVELS).map(([k, v]) => <span key={k} className={cls[k]}>{v}</span>)}</div>}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Módulo</th>{roles.map((r) => <th key={r}>{ROLES[r]}</th>)}</tr></thead>
        <tbody>
          {MODULES.map(([m, label]) => (
            <tr key={m}>
              <td>{label}</td>
              {roles.map((r) => {
                const v = lv(r, m)
                const locked = r === 'diretor' && m === 'config'
                return (
                  <td key={r}>
                    <button type="button" disabled={locked} className={cls[v]} style={{ cursor: locked ? 'default' : 'pointer', background: v === 'none' ? 'transparent' : undefined, border: v === 'none' ? 0 : undefined, font: 'inherit', fontSize: 12 }}
                      title={locked ? 'O Diretor sempre tem acesso total às configurações' : 'Clique para trocar'}
                      onClick={() => upsert('role_permissions', { role: r, module: m, level: cycle[v] }, { onConflict: 'role,module' }).then(() => auth.reloadProfile())}>
                      {LEVELS[v]}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="lbl" style={{ padding: '12px 16px', lineHeight: 1.6 }}>Total: vê e edita tudo. Próprio: só os registros dele (no CRM, também os leads sem dono). Leitura: vê sem editar. Nenhum: o menu nem aparece. A regra vale no banco, não só na tela.</p>
    </Card>
  )
}

function Pipes() {
  const confirm = useConfirm()
  const [pid, setPid] = useState('')
  const { data, loading, error, reload } = useData(async () => ({
    pipelines: await fetchRows('pipelines', { order: 'sort', ascending: true }),
    stages: await fetchRows('pipeline_stages', { order: 'sort', ascending: true }),
  }), ['pipelines', 'pipeline_stages'])
  const [rows, setRows] = useState([])
  useEffect(() => { if (data && !pid) setPid(data.pipelines[0]?.id || '') }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (data) setRows(data.stages.filter((s) => s.pipeline_id === pid)) }, [data, pid])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <Loading />
  const set = (i, k, v) => setRows((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i, d) => setRows((l) => { const n = [...l]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); return n })
  const save = async () => {
    for (const [i, s] of rows.entries()) {
      const body = { pipeline_id: pid, name: s.name, sort: i + 1, probability: Number(s.probability) || 0, kind: s.kind, color: s.color, follow_up_days: s.follow_up_days === '' || s.follow_up_days === null ? null : Number(s.follow_up_days) }
      if (s.id) await update('pipeline_stages', s.id, body, { quiet: true }); else await insert('pipeline_stages', body, { quiet: true })
    }
    resetPipelineCache(); emitChange('pipeline_stages'); notify('Etapas salvas.', 'ok')
  }
  return (
    <Card pad title={<h2 style={{ fontSize: 15 }}>Pipelines e etapas</h2>} action={<Select value={pid} onChange={setPid} options={data.pipelines.map((p) => [p.id, p.name])} style={{ width: 220 }} aria-label="Pipeline" />}>
      <div className="lbl" style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 110px 110px 70px 40px', gap: 10, padding: '4px 0' }}>
        <span>Ordem</span><span>Nome da etapa</span><span>Prob. %</span><span>Tipo</span><span>Follow-up (dias)</span><span>Cor</span><span />
      </div>
      {rows.map((s, i) => (
        <div key={s.id || i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 110px 110px 70px 40px', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}>
          <span className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
            <button type="button" className="btn s ic g" disabled={!i} aria-label="Subir" onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="btn s ic g" disabled={i === rows.length - 1} aria-label="Descer" onClick={() => move(i, 1)}>↓</button>
          </span>
          <input className="in" value={s.name} onChange={(e) => set(i, 'name', e.target.value)} aria-label="Nome" />
          <input className="in num" value={s.probability} onChange={(e) => set(i, 'probability', e.target.value.replace(/\D/g, ''))} aria-label="Probabilidade" />
          <Select value={s.kind} onChange={(v) => set(i, 'kind', v)} options={{ open: 'aberta', handoff: 'passa ao diretor', won: 'ganho', lost: 'perdido' }} aria-label="Tipo" />
          <input className="in num" value={s.follow_up_days ?? ''} onChange={(e) => set(i, 'follow_up_days', e.target.value.replace(/\D/g, ''))} placeholder="—" aria-label="Dias até o follow-up" />
          <input type="color" value={s.color} onChange={(e) => set(i, 'color', e.target.value)} aria-label="Cor" style={{ width: 44, height: 30, background: 'none', border: 0 }} />
          <button type="button" className="btn s ic g" aria-label="Remover etapa" onClick={async () => {
            if (s.id && !(await confirm('Remover esta etapa? Leads nela precisam ser movidos antes.', { ok: 'Remover', danger: true }))) return
            if (s.id) await remove('pipeline_stages', s.id).catch(() => null)
            setRows((l) => l.filter((_, j) => j !== i))
          }}><Icon name="x" size={12} /></button>
        </div>
      ))}
      <p className="lbl" style={{ padding: '10px 0', lineHeight: 1.6 }}>"Follow-up (dias)": quando um lead entra nesta etapa, o próximo passo é agendado automaticamente para daqui a N dias.</p>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn" onClick={() => setRows((l) => [...l, { name: 'Nova etapa', probability: 10, kind: 'open', color: '#8A938E', follow_up_days: null }])}>Adicionar etapa</button>
        <AsyncButton className="btn p" onClick={save}>Salvar etapas</AsyncButton>
      </div>
    </Card>
  )
}

function Services() {
  const [edit, setEdit] = useState(null)
  const { data, loading, error, reload } = useData(async () => ({
    services: await fetchRows('services', { order: 'sort', ascending: true }),
    templates: await fetchRows('project_templates', { order: 'name', ascending: true }),
  }), ['services', 'project_templates'])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <Loading />
  return (
    <Card title={<h2 style={{ fontSize: 15 }}>Catálogo de serviços</h2>} action={<button type="button" className="btn p" onClick={() => setEdit({ name: '', front: 'sites', min_cents: 0, max_cents: 0, billing: 'once', includes: '', template_id: null, active: true, sort: data.services.length + 1 })}>Novo serviço</button>}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Serviço</th><th>Frente</th><th className="r">Mínimo</th><th className="r">Máximo</th><th>Cobrança</th><th>Inclui</th><th>Template de projeto</th><th /></tr></thead>
        <tbody>
          {data.services.map((s) => (
            <tr key={s.id} style={!s.active ? { opacity: 0.5 } : undefined}>
              <td style={{ fontWeight: 500 }}>{s.name}</td><td>{FRONTS[s.front]}</td>
              <td className="num r">{s.min_cents ? brl0(s.min_cents) : '—'}</td><td className="num r">{s.max_cents ? brl0(s.max_cents) : '—'}</td>
              <td>{s.billing === 'monthly' ? 'Mensal' : 'Única'}</td><td className="lbl">{s.includes}</td>
              <td className="lbl">{data.templates.find((t) => t.id === s.template_id)?.name || '—'}</td>
              <td><button type="button" className="btn s ic g" aria-label="Editar" onClick={() => setEdit(s)}><Icon name="edit" size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {edit ? (
        <Modal title={edit.id ? 'Editar serviço' : 'Novo serviço'} onClose={() => setEdit(null)} footer={<><button type="button" className="btn" onClick={() => setEdit(null)}>Cancelar</button><AsyncButton className="btn p" onClick={async () => {
          const { id, ...body } = edit
          if (id) await update('services', id, body); else await insert('services', body)
          notify('Serviço salvo.', 'ok'); setEdit(null)
        }}>Salvar</AsyncButton></>}>
          <div className="fields">
            <Field label="Nome"><input className="in" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Frente"><Select value={edit.front} onChange={(v) => setEdit({ ...edit, front: v })} options={FRONTS} /></Field>
            <Field label="Preço mínimo"><MoneyInput value={edit.min_cents} onChange={(v) => setEdit({ ...edit, min_cents: v })} /></Field>
            <Field label="Preço máximo"><MoneyInput value={edit.max_cents} onChange={(v) => setEdit({ ...edit, max_cents: v })} /></Field>
            <Field label="Cobrança"><Select value={edit.billing} onChange={(v) => setEdit({ ...edit, billing: v })} options={{ once: 'Única', monthly: 'Mensal' }} /></Field>
            <Field label="Template de projeto"><Select value={edit.template_id} onChange={(v) => setEdit({ ...edit, template_id: v })} placeholder="nenhum" options={data.templates.map((t) => [t.id, t.name])} /></Field>
          </div>
          <Field label="O que inclui"><input className="in" value={edit.includes || ''} onChange={(e) => setEdit({ ...edit, includes: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Ativo no catálogo</label>
        </Modal>
      ) : null}
    </Card>
  )
}

function Templates() {
  const [tid, setTid] = useState('')
  const [nt, setNt] = useState({ kind: 'task', title: '', offset_days: 0, est_minutes: '' })
  const [newName, setNewName] = useState('')
  const { data, loading, error, reload } = useData(async () => ({
    templates: await fetchRows('project_templates', { order: 'name', ascending: true }),
    items: await fetchRows('template_items', { order: 'sort', ascending: true }),
  }), ['project_templates', 'template_items'])
  useEffect(() => { if (data && !tid) setTid(data.templates[0]?.id || '') }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <Loading />
  const t = data.templates.find((x) => x.id === tid)
  const items = data.items.filter((i) => i.template_id === tid)
  const K = { task: 'Tarefa', checklist: 'Checklist', milestone: 'Marco' }
  return (
    <Card pad title={<h2 style={{ fontSize: 15 }}>Templates de projeto</h2>} action={<div className="row">
      <Select value={tid} onChange={setTid} options={data.templates.map((x) => [x.id, x.name])} style={{ width: 220 }} aria-label="Template" />
      <input className="in" style={{ width: 170 }} placeholder="Nome do novo template" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Nome do novo template" />
      <AsyncButton className="btn" disabled={!newName.trim()} onClick={async () => { const r = await insert('project_templates', { name: newName.trim(), front: 'sites' }); setTid(r.id); setNewName('') }}>Criar</AsyncButton>
    </div>}>
      {t ? (
        <div className="stack">
          <div className="fields">
            <Field label="Nome"><input className="in" defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && update('project_templates', t.id, { name: e.target.value })} /></Field>
            <Field label="Frente"><Select value={t.front} onChange={(v) => update('project_templates', t.id, { front: v })} options={FRONTS} /></Field>
            <Field label="Horas estimadas"><input className="in num" defaultValue={t.est_hours || ''} onBlur={(e) => update('project_templates', t.id, { est_hours: e.target.value || null })} /></Field>
            <Field label="Duração (dias)"><input className="in num" defaultValue={t.duration_days || ''} onBlur={(e) => update('project_templates', t.id, { duration_days: e.target.value || null })} /></Field>
          </div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Tipo</th><th>Item</th><th className="r">Dia (a partir do início)</th><th className="r">Estimativa (min)</th><th /></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}><td>{K[i.kind]}</td><td>{i.title}</td><td className="num r">{i.offset_days}</td><td className="num r">{i.est_minutes || '—'}</td>
                  <td><button type="button" className="btn s ic g" aria-label="Remover" onClick={() => remove('template_items', i.id)}><Icon name="x" size={12} /></button></td></tr>
              ))}
            </tbody>
          </table></div>
          <form className="row" onSubmit={async (e) => { e.preventDefault(); if (!nt.title) return; await insert('template_items', { ...nt, template_id: tid, offset_days: Number(nt.offset_days) || 0, est_minutes: nt.est_minutes ? Number(nt.est_minutes) : null, sort: items.length }); setNt({ ...nt, title: '' }) }}>
            <Select value={nt.kind} onChange={(v) => setNt({ ...nt, kind: v })} options={K} style={{ width: 130 }} aria-label="Tipo" />
            <input className="in" style={{ flex: '1 1 220px' }} placeholder="Título do item" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} />
            <input className="in num" style={{ width: 90 }} placeholder="dia" value={nt.offset_days} onChange={(e) => setNt({ ...nt, offset_days: e.target.value.replace(/\D/g, '') })} aria-label="Dia" />
            <input className="in num" style={{ width: 90 }} placeholder="min" value={nt.est_minutes} onChange={(e) => setNt({ ...nt, est_minutes: e.target.value.replace(/\D/g, '') })} aria-label="Minutos" />
            <button type="submit" className="btn">Adicionar</button>
          </form>
          <p className="lbl">Ao criar um projeto com este template, as tarefas ganham prazo = início + dia, e checklist e marcos vêm junto.</p>
        </div>
      ) : <p className="lbl">Nenhum template.</p>}
    </Card>
  )
}

function Lists() {
  const settings = useSettings()
  const [f, setF] = useState(null)
  useEffect(() => {
    if (settings.lead_rules && !f) setF({
      niches: (settings.niches || []).join('\n'), neighborhoods: (settings.neighborhoods || []).join('\n'), lost: (settings.lost_reasons || []).join('\n'),
      stale: settings.lead_rules?.stale_days ?? 7, fu: settings.lead_rules?.follow_up_days ?? 3,
    })
  }, [settings, f])
  if (!f) return <Loading />
  const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)
  return (
    <Card pad title={<h2 style={{ fontSize: 15 }}>Listas e regras</h2>}>
      <div className="stack">
        <div className="fields">
          <Field label="Dias sem movimento para considerar lead parado"><input className="in num" value={f.stale} onChange={(e) => setF({ ...f, stale: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Dias até o follow-up depois de um contato"><input className="in num" value={f.fu} onChange={(e) => setF({ ...f, fu: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>
        <div className="grid-3">
          <Field label="Nichos (um por linha)"><textarea className="ta" rows={10} value={f.niches} onChange={(e) => setF({ ...f, niches: e.target.value })} /></Field>
          <Field label="Bairros e cidades (um por linha)"><textarea className="ta" rows={10} value={f.neighborhoods} onChange={(e) => setF({ ...f, neighborhoods: e.target.value })} /></Field>
          <Field label="Motivos de perda (um por linha)"><textarea className="ta" rows={10} value={f.lost} onChange={(e) => setF({ ...f, lost: e.target.value })} /></Field>
        </div>
        <AsyncButton className="btn p" style={{ width: 'max-content' }} onClick={async () => {
          const niches = lines(f.niches), hoods = lines(f.neighborhoods)
          await saveSetting('niches', niches); await saveSetting('neighborhoods', hoods); await saveSetting('lost_reasons', lines(f.lost))
          await saveSetting('lead_rules', { ...(settings.lead_rules || {}), stale_days: Number(f.stale) || 7, follow_up_days: Number(f.fu) || 3 })
          // cria os termos de busca novos (nicho × bairro)
          // bairros sem cidade são de São Paulo - SP; para outras cidades use Comercial → Captação
          const rows = niches.flatMap((n) => hoods.map((b) => ({ niche: n, neighborhood: b, city: 'São Paulo', uf: 'SP', owner_id: null })))
          for (let i = 0; i < rows.length; i += 300) {
            await upsert('search_terms', rows.slice(i, i + 300), { onConflict: 'niche,neighborhood,city,uf', quiet: true })
              .catch(() => upsert('search_terms', rows.slice(i, i + 300).map(({ city, uf, ...r }) => r), { onConflict: 'niche,neighborhood', quiet: true }).catch(() => {}))
          }
          notify('Listas salvas. A matriz de termos de busca foi atualizada.', 'ok')
        }}>Salvar</AsyncButton>
      </div>
    </Card>
  )
}

function Company() {
  const settings = useSettings()
  const [f, setF] = useState(null)
  useEffect(() => { if (settings.company && !f) setF({ ...settings.company }) }, [settings, f])
  if (!f) return <Loading />
  return (
    <Card pad title={<h2 style={{ fontSize: 15 }}>Empresa</h2>}>
      <div className="stack">
        <div className="fields">
          {[['name', 'Nome'], ['cnpj', 'CNPJ'], ['pix', 'Chave Pix (aparece nas cobranças)'], ['whatsapp', 'WhatsApp']].map(([k, l]) => (
            <Field key={k} label={l}><input className="in" value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
          ))}
        </div>
        <AsyncButton className="btn p" style={{ width: 'max-content' }} onClick={() => saveSetting('company', f).then(() => notify('Salvo.', 'ok'))}>Salvar</AsyncButton>
      </div>
    </Card>
  )
}

function Audit() {
  const auth = useAuth()
  const [table, setTable] = useState('')
  const { data, loading, error, reload } = useData(() => fetchRows('audit_log', { order: 'at', where: (q) => (table ? q.eq('table_name', table) : q), limit: 300 }), ['audit_log'], [table])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const T = { leads: 'Lead', clients: 'Cliente', proposals: 'Proposta', contracts: 'Contrato', projects: 'Projeto', tasks: 'Tarefa', payables: 'Conta a pagar', receivables: 'Conta a receber', commissions: 'Comissão', goals: 'Meta', profiles: 'Usuário', meetings: 'Reunião', role_permissions: 'Permissão' }
  const A = { insert: 'Criou', update: 'Alterou', delete: 'Excluiu' }
  const describe = (r) => {
    if (r.action !== 'update' || !r.changes) return ''
    const keys = Object.keys(r.changes).filter((k) => !['stage_changed_at', 'last_contact_at'].includes(k))
    if (r.changes.archived_at) return r.changes.archived_at[1] ? 'arquivou' : 'restaurou'
    return keys.slice(0, 4).join(', ')
  }
  return (
    <Card title={<h2 style={{ fontSize: 15 }}>Log de auditoria</h2>} action={<Select value={table} onChange={(v) => setTable(v || '')} placeholder="Tudo" options={T} style={{ width: 180 }} aria-label="Filtrar" />}>
      {loading ? <Loading /> : (
        <div className="tbl-wrap" style={{ maxHeight: 620 }}><table className="tbl">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Registro</th><th>Campos</th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}><td className="num lbl">{dm(r.at)} {hm(r.at)}</td><td>{auth.memberName(r.actor)}</td><td>{A[r.action]}</td>
                <td>{T[r.table_name] || r.table_name} · {r.summary || '—'}</td><td className="lbl ellipsis" style={{ maxWidth: 260 }}>{describe(r)}</td></tr>
            ))}
            {!data.length ? <tr><td colSpan={5} className="lbl">Nada registrado.</td></tr> : null}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}

export { today, supabase }
