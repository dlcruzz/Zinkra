import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, update, notify, emitChange } from '../lib/data'
import { getPipelines, registerActivity, defaultLeadStage } from '../lib/automations'
import { today, waLink, igLink, igDm, igHandle, fillTemplate, relDay, MONTHS, startOfMonth, endOfMonth, businessDays, inRange, localDay } from '../lib/format'
import { Loading, ErrorBox, Bar, Badge, Select, AsyncButton, Field, Empty, CountUp, Seg, Modal } from '../components/ui'
import { Icon } from '../lib/icons'
import { usePacer, mmss } from '../lib/pacer'
import { nicheStats, rankNiches, reasons, fmtPct, LEVEL, MODES, MIN_DATA, MIN_REPLIES } from '../lib/nicheScore'
import { nicheKey, KIND_LABEL } from '../lib/nichos'
import { rankPlaces } from '../lib/locais'
import Potencial from '../components/Potencial'

const CONTACT = new Set(['whatsapp', 'ligacao', 'email', 'visita'])
const COL_KEY = 'zk.prospeccao.playbook'
const GENERIC = new Set(['Cobrança', 'Objeções', 'Prospecção'])

// uma lista por canal: dá para rodar WhatsApp e Instagram ao mesmo tempo
const SES_KEY = 'zk.prospeccao.sessao'
const sesKey = (ch) => `${SES_KEY}.${ch}`
const readSes = (ch) => {
  try {
    const v = JSON.parse(localStorage.getItem(sesKey(ch)) || 'null')
    if (v) return v
    // lista antiga (de antes de ter os dois canais): vai para o canal dela
    const old = JSON.parse(localStorage.getItem(SES_KEY) || 'null')
    if (old && (old.channel === 'instagram' ? 'instagram' : 'whatsapp') === ch) { localStorage.setItem(sesKey(ch), JSON.stringify({ ...old, channel: ch })); localStorage.removeItem(SES_KEY); return { ...old, channel: ch } }
  } catch { /* sem storage */ }
  return null
}
const saveSes = (ch, v) => { try { v ? localStorage.setItem(sesKey(ch), JSON.stringify(v)) : localStorage.removeItem(sesKey(ch)) } catch { /* sem storage */ } }
const CH_NAME = { whatsapp: 'WhatsApp', instagram: 'Instagram' }
const fold = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const FIRST = new Set(['M1', 'M2'])
// o lead entra nesta prospecção? (público + local escolhidos, ou retornos de quem já foi contatado)
function inSession(l, ses) {
  if (!ses) return false
  if (ses.channel === 'instagram' && !l.instagram) return false
  if (ses.channel !== 'instagram' && !l.phone) return false
  if (ses.kind === 'retornos') return Boolean(l.last_contact_at)
  if (ses.kind === 'lista') return (ses.ids || []).includes(l.id)
  if (ses.niche && fold(l.niche) !== fold(ses.niche)) return false
  if (ses.city && fold(l.city) !== fold(ses.city)) return false
  if (ses.neighborhood && fold(l.neighborhood) !== fold(ses.neighborhood)) return false
  return true
}
const sesLabel = (ses) => (ses?.kind === 'lista' ? ses.label || 'Leads selecionados' : ses?.kind === 'retornos' ? 'Retornos e follow-ups' : [ses?.niche, ses?.neighborhood, ses?.city].filter(Boolean).join(' · ') || 'Todos os leads')
const CH_KEY = 'zk.prospeccao.canal'
const readCh = () => { try { return localStorage.getItem(CH_KEY) || 'whatsapp' } catch { return 'whatsapp' } }
const saveCh = (c) => { try { localStorage.setItem(CH_KEY, c) } catch { /* sem storage */ } }
const firstPending = (l) => !l.last_contact_at && (!l.next_step_code || FIRST.has(l.next_step_code))

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
  const [skippedBy, setSkippedBy] = useState({ whatsapp: [], instagram: [] })
  const [col, setColState] = useState(readCol)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState('')
  const [opened, setOpened] = useState(false)
  const [started] = useState(() => Date.now())
  const [, tick] = useState(0)
  const [pull, setPull] = useState(false)
  const [editing, setEditing] = useState(null) // { id, body }
  const [channel, setChannelState] = useState(readCh)
  const setChannel = (c) => { setChannelState(c); saveCh(c) }
  const [sesBy, setSesBy] = useState(() => ({ whatsapp: readSes('whatsapp'), instagram: readSes('instagram') }))
  const ses = sesBy[channel]
  const isIg = channel === 'instagram'
  // os dois ritmos rodam juntos: o alarme de um toca mesmo vendo o outro
  const pacers = { whatsapp: usePacer('whatsapp'), instagram: usePacer('instagram') }
  const pacer = pacers[channel]
  const [ending, setEnding] = useState(false)
  const skipped = skippedBy[channel]
  const setSkipped = (f) => setSkippedBy((m) => ({ ...m, [channel]: typeof f === 'function' ? f(m[channel]) : f }))
  const setSes = (v) => { const nv = v ? { ...v, channel } : null; setSesBy((m) => ({ ...m, [channel]: nv })); saveSes(channel, nv); setSkipped([]) }

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

  const queues = useMemo(() => {
    const out = { whatsapp: [], instagram: [] }
    if (!data) return out
    const t = today()
    const build = (s) => data.leads.filter((l) => {
      const st = data.P.stage(l.stage_id)
      return st && st.kind === 'open' && l.next_step_at && l.next_step_at <= t && (l.owner_id === auth.uid || !l.owner_id) && inSession(l, s)
    }).sort((a, b) => {
      // respondeu primeiro, depois atrasados, depois novos
      const ra = data.P.stage(a.stage_id)?.name.toLowerCase().startsWith('respond') ? 0 : 1
      const rb = data.P.stage(b.stage_id)?.name.toLowerCase().startsWith('respond') ? 0 : 1
      if (ra !== rb) return ra - rb
      // no Instagram vem primeiro quem não tem telefone (só dá para falar por lá)
      if (s.channel === 'instagram' && Boolean(a.phone) !== Boolean(b.phone)) return a.phone ? 1 : -1
      return (a.next_step_at || '').localeCompare(b.next_step_at || '')
    })
    if (sesBy.whatsapp) out.whatsapp = build(sesBy.whatsapp)
    if (sesBy.instagram) out.instagram = build(sesBy.instagram)
    return out
  }, [data, auth, sesBy])
  // o mesmo lead não aparece ao mesmo tempo nas duas listas
  const firstOf = (ch) => queues[ch].find((l) => !skippedBy[ch].includes(l.id))
  const otherCh = channel === 'instagram' ? 'whatsapp' : 'instagram'
  const otherFirst = firstOf(otherCh)
  const queue = queues[channel].filter((l) => !(otherFirst && l.id === otherFirst.id && otherCh === 'whatsapp'))

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
  const bar = <ChannelBar channel={channel} onChange={setChannel} sesBy={sesBy} pacers={pacers} left={{ whatsapp: queues.whatsapp.filter((l) => !skippedBy.whatsapp.includes(l.id)).length, instagram: queues.instagram.filter((l) => !skippedBy.instagram.includes(l.id)).length }} />
  if (!ses) return <NovaProspeccao data={data} channel={channel} bar={bar} onStart={setSes} />

  const { P, playbooks, acts, goals } = data
  const contactsToday = acts.filter((a) => CONTACT.has(a.type)).length
  const repliesToday = acts.filter((a) => a.result === 'respondeu').length
  const g = goals.find((x) => !x.archived_at && x.user_id === auth.uid && x.metric === 'contatos')
  const t = today()
  const dailyGoal = g ? (g.period === 'day' ? Number(g.target) : g.period === 'week' ? Number(g.target) / 5 : Number(g.target) / (businessDays(startOfMonth(t), endOfMonth(t)) || 22)) : 30
  const mins = Math.floor((Date.now() - started) / 60000)
  const items = playbooks.filter((p) => p.collection === col && p.code)
  const vars = lead ? { EMPRESA: lead.company, NICHO: (lead.niche || '').toLowerCase(), BAIRRO: lead.neighborhood || 'sua região', NOME: '', CIDADE: lead.city || 'sua cidade', MES: MONTHS[new Date().getMonth()] } : {}
  // sem nome do contato: "Falo com [NOME]" vira "Falo com o responsável"; "Oi, [NOME]!" vira "Oi!"
  // scripts antigos citam "São Paulo" fixo: troca pela cidade do lead quando ele é de outro lugar
  const localize = (t) => (lead?.city && !/^s[aã]o paulo$/i.test(lead.city.trim()) ? t.replace(/\b(em|de|aqui em|da região de) São Paulo\b/g, `$1 ${lead.city}`) : t)
  const fill = (body) => (lead ? localize(fillTemplate(body, vars)).replace(/com (a |o )?\[NOME\],?/g, 'com o responsável').replace(/pra \[NOME\]/g, 'pro responsável').replace(/,? ?\[NOME\]/g, '').replace(/ ,/g, ',').replace(/ +([!?.])/g, '$1') : body)
  const pb = items.find((p) => p.code === code)
  const msg = pb ? fill(pb.body) : ''
  const wa = lead ? waLink(lead.phone, msg) : null
  // quem já respondeu é conversa em andamento: não entra no limite de primeiros contatos
  const isReply = lead ? /^respond/i.test(P.stage(lead.stage_id)?.name || '') : false
  const done = skipped.length
  const total = queue.length

  const act = async (result) => {
    if (!lead) return
    await registerActivity(lead, { type: 'whatsapp', result, script_code: code || null, note: isIg ? 'Instagram Direct' : null })
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
      {bar}
      <PauseTip channel={channel} pacer={pacer} other={pacers[otherCh]} otherHasList={Boolean(sesBy[otherCh])} onGo={() => setChannel(otherCh)} />
      <div className="prosp-split">
        {/* ESQUERDA: sessão, lead atual e fila */}
        <div className="prosp-left">
          <div className="card prosp-current">
            <span className="lbl">Prospecção atual</span>
            <strong className="ellipsis">{sesLabel(ses)}</strong>
          </div>
          <div className="card prosp-session">
            <div className="prosp-stat"><span className="lbl">Na fila</span><span className="num big"><CountUp value={active.length} /></span><span className="lbl">{total ? `${done} de ${total} feitos` : 'hoje'}</span></div>
            <div className="prosp-stat"><span className="lbl">Contatos hoje</span><span className="num big"><CountUp value={contactsToday} /><span className="lbl" style={{ fontSize: 13 }}> / {Math.ceil(dailyGoal)}</span></span><Bar value={(contactsToday / dailyGoal) * 100} /></div>
            <div className="prosp-stat"><span className="lbl">Respostas</span><span className="num big ok"><CountUp value={repliesToday} /></span></div>
            <div className="prosp-stat"><span className="lbl">Sessão</span><span className="num big">{String(Math.floor(mins / 60)).padStart(2, '0')}:{String(mins % 60).padStart(2, '0')}</span></div>
            <div className="row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
              <Link to="/erp/captacao" className="btn s g"><Icon name="search" size={14} />Captar clientes</Link>
              <button type="button" className="btn s d" onClick={() => setEnding(true)}><Icon name="stop" size={13} />Encerrar prospecção</button>
            </div>
          </div>

          <PacerCard pacer={pacer} isIg={isIg} />

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
                  {isIg ? (
                    <div className="stack-s grow">
                      <strong>Abra o Direct</strong>
                      <span className="lbl">Copia a mensagem {code || ''} e abre a conversa com {igHandle(lead.instagram)}. Lá é só colar (Ctrl+V) e enviar.</span>
                    </div>
                  ) : (
                    <div className="stack-s grow">
                      <strong>Abra a conversa</strong>
                      <span className="lbl">Abre direto no app do WhatsApp, já com a mensagem {code || ''} escrita.</span>
                    </div>
                  )}
                  {isIg ? (isReply || pacer.status === 'livre'
                    ? <a className="btn p" href={igDm(lead.instagram)} target="_blank" rel="noreferrer" onClick={() => {
                      if (msg) navigator.clipboard.writeText(msg).then(() => setCopied(code)).catch(() => notify('Não consegui copiar. Copie no painel da direita.', 'err'))
                      setOpened(true); if (!isReply) pacer.registerSend()
                    }}><Icon name="ig" size={14} />Copiar e abrir Direct</a>
                    : <button type="button" className="btn" disabled title="Respeitando o ritmo para não restringir o Instagram"><Icon name="clock" size={14} />{pacer.status === 'dia' ? 'Limite de hoje atingido' : `Aguarde ${mmss(pacer.waiting)}`}</button>)
                  : wa ? (isReply || pacer.status === 'livre'
                    ? <a className="btn p" href={wa} onClick={() => { setOpened(true); if (!isReply) pacer.registerSend() }}><Icon name="wa" size={14} />Abrir WhatsApp</a>
                    : <button type="button" className="btn" disabled title="Respeitando o ritmo para não bloquear o WhatsApp"><Icon name="clock" size={14} />{pacer.status === 'dia' ? 'Limite de hoje atingido' : `Aguarde ${mmss(pacer.waiting)}`}</button>)
                    : lead.instagram ? <a className="btn p" href={igLink(lead.instagram)} target="_blank" rel="noreferrer" onClick={() => setOpened(true)}>Abrir Instagram</a>
                      : <span className="lbl">Sem telefone nem Instagram.</span>}
                </li>
                <li className={opened ? 'on' : ''}>
                  <span className="n">2</span>
                  <div className="stack-s grow">
                    <strong>Mande as mensagens</strong>
                    <span className="lbl">{isIg ? 'Se o script tiver mais de um balão, copie o próximo no painel da direita. Mande sem link na primeira mensagem.' : 'Copie cada balão no painel da direita, um por vez.'}</span>
                  </div>
                </li>
                <li className={opened ? 'on' : ''}>
                  <span className="n">3</span>
                  <div className="stack-s grow"><strong>Como foi?</strong><span className="lbl">Grava o contato, agenda o follow-up e passa pro próximo.</span></div>
                </li>
              </ol>
              <div className="prosp-results">
                {[['enviado', 'Enviado', '1 · follow-up em 3 dias'], ['respondeu', 'Respondeu', '2 · vai para Respondeu'],
                  ['sem_resposta', 'Sem resposta', '3 · tenta de novo depois'], ['invalido', isIg ? 'Perfil errado' : 'Número inválido', '4 · vai para Perdido']].map(([r, l, k]) => (
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
                  <button type="button" className="btn p" onClick={() => setEnding(true)}>Encerrar e começar outra</button>
                  <Link to="/erp/captacao" className="btn">Captar clientes novos</Link>
                </div>
              }>
                {queue.length ? 'Você passou por toda a fila desta prospecção.' : 'Nenhum lead nesta prospecção. Encerre e escolha outro público ou local.'}
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
                    <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                      {auth.isTotal('playbooks') && editing?.id !== p.id ? (
                        <button type="button" className="btn s g" onClick={(e) => { e.stopPropagation(); setEditing({ id: p.id, body: p.body }) }}><Icon name="edit" size={13} />Editar</button>
                      ) : null}
                      <button type="button" className={`btn s ${copied === p.code ? 'p' : ''}`} onClick={(e) => { e.stopPropagation(); copy(p) }}>
                        <Icon name={copied === p.code ? 'check' : 'copy'} size={13} />{copied === p.code ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  {p.when_to_use ? <span className="lbl">{p.when_to_use}</span> : null}
                  {editing?.id === p.id ? (
                    <div className="stack-s" onClick={(e) => e.stopPropagation()}>
                      <textarea className="ta" rows={6} autoFocus value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }} aria-label={`Texto da mensagem ${p.code}`} />
                      <span className="lbl">Use [EMPRESA], [NOME], [BAIRRO], [CIDADE] e [NICHO] para preencher com os dados do lead. A mudança vale para todos os leads.</span>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn s" onClick={() => setEditing(null)}>Cancelar</button>
                        <AsyncButton className="btn s p" onClick={async () => {
                          if (!editing.body.trim()) return notify('A mensagem não pode ficar vazia.', 'err')
                          await update('playbooks', p.id, { body: editing.body })
                          notify(`Mensagem ${p.code} salva.`, 'ok'); setEditing(null)
                        }}>Salvar</AsyncButton>
                      </div>
                    </div>
                  ) : <div className="box">{fill(p.body)}</div>}
                </div>
              )
            })}
            {!items.length ? <Empty icon="book">Nenhuma mensagem com código nesta coleção. Crie em <Link to="/erp/playbooks">Playbooks</Link>.</Empty> : null}
          </div>
        </aside>
      </div>
      {pull ? <PullModal leads={data.leads} P={P} onClose={() => setPull(false)} /> : null}
      {ending ? <EndModal ses={ses} leads={queue} onClose={() => setEnding(false)} onEnd={() => { setEnding(false); setSes(null) }} /> : null}
    </div>
  )
}

// ---------- início: escolher público e local ----------
function NovaProspeccao({ data, channel, bar, onStart }) {
  const auth = useAuth()
  const t = today()
  const { P, leads } = data
  const ig = channel === 'instagram'
  const mineOrFree = (l) => !l.owner_id || l.owner_id === auth.uid
  const isOpen = (l) => P.stage(l.stage_id)?.kind === 'open' && (ig ? Boolean(l.instagram) : Boolean(l.phone))
  const pool = useMemo(() => leads.filter((l) => isOpen(l) && !l.next_step_at && mineOrFree(l)), [leads, ig]) // eslint-disable-line react-hooks/exhaustive-deps
  const due = useMemo(() => leads.filter((l) => isOpen(l) && l.next_step_at && l.next_step_at <= t && mineOrFree(l)), [leads, ig]) // eslint-disable-line react-hooks/exhaustive-deps
  const returns = due.filter((l) => l.last_contact_at)
  const pending = due.filter(firstPending)

  const count = (arr, key) => {
    const m = new Map()
    arr.forEach((l) => { const v = (l[key] || '').trim(); if (!v) return; const k = fold(v); const cur = m.get(k) || { label: v, n: 0 }; cur.n++; m.set(k, cur) })
    return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
  }
  const niches = useMemo(() => count(pool, 'niche'), [pool])
  const [niche, setNiche] = useState('')
  useEffect(() => { if (niche && !niches.some((x) => fold(x.label) === fold(niche))) setNiche('') }, [niches]) // eslint-disable-line react-hooks/exhaustive-deps
  const byNiche = pool.filter((l) => !niche || fold(l.niche) === fold(niche))
  const cities = count(byNiche, 'city')
  const [city, setCity] = useState('')
  const byCity = byNiche.filter((l) => !city || fold(l.city) === fold(city))
  const hoods = count(byCity, 'neighborhood')
  const [hood, setHood] = useState('')
  const avail = byCity.filter((l) => !hood || fold(l.neighborhood) === fold(hood))
  const [n, setN] = useState(30)
  useEffect(() => { setCity(''); setHood('') }, [niche])
  useEffect(() => { setHood('') }, [city])

  // fila antiga (de antes): agrupa por público e cidade para continuar ou devolver
  const groups = useMemo(() => {
    const m = new Map()
    pending.forEach((l) => { const k = fold(l.niche) + '|' + fold(l.city); const g = m.get(k) || { niche: l.niche || '', city: l.city || '', leads: [] }; g.leads.push(l); m.set(k, g) })
    return [...m.values()].sort((a, b) => b.leads.length - a.leads.length)
  }, [pending])

  const start = async () => {
    const pick = avail.slice(0, Math.max(0, n))
    for (const l of pick) await update('leads', l.id, { owner_id: auth.uid, next_step_at: t, next_step: 'Primeiro contato', next_step_code: l.has_site ? 'M2' : 'M1' }, { quiet: true, silent: true })
    emitChange('leads')
    onStart({ kind: 'nova', channel, niche, city, neighborhood: hood, at: Date.now() })
    notify(`Prospecção iniciada com ${pick.length} lead(s).`, 'ok')
  }
  const giveBack = async (list) => {
    for (const l of list) await update('leads', l.id, { next_step_at: null, next_step: null, next_step_code: null }, { quiet: true, silent: true })
    emitChange('leads')
    notify(`${list.length} lead(s) voltaram para a base.`, 'ok')
  }

  return (
    <div className="page">
      {bar}
      <div className="page-head"><div className="t"><h1>Nova lista no {CH_NAME[channel]}</h1><span className="lbl">Escolha o público e o local. Só esses leads entram na fila{ig ? ' (só quem tem @ do Instagram)' : ' (só quem tem telefone)'}.</span></div></div>
      <div className="prosp-start">
        <section className="card pad stack">
          <SystemPick leads={leads} P={P} pool={pool} channel={channel} onUse={(label) => setNiche(label)} />
          <div className="fields">
            <Field label="Público"><Select value={niche} onChange={(v) => setNiche(v || '')} placeholder="Escolha o público" options={niches.map((x) => [x.label, `${x.label} (${x.n})`])} /></Field>
            <Field label="Cidade"><Select value={city} onChange={(v) => setCity(v || '')} placeholder="Todas as cidades" options={cities.map((x) => [x.label, `${x.label} (${x.n})`])} /></Field>
            <Field label="Bairro"><Select value={hood} onChange={(v) => setHood(v || '')} placeholder="Todos os bairros" options={hoods.map((x) => [x.label, `${x.label} (${x.n})`])} disabled={!city} /></Field>
            <Field label="Quantos leads"><input type="number" min="1" className="in num" value={n} onChange={(e) => setN(Number(e.target.value) || 0)} /></Field>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="lbl">{avail.length ? `${avail.length} lead(s) ${ig ? 'com Instagram ' : ''}disponíveis com esse filtro, nunca puxados para a fila.` : niche ? 'Nenhum lead disponível com esse filtro. Capte mais em Captação.' : niches.length ? 'Escolha um público para começar.' : ig ? 'Nenhum lead com Instagram ainda. Capte em Captação → Onde captar: Instagram.' : 'Escolha um público para começar.'}</span>
            <AsyncButton className="btn p" disabled={!niche || !avail.length || n < 1} onClick={start}><Icon name="play" size={14} />Iniciar prospecção ({Math.min(n, avail.length)})</AsyncButton>
          </div>
        </section>

        <div className="stack">
          <PotencialProsp leads={leads} />
          {returns.length ? (
            <section className="card pad stack-s">
              <h2>Retornos para hoje</h2>
              <span className="lbl">{returns.length} lead(s) já contatados aguardando follow-up ou resposta sua.</span>
              <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => onStart({ kind: 'retornos', channel, at: Date.now() })}>Fazer os retornos</button>
            </section>
          ) : null}
          {groups.length ? (
            <section className="card pad stack-s">
              <h2>Fila já puxada</h2>
              <span className="lbl">Leads que já estavam na sua fila e ainda não receberam o primeiro contato.</span>
              {groups.map((g) => (
                <div key={g.niche + g.city} className="li" style={{ flexWrap: 'wrap' }}>
                  <span className="grow" style={{ minWidth: 140 }}><strong style={{ fontWeight: 500 }}>{g.niche || 'Sem público'}</strong><span className="lbl"> · {g.city || 'sem cidade'} · {g.leads.length}</span></span>
                  <div className="row">
                    <button type="button" className="btn s" onClick={() => onStart({ kind: 'nova', channel, niche: g.niche, city: g.city, neighborhood: '', at: Date.now() })}>Continuar</button>
                    <AsyncButton className="btn s g" onClick={() => giveBack(g.leads)}>Devolver para a base</AsyncButton>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ---------- os dois canais lado a lado ----------
function chStatus(p, hasList, left) {
  if (!hasList) return ['Sem lista', 'off']
  if (p.status === 'dia') return ['Limite do dia', 'off']
  if (p.status === 'livre') return [left ? 'Pode enviar' : 'Lista concluída', left ? 'ok' : 'off']
  return [`${p.status === 'intervalo' ? 'Próxima em' : 'Pausa'} ${mmss(p.waiting)}`, 'wait']
}
function ChannelBar({ channel, onChange, sesBy, pacers, left }) {
  return (
    <div className="ch-bar" role="tablist" aria-label="Canal de prospecção">
      {['whatsapp', 'instagram'].map((ch) => {
        const [txt, kind] = chStatus(pacers[ch], Boolean(sesBy[ch]), left[ch])
        return (
          <button key={ch} type="button" role="tab" aria-selected={channel === ch} className={`ch-tab ${channel === ch ? 'on' : ''}`} onClick={() => onChange(ch)}>
            <Icon name={ch === 'instagram' ? 'ig' : 'wa'} size={18} />
            <span className="stack-s" style={{ gap: 1, minWidth: 0, textAlign: 'left' }}>
              <strong>{CH_NAME[ch]}</strong>
              <span className="lbl ellipsis">{sesBy[ch] ? `${sesLabel(sesBy[ch])} · ${left[ch]} na fila` : 'Toque para começar uma lista'}</span>
            </span>
            <span className={`ch-pill ${kind}`}>{txt}</span>
          </button>
        )
      })}
    </div>
  )
}
// enquanto um canal está em pausa, convida para usar o outro
function PauseTip({ channel, pacer, other, otherHasList, onGo }) {
  if (!['pausa', 'hora', 'dia'].includes(pacer.status)) return null
  const otherName = CH_NAME[channel === 'instagram' ? 'whatsapp' : 'instagram']
  const free = other.status === 'livre'
  return (
    <div className="pause-tip">
      <Icon name="clock" size={16} />
      <span className="grow">
        <b>{CH_NAME[channel]} {pacer.status === 'dia' ? 'chegou ao limite de hoje' : `em pausa por ${mmss(pacer.waiting)}`}.</b>{' '}
        {free ? (otherHasList ? `Aproveite e mande no ${otherName} enquanto isso. Quando a pausa acabar, o alarme toca.` : `Que tal começar uma lista no ${otherName} enquanto isso?`) : `O ${otherName} também está esperando: aproveite para responder quem falou com você.`}
      </span>
      {free ? <button type="button" className="btn s p" onClick={onGo}>Ir para o {otherName}<Icon name="arrow" size={13} /></button> : null}
    </div>
  )
}

// ---------- ainda pela frente ----------
function PotencialProsp({ leads }) {
  const { data } = useData(async () => {
    const [terms, acts] = await Promise.all([
      fetchRows('search_terms', { select: 'id, uf, city, done, leads_found', order: null }).catch(() => []),
      fetchRows('activities', { select: 'lead_id, type, result', order: null }).catch(() => []),
    ])
    return { terms, acts }
  }, ['search_terms', 'activities'], [])
  if (!data) return null
  return <Potencial terms={data.terms} leads={leads} acts={data.acts} compact />
}

// ---------- o sistema escolhe o público ----------
const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const pctTx = fmtPct
const PICK_KEY = 'zk.prospeccao.modo'

function SystemPick({ leads, P, pool, channel, onUse }) {
  const [mode, setModeState] = useState(() => { try { return localStorage.getItem(PICK_KEY) || 'vender' } catch { return 'vender' } })
  const setMode = (m) => { setModeState(m); setIdx(0); try { localStorage.setItem(PICK_KEY, m) } catch { /* sem storage */ } }
  const [idx, setIdx] = useState(0)
  const [table, setTable] = useState(false)
  const { data, error } = useData(async () => {
    const [activities, clients, contracts] = await Promise.all([
      fetchRows('activities', { select: 'lead_id, type, result', order: null }),
      fetchRows('clients', { select: 'id, lead_id, niche', order: null }).catch(() => []),
      fetchRows('contracts', { select: 'client_id, kind, total_cents, monthly_cents', order: null }).catch(() => []),
    ])
    return { activities, clients, contracts }
  }, ['activities', 'clients', 'contracts'], [])

  const stats = useMemo(() => (data ? nicheStats({ leads, P, ...data }) : null), [data, leads, P])
  const avail = useMemo(() => {
    const m = new Map()
    pool.forEach((l) => { const k = nicheKey(l.niche); if (k) m.set(k, (m.get(k) || 0) + 1) })
    return m
  }, [pool])
  const ranked = useMemo(() => (stats ? rankNiches(stats, mode, avail, today()) : []), [stats, mode, avail])
  const sets = useMemo(() => {
    const r = new Set(), c = new Set()
    ;(data?.activities || []).forEach((a) => { if (!a.lead_id) return; if (a.result === 'respondeu') r.add(a.lead_id); if (['whatsapp', 'ligacao', 'email', 'visita'].includes(a.type)) c.add(a.lead_id) })
    return { replied: r, contacted: c }
  }, [data])

  if (error) return null
  if (!stats) return <div className="card pick"><span className="lbl">Calculando o desempenho de cada público…</span></div>
  const s = ranked.length ? ranked[idx % ranked.length] : null
  const n = s ? avail.get(s.key) || 0 : 0
  const label = s && n ? (pool.find((l) => nicheKey(l.niche) === s.key)?.niche || s.name) : ''
  const lv = s ? LEVEL[s.level] : null
  // onde captar esse público: sugestão de local (espalha para fora de um polo só)
  const home = s && !n ? rankPlaces({ leads, ...sets, niche: s.name, day: today() }).list[0] || { city: '', uf: '' } : { city: '', uf: '' }
  const capUrl = s ? `/erp/captacao?${new URLSearchParams({ niche: s.name, city: home.city, uf: home.uf || 'SP' })}` : ''

  return (
    <div className="card pick">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="stack-s" style={{ gap: 2 }}>
          <span className="lbl"><Icon name="spark" size={12} /> Deixar o sistema escolher</span>
          <span className="lbl">{MODES.find((m) => m[0] === mode)?.[2]}</span>
        </div>
        <Seg value={mode} onChange={setMode} options={MODES.map(([k, l]) => [k, l])} />
      </div>
      {s ? (
        <div className="pick-body" key={s.key + mode}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div className="stack-s" style={{ gap: 4, minWidth: 0 }}>
              <span className="lbl">{idx === 0 ? 'Sugestão de hoje' : `Opção ${(idx % ranked.length) + 1} de ${ranked.length}`} · {s.area}</span>
              <strong className="pick-name">{s.name}</strong>
              <div className="row" style={{ gap: 6 }}>
                <Badge>{KIND_LABEL[s.kind]}</Badge>
                <Badge kind={lv[1]} title={lv[2]}>{lv[0]}</Badge>
                {n ? <Badge kind="g">{n} lead(s) prontos{channel === 'instagram' ? ' com @' : ''}</Badge> : <Badge kind="y">sem leads na base</Badge>}
              </div>
            </div>
          </div>
          <ul className="pick-why">{reasons(s, stats.global, mode).map((r) => <li key={r}>{r}</li>)}</ul>
          {s.pair ? <span className="lbl">Compare com <b style={{ fontWeight: 500, color: 'var(--tx)' }}>{s.pair}</b> ({KIND_LABEL[s.kind === 'empresa' ? 'profissional' : 'empresa'].toLowerCase()}): o sistema mostra qual dos dois responde e compra mais.</span> : null}
          <div className="row" style={{ gap: 8 }}>
            {n ? <button type="button" className="btn p" onClick={() => onUse(label)}><Icon name="check" size={14} />Usar este público</button>
              : <Link className="btn p" to={capUrl}><Icon name="search" size={14} />Captar {s.name}{home.city ? ` em ${home.city} - ${home.uf}` : ''}</Link>}
            <button type="button" className="btn" onClick={() => setIdx((i) => i + 1)}>Outra opção</button>
            <button type="button" className="btn g" onClick={() => setTable(true)}>Ranking dos públicos</button>
          </div>
        </div>
      ) : (
        <p className="lbl" style={{ margin: 0 }}>{mode === 'dificil' ? `Ainda nenhum público tem ${MIN_DATA} contatos registrados. Prospecte mais e o sistema descobre quem é difícil.` : 'Nenhum público para sugerir.'}</p>
      )}
      {table ? <RankingModal stats={stats} avail={avail} onClose={() => setTable(false)} /> : null}
    </div>
  )
}

function RankingModal({ stats, avail, onClose }) {
  const [all, setAll] = useState(false)
  const [sort, setSort] = useState(stats.global.ticket ? 'perContact' : 'contacted')
  const list = stats.list.filter((s) => all || s.leads || s.wonAll)
    .sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1) || b.contacted - a.contacted)
  const g = stats.global
  const th = (k, l) => <th className="r" style={{ cursor: 'pointer', color: sort === k ? 'var(--tx)' : undefined }} onClick={() => setSort(k)}>{l}{sort === k ? ' ↓' : ''}</th>
  return (
    <Modal size="lg" title="Ranking dos públicos" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Fechar</button>}>
      <div className="stack">
        <p className="lbl" style={{ margin: 0, lineHeight: 1.6 }}>
          Tudo calculado com o que você registrou: contatos, respostas, vendas e o valor dos contratos em 12 meses.
          Média geral: {pctTx(g.reply)} de resposta{g.ticket ? ` · ticket ${brl(g.ticket)}` : ''}. O nível só aparece depois de {MIN_DATA} contatos no público e {MIN_REPLIES} respostas registradas no total ({stats.global.replied} até agora).
          Para o ranking ficar certo, marque <b>Respondeu</b> (tecla 2) sempre que alguém responder e cadastre o valor do contrato quando fechar.
        </p>
        <div className="pick-kinds">
          {stats.kinds.map((k) => (
            <div key={k.kind} className="card" style={{ padding: '10px 14px' }}>
              <span className="lbl">{k.kind === 'profissional' ? 'Profissionais (quem decide)' : 'Empresas (clínicas, escritórios)'}</span>
              <div className="row" style={{ gap: 14 }}>
                <span><b className="num">{pctTx(k.reply)}</b> <span className="lbl">resposta · {k.contacted} contatos</span></span>
                <span><b className="num">{k.won}</b> <span className="lbl">venda(s) · {brl(k.value)}</span></span>
              </div>
            </div>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />Mostrar o catálogo inteiro ({stats.list.length} públicos)</label>
        <div className="tbl-wrap" style={{ maxHeight: 420 }}><table className="tbl">
          <thead><tr><th>Público</th><th>Tipo</th><th>Nível</th>{th('leads', 'Leads')}<th className="r">Prontos</th>{th('contacted', 'Contatados')}{th('replyRate', 'Resposta')}{th('wonAll', 'Vendas')}{th('value', 'Valor 12m')}{th('perContact', 'R$/contato')}</tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.key}>
                <td className="ellipsis" style={{ maxWidth: 220 }}>{s.name}</td>
                <td className="lbl">{KIND_LABEL[s.kind]}</td>
                <td><Badge kind={LEVEL[s.level][1]} title={LEVEL[s.level][2]}>{LEVEL[s.level][0]}</Badge></td>
                <td className="num r">{s.leads}</td>
                <td className="num r">{avail.get(s.key) || 0}</td>
                <td className="num r">{s.contacted}</td>
                <td className="num r">{pctTx(s.replyRate)}</td>
                <td className="num r">{s.wonAll}</td>
                <td className="num r">{s.value ? brl(s.value) : '—'}</td>
                <td className="num r">{s.contacted && g.ticket ? brl(s.perContact) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </Modal>
  )
}

// ---------- encerrar a prospecção atual ----------
function EndModal({ ses, leads, onClose, onEnd }) {
  const left = ses?.kind === 'retornos' ? [] : leads.filter(firstPending)
  const [giveBack, setGiveBack] = useState(true)
  return (
    <div className="erp-overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal sm" role="dialog" aria-label="Encerrar prospecção">
        <div className="modal-h"><h2 style={{ fontSize: 15 }}>Encerrar prospecção</h2><button type="button" className="btn ic s g" aria-label="Fechar" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-b">
          <p style={{ lineHeight: 1.55 }}>Encerrar <strong>{sesLabel(ses)}</strong> e voltar para a escolha de público e local?</p>
          {left.length ? (
            <label className="check"><input type="checkbox" checked={giveBack} onChange={(e) => setGiveBack(e.target.checked)} />Devolver para a base os {left.length} lead(s) que ainda não receberam o primeiro contato</label>
          ) : null}
          <span className="lbl">Quem você já contatou continua com o follow-up agendado normalmente.</span>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Continuar prospectando</button>
          <AsyncButton className="btn p" onClick={async () => {
            if (giveBack && left.length) {
              for (const l of left) await update('leads', l.id, { next_step_at: null, next_step: null, next_step_code: null }, { quiet: true, silent: true })
              emitChange('leads')
            }
            onEnd()
          }}>Encerrar</AsyncButton>
        </div>
      </div>
    </div>
  )
}

// ---------- ritmo de envio ----------
function PacerCard({ pacer, isIg }) {
  const PRESETS = pacer.presets
  const [open, setOpen] = useState(false)
  const { cfg, status, waiting } = pacer
  const big = status === 'pausa' || status === 'hora'
  const title = status === 'livre' ? 'Pode enviar' : status === 'intervalo' ? 'Intervalo entre mensagens' : status === 'pausa' ? 'Pausa do bloco' : status === 'hora' ? 'Limite da hora atingido' : 'Limite de hoje atingido'
  return (
    <div className={`card pacer pacer-${status}`}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', gap: 12 }}>
        <div className="stack-s" style={{ gap: 2, minWidth: 0 }}>
          <span className="lbl">Ritmo {isIg ? 'do Direct' : 'do WhatsApp'} · {PRESETS[pacer.preset]?.label}</span>
          <strong className="pacer-title">{title}</strong>
        </div>
        {status !== 'livre' && status !== 'dia' ? <span className={`num pacer-clock ${big ? 'big' : ''}`}>{mmss(waiting)}</span> : null}
      </div>
      {big ? <p className="lbl" style={{ margin: 0 }}>Quando o cronômetro zerar, toca um alarme. Pode usar o outro canal enquanto isso.</p> : null}
      {status === 'dia' ? <p className="lbl" style={{ margin: 0 }}>Você chegou a {cfg.perDay} primeiros contatos hoje. Respostas de quem já falou com você continuam liberadas.</p> : null}
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="lbl">Hoje <b className="num" style={{ color: 'var(--tx)' }}>{pacer.today} de {cfg.perDay}</b> · pausa a cada {cfg.perBlock} ({pacer.blockCount} feitas)</span>
        <button type="button" className="btn s g" onClick={() => setOpen((o) => !o)}><Icon name="sliders" size={13} />{open ? 'Fechar' : 'Ajustes'}</button>
      </div>
      {open ? (
        <div className="stack-s pacer-presets">
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn s g" onClick={pacer.testPing} title="Toca quando acaba o intervalo entre uma mensagem e outra">Testar pim</button>
            <button type="button" className="btn s g" onClick={pacer.testAlarm} title="Toca quando acaba a pausa do bloco"><Icon name="bell" size={13} />Testar alarme</button>
            {status !== 'livre' && status !== 'dia' ? <button type="button" className="btn s g" onClick={pacer.skipWait}>Liberar agora</button> : null}
          </div>
          <span className="lbl">Última hora: {pacer.lastHour} de {cfg.perHour}</span>
          {Object.entries(PRESETS).map(([k, p]) => (
            <label key={k} className="check" style={{ alignItems: 'flex-start' }}>
              <input type="radio" name={`pacer-${pacer.channel}`} checked={pacer.preset === k} onChange={() => pacer.setPreset(k)} />
              <span><b style={{ fontWeight: 500 }}>{p.label}</b><br /><span className="lbl">{p.perBlock} por bloco · {p.gapMin}–{p.gapMax}s entre mensagens · pausa de {p.pauseMin} min · até {p.perHour}/hora e {p.perDay}/dia</span></span>
            </label>
          ))}
          <button type="button" className="btn s g" style={{ alignSelf: 'flex-start' }} onClick={pacer.resetDay}>Zerar contagem de hoje</button>
        </div>
      ) : null}
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
