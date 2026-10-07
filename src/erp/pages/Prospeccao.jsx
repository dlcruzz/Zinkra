import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, update, insert, notify } from '../lib/data'
import { getPipelines, registerActivity, defaultLeadStage } from '../lib/automations'
import { today, waLink, igLink, igHandle, fillTemplate, relDay, MONTHS, startOfMonth, endOfMonth, businessDays, inRange, localDay } from '../lib/format'
import { PageHead, Loading, ErrorBox, Bar, Badge, Select, AsyncButton, Field, Empty } from '../components/ui'
import { Icon } from '../lib/icons'

const CONTACT = new Set(['whatsapp', 'ligacao', 'email', 'visita'])

export default function Prospeccao() {
  useMeta('Comercial', 'Prospecção')
  const auth = useAuth()
  const nav = useNavigate()
  const [skipped, setSkipped] = useState([])
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [started] = useState(() => Date.now())
  const [, tick] = useState(0)
  const [tab, setTab] = useState('fila')
  const [pull, setPull] = useState(false)

  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i) }, [])

  const { data, loading, error, reload } = useData(async () => {
    const t = today()
    const [P, leads, playbooks, acts, goals, terms] = await Promise.all([
      getPipelines(),
      fetchRows('leads', { limit: 5000 }),
      fetchRows('playbooks', { order: 'code', ascending: true }),
      fetchRows('activities', { where: (q) => q.eq('owner_id', auth.uid).gte('happened_at', t), order: 'happened_at' }),
      fetchRows('goals').catch(() => []),
      fetchRows('search_terms', { order: 'niche', ascending: true }).catch(() => []),
    ])
    return { P, leads, playbooks, acts, goals, terms }
  }, ['leads', 'activities', 'goals', 'search_terms'], [auth.uid])

  const queue = useMemo(() => {
    if (!data) return []
    const t = today()
    return data.leads.filter((l) => {
      const st = data.P.stage(l.stage_id)
      return st && st.kind === 'open' && l.next_step_at && l.next_step_at <= t && (l.owner_id === auth.uid || !l.owner_id)
    }).sort((a, b) => {
      // respondeu primeiro, depois atrasados, depois novos
      const ra = data.P.stage(a.stage_id)?.name.toLowerCase().startsWith('respond') ? 0 : 1
      const rb = data.P.stage(b.stage_id)?.name.toLowerCase().startsWith('respond') ? 0 : 1
      if (ra !== rb) return ra - rb
      return (a.next_step_at || '').localeCompare(b.next_step_at || '')
    })
  }, [data, auth])

  const active = queue.filter((l) => !skipped.includes(l.id))
  const lead = active[0]
  useEffect(() => { setCode(lead?.next_step_code || (lead?.has_site ? 'M2' : 'M1')); setCopied(false) }, [lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // atalhos de teclado 1–4
  const actRef = useRef(null)
  useEffect(() => {
    const h = (e) => {
      if (e.target.closest('input, textarea, select')) return
      if (['1', '2', '3', '4'].includes(e.key)) actRef.current?.(e.key)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>

  const { P, playbooks, acts, goals, terms } = data
  const contactsToday = acts.filter((a) => CONTACT.has(a.type)).length
  const repliesToday = acts.filter((a) => a.result === 'respondeu').length
  const g = goals.find((x) => !x.archived_at && x.user_id === auth.uid && x.metric === 'contatos')
  const t = today()
  const dailyGoal = g ? (g.period === 'day' ? Number(g.target) : g.period === 'week' ? Number(g.target) / 5 : Number(g.target) / (businessDays(startOfMonth(t), endOfMonth(t)) || 22)) : 30
  const mins = Math.floor((Date.now() - started) / 60000)
  const pb = playbooks.find((p) => p.code === code)
  const vars = lead ? { EMPRESA: lead.company, NICHO: (lead.niche || '').toLowerCase(), BAIRRO: lead.neighborhood || 'sua região', NOME: '', MES: MONTHS[new Date().getMonth()] } : {}
  const msg = pb && lead ? fillTemplate(pb.body, vars).replace(/\[NOME\]/g, '').replace(/ ,/g, ',') : ''
  const wa = lead ? waLink(lead.phone, msg) : null

  const act = async (result) => {
    if (!lead) return
    await registerActivity(lead, { type: 'whatsapp', result, script_code: code || null })
    if (!lead.owner_id) await update('leads', lead.id, { owner_id: auth.uid }, { quiet: true })
    setSkipped((s) => [...s, lead.id])
  }
  actRef.current = (k) => act({ 1: 'enviado', 2: 'respondeu', 3: 'sem_resposta', 4: 'invalido' }[k])

  const copy = async () => {
    try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { notify('Não consegui copiar. Selecione o texto.', 'err') }
  }
  const stageName = lead ? P.stage(lead.stage_id)?.name : ''

  return (
    <div className="page">
      <div className="card" style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 28px' }}>
        <div className="stack-s" style={{ gap: 2 }}><span className="lbl">Fila de hoje</span><span className="num" style={{ fontSize: 15 }}>{lead ? `Lead ${skipped.length + 1} de ${queue.length}` : `${queue.length} na fila`}</span></div>
        <div className="stack-s" style={{ flex: '1 1 260px' }}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}><span className="lbl">Meta de contatos do dia</span><span className="num">{contactsToday} / {Math.ceil(dailyGoal)}</span></div>
          <Bar value={(contactsToday / dailyGoal) * 100} />
        </div>
        <div className="stack-s" style={{ gap: 2 }}><span className="lbl">Respostas</span><span className="num" style={{ fontSize: 15 }}>{repliesToday}</span></div>
        <div className="stack-s" style={{ gap: 2 }}><span className="lbl">Tempo de sessão</span><span className="num" style={{ fontSize: 15 }}>{String(Math.floor(mins / 60)).padStart(2, '0')}:{String(mins % 60).padStart(2, '0')}</span></div>
        <div className="row">
          <button type="button" className={`btn s ${tab === 'fila' ? '' : 'g'}`} onClick={() => setTab('fila')}>Fila</button>
          <button type="button" className={`btn s ${tab === 'termos' ? '' : 'g'}`} onClick={() => setTab('termos')}>Termos de busca</button>
          <Link to={auth.isDirector ? '/erp' : '/erp/painel'} className="btn s">Encerrar sessão</Link>
        </div>
      </div>

      {tab === 'termos' ? <Terms terms={terms} leads={data.leads} /> : (
        <div className="cols">
          {lead ? (
            <div className="card" style={{ flex: '2 1 520px', minWidth: 0, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="stack-s">
                  <h1 style={{ fontSize: 24 }}><Link to={`/erp/leads/${lead.id}`} style={{ color: 'var(--tx)' }}>{lead.company}</Link></h1>
                  <span className="lbl">{[lead.neighborhood, lead.city].filter(Boolean).join(' · ')}{lead.origin ? ` · ${lead.origin}` : ''}</span>
                </div>
                <div className="row">{lead.niche ? <Badge>{lead.niche}</Badge> : null}<Badge kind={stageName?.toLowerCase().startsWith('respond') ? 'y' : ''}>{stageName}</Badge></div>
              </div>
              <div className="fields" style={{ fontSize: 13 }}>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">WhatsApp</span><span className="num">{lead.phone || '—'}</span></div>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">Instagram</span>{lead.instagram ? <a href={igLink(lead.instagram)} target="_blank" rel="noreferrer">{igHandle(lead.instagram)}</a> : <span>—</span>}</div>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">Site atual</span><span>{lead.website || (lead.has_site ? 'Tem' : lead.has_site === false ? 'Não tem' : '—')}</span></div>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">Último contato</span><span>{lead.last_contact_at ? relDay(localDay(lead.last_contact_at)) : 'nunca'}{lead.next_step ? ` · ${lead.next_step}` : ''}</span></div>
              </div>

              <div className="stack-s" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Mensagem sugerida · <span className="num ok">{code || '—'}</span>{pb ? ` · ${pb.title}` : ''}</span>
                  <label className="lbl row" style={{ gap: 6 }}>Trocar
                    <Select value={code} onChange={(v) => setCode(v || '')} options={playbooks.filter((p) => p.code).map((p) => [p.code, `${p.code} · ${p.title}`])} style={{ width: 230, height: 30 }} />
                  </label>
                </div>
                {msg ? <div className="box">{msg}</div> : <div className="note y">Nenhuma mensagem com esse código. Crie em Playbooks.</div>}
                <div className="row">
                  <button type="button" className="btn" onClick={copy}><Icon name="copy" size={14} />{copied ? 'Copiado' : 'Copiar mensagem'}</button>
                  {wa ? <a className="btn p" href={wa} target="_blank" rel="noreferrer"><Icon name="wa" size={14} />Abrir no WhatsApp</a>
                    : lead.instagram ? <a className="btn p" href={igLink(lead.instagram)} target="_blank" rel="noreferrer">Abrir Instagram</a> : <span className="lbl">Sem telefone nem Instagram.</span>}
                  <button type="button" className="btn g" onClick={() => setSkipped((s) => [...s, lead.id])}>Pular</button>
                </div>
              </div>

              <div className="stack-s" style={{ gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Como foi? Grava o contato e agenda o follow-up sozinho.</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  {[['enviado', 'Enviado', '1 · follow-up em 3 dias', ''], ['respondeu', 'Respondeu', '2 · vai para Respondeu', 'var(--green-ln)'],
                    ['sem_resposta', 'Sem resposta', '3 · tenta de novo depois', ''], ['invalido', 'Número inválido', '4 · vai para Perdido', '#3A1A1C']].map(([r, l, k, bc]) => (
                    <AsyncButton key={r} className="btn" style={{ height: 56, flexDirection: 'column', gap: 2, borderColor: bc || undefined, background: r === 'respondeu' ? 'var(--green-bg)' : undefined }} onClick={() => act(r)}>
                      <span>{l}</span><kbd style={{ border: 0, padding: 0, fontSize: 10 }}>{k}</kbd>
                    </AsyncButton>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: '2 1 520px', padding: 22 }}>
              <Empty icon="check" action={
                <div className="row" style={{ justifyContent: 'center' }}>
                  {skipped.length ? <button type="button" className="btn" onClick={() => setSkipped([])}>Rever pulados ({skipped.length})</button> : null}
                  <button type="button" className="btn p" onClick={() => setPull(true)}>Puxar novos leads para a fila</button>
                  <button type="button" className="btn" onClick={() => setTab('termos')}>Ver termos de busca</button>
                </div>
              }>
                {queue.length ? 'Você passou por toda a fila de hoje.' : 'Fila vazia. Puxe leads novos ou importe uma planilha.'}
              </Empty>
            </div>
          )}

          <div className="stack" style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div className="card" style={{ padding: '14px 16px' }}>
              <h2 style={{ paddingBottom: 6 }}>Próximos da fila</h2>
              {active.slice(1, 8).map((l, i) => (
                <div key={l.id} className="li" style={{ padding: '8px 0' }}>
                  <span className="num lbl" style={{ width: 22 }}>{i + 1}</span>
                  <Link to={`/erp/leads/${l.id}`} className="grow ellipsis" style={{ color: 'var(--tx)' }}>{l.company}</Link>
                  <span className="lbl">{l.next_step_code || l.niche || ''}</span>
                </div>
              ))}
              {active.length <= 1 ? <p className="lbl">Nada depois deste.</p> : null}
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <h2 style={{ paddingBottom: 6 }}>Atalhos</h2>
              <p className="lbl" style={{ lineHeight: 1.7 }}>Teclas <kbd>1</kbd> enviado · <kbd>2</kbd> respondeu · <kbd>3</kbd> sem resposta · <kbd>4</kbd> inválido. Quem respondeu sempre aparece primeiro na fila.</p>
            </div>
          </div>
        </div>
      )}
      {pull ? <PullModal leads={data.leads} P={P} onClose={() => setPull(false)} /> : null}
    </div>
  )
}

function PullModal({ leads, P, onClose }) {
  const auth = useAuth()
  const [n, setN] = useState(30)
  const [niche, setNiche] = useState('')
  const pool = leads.filter((l) => P.stage(l.stage_id)?.kind === 'open' && !l.next_step_at && (!l.owner_id || l.owner_id === auth.uid) && (!niche || l.niche === niche))
  const niches = Array.from(new Set(leads.map((l) => l.niche).filter(Boolean))).sort()
  return (
    <div className="erp-overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal sm" role="dialog" aria-label="Puxar leads">
        <div className="modal-h"><h2 style={{ fontSize: 15 }}>Puxar leads para a fila de hoje</h2><button type="button" className="btn ic s g" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-b">
          <p className="lbl">{pool.length} lead(s) disponíveis sem próximo passo (seus ou sem dono).</p>
          <Field label="Quantos"><input type="number" className="in num" value={n} onChange={(e) => setN(Number(e.target.value) || 0)} /></Field>
          <Field label="Nicho"><Select value={niche} onChange={(v) => setNiche(v || '')} placeholder="qualquer" options={niches} /></Field>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <AsyncButton className="btn p" onClick={async () => {
            const pick = pool.slice(0, n)
            for (const l of pick) await update('leads', l.id, { owner_id: auth.uid, next_step_at: today(), next_step: 'Primeiro contato', next_step_code: l.has_site ? 'M2' : 'M1' }, { quiet: true })
            notify(`${pick.length} lead(s) na sua fila.`, 'ok'); onClose()
          }}>Puxar {Math.min(n, pool.length)}</AsyncButton>
        </div>
      </div>
    </div>
  )
}

function Terms({ terms, leads }) {
  const auth = useAuth()
  const [niche, setNiche] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [newT, setNewT] = useState({ niche: '', neighborhood: '' })
  const niches = Array.from(new Set(terms.map((x) => x.niche))).sort()
  const count = (t) => leads.filter((l) => l.search_term_id === t.id || ((l.niche || '').toLowerCase() === t.niche.toLowerCase() && (l.neighborhood || '').toLowerCase() === t.neighborhood.toLowerCase())).length
  const rows = terms.filter((t) => (!niche || t.niche === niche) && (!onlyOpen || !t.done))
  const done = terms.filter((t) => t.done).length
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-h">
        <div className="stack-s" style={{ gap: 2 }}><h2>Termos de busca · nicho × bairro</h2><span className="lbl">{done} de {terms.length} feitos. Marque cada busca feita no Instagram ou Google Maps e veja quais rendem.</span></div>
        <div className="row">
          <Select value={niche} onChange={(v) => setNiche(v || '')} placeholder="Todos os nichos" options={niches} style={{ width: 180 }} />
          <label className="check"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />Só pendentes</label>
        </div>
      </div>
      <div className="tbl-wrap" style={{ maxHeight: 560 }}><table className="tbl">
        <thead><tr><th>Feito</th><th>Nicho</th><th>Bairro</th><th className="r">Leads gerados</th><th>Rendimento</th><th>Feito em</th></tr></thead>
        <tbody>
          {rows.map((t) => {
            const n = count(t)
            return (
              <tr key={t.id}>
                <td><input type="checkbox" checked={t.done} aria-label={`${t.niche} em ${t.neighborhood}`} onChange={(e) => update('search_terms', t.id, { done: e.target.checked })} /></td>
                <td>{t.niche}</td><td>{t.neighborhood}</td>
                <td className="num r">{n || '—'}</td>
                <td>{!t.done ? <span className="b">a fazer</span> : n >= 15 ? <Badge kind="g">bom</Badge> : n >= 5 ? <Badge>médio</Badge> : <Badge kind="r">fraco</Badge>}</td>
                <td className="num lbl">{t.done_at ? t.done_at.slice(8, 10) + '/' + t.done_at.slice(5, 7) : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table></div>
      {auth.isTotal('prospeccao') ? (
        <div className="row" style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
          <input className="in" style={{ width: 180 }} placeholder="Nicho" value={newT.niche} onChange={(e) => setNewT({ ...newT, niche: e.target.value })} />
          <input className="in" style={{ width: 180 }} placeholder="Bairro ou cidade" value={newT.neighborhood} onChange={(e) => setNewT({ ...newT, neighborhood: e.target.value })} />
          <AsyncButton className="btn" onClick={async () => {
            if (!newT.niche || !newT.neighborhood) return
            await insert('search_terms', { ...newT, owner_id: null }); setNewT({ niche: '', neighborhood: '' })
          }}>Adicionar termo</AsyncButton>
        </div>
      ) : null}
    </div>
  )
}

export { defaultLeadStage, inRange, useNavigate }
