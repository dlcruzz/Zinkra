import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, update, notify } from '../lib/data'
import { getPipelines, registerActivity, defaultLeadStage } from '../lib/automations'
import { today, waLink, igLink, igHandle, fillTemplate, relDay, MONTHS, startOfMonth, endOfMonth, businessDays, inRange, localDay } from '../lib/format'
import { Loading, ErrorBox, Bar, Badge, Select, AsyncButton, Field, Empty, CountUp } from '../components/ui'
import { Icon } from '../lib/icons'

const CONTACT = new Set(['whatsapp', 'ligacao', 'email', 'visita'])
const COL_KEY = 'zk.prospeccao.playbook'
const GENERIC = new Set(['Cobrança', 'Objeções', 'Prospecção'])

const readCol = () => { try { return localStorage.getItem(COL_KEY) || '' } catch { return '' } }
const saveCol = (c) => { try { localStorage.setItem(COL_KEY, c) } catch { /* sem storage */ } }
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// coleção que combina com o nicho do lead (ex.: nicho "Arquiteto" → coleção "Arquitetos")
function collectionForNiche(niche, cols) {
  const n = norm(niche)
  if (!n) return null
  return cols.find((c) => { const k = norm(c); return k.startsWith(n.slice(0, 5)) || n.startsWith(k.slice(0, 5)) }) || null
}

// prefixo dos códigos da coleção (AR1, ARF1… → "AR")
function prefixOf(items) {
  const first = items.find((p) => /^[A-Z]+\d+$/.test(p.code || ''))
  return first ? first.code.replace(/\d+$/, '') : ''
}

// traduz o próximo passo genérico do lead (M1, F1, V2…) para o script equivalente da coleção
function codeForLead(lead, items) {
  if (!items.length) return ''
  const codes = new Set(items.map((p) => p.code))
  const next = lead?.next_step_code || ''
  if (codes.has(next)) return next
  const px = prefixOf(items)
  const map = { M1: `${px}1`, M2: `${px}1`, F1: `${px}F1`, V2: `${px}2` }
  if (map[next] && codes.has(map[next])) return map[next]
  return items[0].code || ''
}

export default function Prospeccao() {
  useMeta('Comercial', 'Prospecção')
  const auth = useAuth()
  const [skipped, setSkipped] = useState([])
  const [col, setColState] = useState(readCol)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState('')
  const [opened, setOpened] = useState(false)
  const [started] = useState(() => Date.now())
  const [, tick] = useState(0)
  const [pull, setPull] = useState(false)

  const setCol = (c) => { setColState(c); saveCol(c) }

  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i) }, [])

  const { data, loading, error, reload } = useData(async () => {
    const t = today()
    const [P, leads, playbooks, acts, goals] = await Promise.all([
      getPipelines(),
      fetchRows('leads', { limit: 5000 }),
      fetchRows('playbooks', { order: 'code', ascending: true }),
      fetchRows('activities', { where: (q) => q.eq('owner_id', auth.uid).gte('happened_at', t), order: 'happened_at' }),
      fetchRows('goals').catch(() => []),
    ])
    return { P, leads, playbooks, acts, goals }
  }, ['leads', 'activities', 'goals', 'playbooks'], [auth.uid])

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

  const cols = useMemo(() => (data ? Array.from(new Set(data.playbooks.map((p) => p.collection))).sort() : []), [data])
  const active = queue.filter((l) => !skipped.includes(l.id))
  const lead = active[0]

  // ao trocar de lead: escolhe o playbook do nicho (se existir) e a mensagem certa da sequência
  useEffect(() => {
    if (!data) return
    setCopied(''); setOpened(false)
    const byNiche = collectionForNiche(lead?.niche, cols.filter((c) => !GENERIC.has(c)))
    const c = byNiche || (cols.includes(col) ? col : cols.find((x) => !GENERIC.has(x)) || cols[0] || '')
    if (c !== col) setCol(c)
    const items = data.playbooks.filter((p) => p.collection === c && p.code)
    setCode(codeForLead(lead, items))
  }, [lead?.id, data]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const { P, playbooks, acts, goals } = data
  const contactsToday = acts.filter((a) => CONTACT.has(a.type)).length
  const repliesToday = acts.filter((a) => a.result === 'respondeu').length
  const g = goals.find((x) => !x.archived_at && x.user_id === auth.uid && x.metric === 'contatos')
  const t = today()
  const dailyGoal = g ? (g.period === 'day' ? Number(g.target) : g.period === 'week' ? Number(g.target) / 5 : Number(g.target) / (businessDays(startOfMonth(t), endOfMonth(t)) || 22)) : 30
  const mins = Math.floor((Date.now() - started) / 60000)
  const items = playbooks.filter((p) => p.collection === col && p.code)
  const vars = lead ? { EMPRESA: lead.company, NICHO: (lead.niche || '').toLowerCase(), BAIRRO: lead.neighborhood || 'sua região', NOME: '', MES: MONTHS[new Date().getMonth()] } : {}
  // sem nome do contato: "Falo com [NOME]" vira "Falo com o responsável"; "Oi, [NOME]!" vira "Oi!"
  const fill = (body) => (lead ? fillTemplate(body, vars).replace(/com (a |o )?\[NOME\],?/g, 'com o responsável').replace(/pra \[NOME\]/g, 'pro responsável').replace(/,? ?\[NOME\]/g, '').replace(/ ,/g, ',').replace(/ +([!?.])/g, '$1') : body)
  const pb = items.find((p) => p.code === code)
  const msg = pb ? fill(pb.body) : ''
  const wa = lead ? waLink(lead.phone, msg) : null
  const done = skipped.length
  const total = queue.length

  const act = async (result) => {
    if (!lead) return
    await registerActivity(lead, { type: 'whatsapp', result, script_code: code || null })
    if (!lead.owner_id) await update('leads', lead.id, { owner_id: auth.uid }, { quiet: true })
    setSkipped((s) => [...s, lead.id])
  }
  actRef.current = (k) => act({ 1: 'enviado', 2: 'respondeu', 3: 'sem_resposta', 4: 'invalido' }[k])

  const copy = async (p) => {
    try {
      await navigator.clipboard.writeText(fill(p.body))
      setCode(p.code); setCopied(p.code); setTimeout(() => setCopied((c) => (c === p.code ? '' : c)), 1800)
    } catch { notify('Não consegui copiar. Selecione o texto.', 'err') }
  }
  const stageName = lead ? P.stage(lead.stage_id)?.name : ''

  return (
    <div className="page prosp">
      <div className="prosp-split">
        {/* ESQUERDA: sessão, lead atual e fila */}
        <div className="prosp-left">
          <div className="card prosp-session">
            <div className="prosp-stat"><span className="lbl">Na fila</span><span className="num big"><CountUp value={active.length} /></span><span className="lbl">{total ? `${done} de ${total} feitos` : 'hoje'}</span></div>
            <div className="prosp-stat"><span className="lbl">Contatos hoje</span><span className="num big"><CountUp value={contactsToday} /><span className="lbl" style={{ fontSize: 13 }}> / {Math.ceil(dailyGoal)}</span></span><Bar value={(contactsToday / dailyGoal) * 100} /></div>
            <div className="prosp-stat"><span className="lbl">Respostas</span><span className="num big ok"><CountUp value={repliesToday} /></span></div>
            <div className="prosp-stat"><span className="lbl">Sessão</span><span className="num big">{String(Math.floor(mins / 60)).padStart(2, '0')}:{String(mins % 60).padStart(2, '0')}</span></div>
            <div className="row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
              <Link to="/erp/captacao" className="btn s g"><Icon name="search" size={14} />Captar clientes</Link>
              <Link to={auth.isDirector ? '/erp' : '/erp/painel'} className="btn s">Encerrar sessão</Link>
            </div>
          </div>

          {lead ? (
            <div className="card prosp-lead" key={lead.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: 12 }}>
                <div className="stack-s" style={{ minWidth: 0 }}>
                  <span className="lbl">Agora · lead {done + 1} de {total}</span>
                  <h1 style={{ fontSize: 22, lineHeight: 1.2 }}><Link to={`/erp/leads/${lead.id}`} style={{ color: 'var(--tx)' }}>{lead.company}</Link></h1>
                  <span className="lbl">{[lead.neighborhood, lead.city].filter(Boolean).join(' · ')}{lead.origin ? ` · ${lead.origin}` : ''}</span>
                </div>
                <div className="row" style={{ justifyContent: 'flex-end' }}>{lead.niche ? <Badge>{lead.niche}</Badge> : null}{stageName ? <Badge kind={stageName.toLowerCase().startsWith('respond') ? 'y' : ''}>{stageName}</Badge> : null}</div>
              </div>

              <div className="fields" style={{ fontSize: 13 }}>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">WhatsApp</span><span className="num">{lead.phone || '—'}</span></div>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">Instagram</span>{lead.instagram ? <a href={igLink(lead.instagram)} target="_blank" rel="noreferrer">{igHandle(lead.instagram)}</a> : <span>—</span>}</div>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">Site atual</span><span>{lead.website || (lead.has_site ? 'Tem' : lead.has_site === false ? 'Não tem' : '—')}</span></div>
                <div className="stack-s" style={{ gap: 3 }}><span className="lbl">Último contato</span><span>{lead.last_contact_at ? relDay(localDay(lead.last_contact_at)) : 'nunca'}{lead.next_step ? ` · ${lead.next_step}` : ''}</span></div>
              </div>

              <ol className="prosp-steps">
                <li className={opened ? 'done' : 'on'}>
                  <span className="n">1</span>
                  <div className="stack-s grow">
                    <strong>Abra a conversa</strong>
                    <span className="lbl">Abre direto no WhatsApp do computador, já com a mensagem {code || ''} escrita.</span>
                  </div>
                  {wa ? <a className="btn p" href={wa} onClick={() => setOpened(true)}><Icon name="wa" size={14} />Abrir WhatsApp</a>
                    : lead.instagram ? <a className="btn p" href={igLink(lead.instagram)} target="_blank" rel="noreferrer" onClick={() => setOpened(true)}>Abrir Instagram</a>
                      : <span className="lbl">Sem telefone nem Instagram.</span>}
                </li>
                <li className={opened ? 'on' : ''}>
                  <span className="n">2</span>
                  <div className="stack-s grow">
                    <strong>Mande as mensagens</strong>
                    <span className="lbl">Copie cada balão no painel da direita, um por vez.</span>
                  </div>
                </li>
                <li className={opened ? 'on' : ''}>
                  <span className="n">3</span>
                  <div className="stack-s grow"><strong>Como foi?</strong><span className="lbl">Grava o contato, agenda o follow-up e passa pro próximo.</span></div>
                </li>
              </ol>
              <div className="prosp-results">
                {[['enviado', 'Enviado', '1 · follow-up em 3 dias'], ['respondeu', 'Respondeu', '2 · vai para Respondeu'],
                  ['sem_resposta', 'Sem resposta', '3 · tenta de novo depois'], ['invalido', 'Número inválido', '4 · vai para Perdido']].map(([r, l, k]) => (
                  <AsyncButton key={r} className={`btn res-${r}`} onClick={() => act(r)}>
                    <span>{l}</span><kbd>{k}</kbd>
                  </AsyncButton>
                ))}
              </div>
              <button type="button" className="btn s g" style={{ alignSelf: 'flex-start' }} onClick={() => setSkipped((s) => [...s, lead.id])}>Pular este lead</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 22 }}>
              <Empty icon="check" action={
                <div className="row" style={{ justifyContent: 'center' }}>
                  {skipped.length ? <button type="button" className="btn" onClick={() => setSkipped([])}>Rever pulados ({skipped.length})</button> : null}
                  <button type="button" className="btn p" onClick={() => setPull(true)}>Puxar novos leads para a fila</button>
                  <Link to="/erp/captacao" className="btn">Captar clientes novos</Link>
                </div>
              }>
                {queue.length ? 'Você passou por toda a fila de hoje.' : 'Fila vazia. Puxe leads novos ou capte clientes em Captação.'}
              </Empty>
            </div>
          )}

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', paddingBottom: 6 }}>
              <h2>Próximos da fila</h2>
              <span className="lbl">Teclas <kbd>1</kbd>–<kbd>4</kbd> registram o resultado</span>
            </div>
            {active.slice(1, 8).map((l, i) => (
              <div key={l.id} className="li" style={{ padding: '8px 0' }}>
                <span className="num lbl" style={{ width: 22 }}>{i + 2}</span>
                <Link to={`/erp/leads/${l.id}`} className="grow ellipsis" style={{ color: 'var(--tx)' }}>{l.company}</Link>
                <span className="lbl">{l.niche || ''}</span>
              </div>
            ))}
            {active.length <= 1 ? <p className="lbl">Nada depois deste.</p> : active.length > 8 ? <p className="lbl" style={{ paddingTop: 8 }}>+ {active.length - 8} na fila</p> : null}
          </div>
        </div>

        {/* DIREITA: mensagens do playbook escolhido */}
        <aside className="card prosp-right" aria-label="Mensagens do playbook">
          <div className="prosp-right-h">
            <div className="stack-s" style={{ gap: 2 }}>
              <span className="lbl">Playbook desta sessão</span>
              <Select value={col} onChange={(v) => { const c = v || ''; setCol(c); setCode(codeForLead(lead, playbooks.filter((p) => p.collection === c && p.code))) }} options={cols} style={{ height: 34, minWidth: 200 }} />
            </div>
            {lead ? <span className="lbl" style={{ textAlign: 'right' }}>Preenchido para<br /><span style={{ color: 'var(--tx)' }}>{lead.company}</span></span> : null}
          </div>
          <div className="prosp-msgs">
            {items.map((p) => {
              const on = p.code === code
              return (
                <div key={p.id} className={`prosp-msg ${on ? 'on' : ''}`} onClick={() => setCode(p.code)}>
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 0 }} className="ellipsis"><span className="num ok">{p.code}</span> · {p.title}</span>
                    <button type="button" className={`btn s ${copied === p.code ? 'p' : ''}`} onClick={(e) => { e.stopPropagation(); copy(p) }}>
                      <Icon name={copied === p.code ? 'check' : 'copy'} size={13} />{copied === p.code ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  {p.when_to_use ? <span className="lbl">{p.when_to_use}</span> : null}
                  <div className="box">{fill(p.body)}</div>
                </div>
              )
            })}
            {!items.length ? <Empty icon="book">Nenhuma mensagem com código nesta coleção. Crie em <Link to="/erp/playbooks">Playbooks</Link>.</Empty> : null}
          </div>
        </aside>
      </div>
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

export { defaultLeadStage, inRange, useNavigate }
