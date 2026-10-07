import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, updateWhere, notify, emitChange, getSettings } from '../lib/data'
import { getPipelines, defaultLeadStage } from '../lib/automations'
import { parseCsv, toCsv, download, LEAD_FIELDS, guessField, yes } from '../lib/csv'
import { today, dm, relDay, daysSince, igHandle, igLink, normalizePhone, toCents, brl0, localDay } from '../lib/format'
import { PageHead, Tabs, Loading, ErrorBox, Modal, Field, Select, AsyncButton, Badge, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'

const PAGE = 50

function stageBadge(st) {
  if (!st) return null
  const kind = st.kind === 'won' || st.kind === 'handoff' ? 'g' : st.kind === 'lost' ? 'r' : st.sort >= 3 ? 'y' : st.sort === 2 ? 'bl' : ''
  return <Badge kind={kind}>{st.name}</Badge>
}

export default function Leads() {
  useMeta('Comercial', 'Leads')
  const auth = useAuth()
  const erp = useErp()
  const nav = useNavigate()
  const confirm = useConfirm()
  const [sp, setSp] = useSearchParams()
  const view = sp.get('view') || 'todos'
  const [q, setQ] = useState('')
  const [f, setF] = useState({ niche: '', neighborhood: '', stage: '', owner: '', origin: '', site: '' })
  const [sort, setSort] = useState('next')
  const [sel, setSel] = useState(new Set())
  const [page, setPage] = useState(0)
  const [importing, setImporting] = useState(false)
  const [bulk, setBulk] = useState(null)

  const { data, loading, error, reload } = useData(async () => {
    const [P, leads] = await Promise.all([getPipelines(), fetchRows('leads', { limit: 5000, archived: view === 'perdidos' })])
    return { P, leads }
  }, ['leads', 'pipeline_stages'], [view])

  useEffect(() => { setPage(0); setSel(new Set()) }, [view, q, f, sort])

  const t = today()
  const list = useMemo(() => {
    if (!data) return []
    const { P } = data
    const kind = (l) => P.stage(l.stage_id)?.kind
    let r = data.leads
    if (view === 'meus') r = r.filter((l) => l.owner_id === auth.uid)
    if (view === 'sem-dono') r = r.filter((l) => !l.owner_id && kind(l) === 'open')
    if (view === 'hoje') r = r.filter((l) => kind(l) === 'open' && l.next_step_at && l.next_step_at <= t)
    if (view === 'sem-passo') r = r.filter((l) => kind(l) === 'open' && !l.next_step_at)
    if (view === 'parados') r = r.filter((l) => kind(l) === 'open' && daysSince(localDay(l.stage_changed_at)) > 7 && (!l.last_contact_at || daysSince(localDay(l.last_contact_at)) > 7))
    if (view === 'perdidos') r = r.filter((l) => kind(l) === 'lost' || l.archived_at)
    if (view === 'todos') r = r.filter((l) => !l.archived_at)
    if (q.trim()) {
      const s = q.trim().toLowerCase(), d = q.replace(/\D/g, '')
      r = r.filter((l) => [l.company, l.instagram, l.niche, l.neighborhood, l.origin].some((v) => (v || '').toLowerCase().includes(s)) || (d.length >= 4 && (l.phone || '').replace(/\D/g, '').includes(d)))
    }
    if (f.niche) r = r.filter((l) => l.niche === f.niche)
    if (f.neighborhood) r = r.filter((l) => l.neighborhood === f.neighborhood)
    if (f.stage) r = r.filter((l) => l.stage_id === f.stage)
    if (f.owner) r = r.filter((l) => (f.owner === 'none' ? !l.owner_id : l.owner_id === f.owner))
    if (f.origin) r = r.filter((l) => l.origin === f.origin)
    if (f.site) r = r.filter((l) => (f.site === 'sim' ? l.has_site : !l.has_site))
    const by = {
      next: (a, b) => (a.next_step_at || '9999') < (b.next_step_at || '9999') ? -1 : 1,
      last: (a, b) => (b.last_contact_at || '') .localeCompare(a.last_contact_at || ''),
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      value: (a, b) => (b.estimated_value_cents || 0) - (a.estimated_value_cents || 0),
      name: (a, b) => a.company.localeCompare(b.company),
    }
    return [...r].sort(by[sort])
  }, [data, view, q, f, sort, auth.uid, t])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const { P, leads } = data
  const uniq = (k) => Array.from(new Set(leads.map((l) => l[k]).filter(Boolean))).sort()
  const counts = {
    todos: leads.filter((l) => !l.archived_at).length,
    meus: leads.filter((l) => l.owner_id === auth.uid && !l.archived_at).length,
    'sem-dono': leads.filter((l) => !l.owner_id && P.stage(l.stage_id)?.kind === 'open').length,
    hoje: leads.filter((l) => P.stage(l.stage_id)?.kind === 'open' && l.next_step_at && l.next_step_at <= t).length,
  }
  const pageRows = list.slice(page * PAGE, page * PAGE + PAGE)
  const allSel = pageRows.length && pageRows.every((l) => sel.has(l.id))
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ids = Array.from(sel)

  const bulkApply = async (patch, msg) => {
    await updateWhere('leads', (qq) => qq.in('id', ids), patch)
    notify(msg, 'ok'); setSel(new Set()); setBulk(null)
  }
  const exportCsv = () => {
    const rows = list.map((l) => [l.company, l.niche, l.neighborhood, l.phone, igHandle(l.instagram), l.has_site ? 'Sim' : 'Não', l.origin,
      P.stage(l.stage_id)?.name, auth.memberName(l.owner_id), localDay(l.last_contact_at), l.next_step_at, l.next_step, (l.estimated_value_cents || 0) / 100])
    download(`leads-${t}.csv`, toCsv(['Empresa', 'Nicho', 'Bairro', 'WhatsApp', 'Instagram', 'Tem site', 'Origem', 'Etapa', 'Responsável', 'Último contato', 'Próximo passo em', 'Próximo passo', 'Valor estimado'], rows))
  }
  const chip = (key, label, options) => (
    <label className={`chip ${f[key] ? 'on' : ''}`}>
      <span>{label}</span>
      <select value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} aria-label={label}>
        <option value="">todos</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )

  return (
    <div className="page">
      <PageHead title={<>Leads <span className="num mut" style={{ fontSize: 15, fontWeight: 400 }}>{counts.todos}</span></>}
        sub="Empresas e contatos em prospecção. Todo lead precisa de um próximo passo com data.">
        {auth.canEdit('crm') ? <button type="button" className="btn" onClick={() => setImporting(true)}><Icon name="upload" size={14} />Importar planilha</button> : null}
        <button type="button" className="btn" onClick={exportCsv}><Icon name="download" size={14} />Exportar CSV</button>
        {auth.canEdit('crm') ? <button type="button" className="btn p" onClick={() => erp.openQuick('lead')}>Novo lead</button> : null}
      </PageHead>

      <Tabs value={view} onChange={(v) => setSp(v === 'todos' ? {} : { view: v })} options={[
        ['todos', 'Todos', counts.todos], ['meus', 'Meus', counts.meus], ['sem-dono', 'Sem dono', counts['sem-dono']],
        ['hoje', 'Follow-up hoje', counts.hoje], ['sem-passo', 'Sem próximo passo'], ['parados', 'Parados 7+ dias'], ['perdidos', 'Perdidos e arquivados'],
      ]} />

      <div className="row">
        <label style={{ width: 260 }}><span className="sr">Buscar</span><input className="in" placeholder="Buscar nome, telefone, Instagram…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {chip('niche', 'Nicho', uniq('niche').map((v) => [v, v]))}
        {chip('neighborhood', 'Bairro', uniq('neighborhood').map((v) => [v, v]))}
        {chip('stage', 'Etapa', P.pipelines.flatMap((p) => P.of(p.id).map((s) => [s.id, `${p.name} · ${s.name}`])))}
        {chip('owner', 'Responsável', [['none', 'sem dono'], ...auth.members.map((m) => [m.id, m.name])])}
        {chip('origin', 'Origem', uniq('origin').map((v) => [v, v]))}
        {chip('site', 'Site', [['sim', 'tem site'], ['nao', 'sem site']])}
        <span className="grow" />
        <label className="lbl row" style={{ gap: 8 }}>Ordenar
          <Select value={sort} onChange={(v) => setSort(v || 'next')} options={[['next', 'Próximo passo'], ['last', 'Último contato'], ['new', 'Mais novos'], ['value', 'Maior valor'], ['name', 'Nome']]} style={{ width: 170 }} />
        </label>
      </div>

      {sel.size ? (
        <div className="note g row">
          <span><b className="num" style={{ fontWeight: 500 }}>{sel.size}</b> selecionado(s)</span>
          {auth.isTotal('crm') ? <button type="button" className="btn s" onClick={() => setBulk('owner')}>Atribuir a…</button> : null}
          <button type="button" className="btn s" onClick={() => setBulk('stage')}>Mover etapa</button>
          <AsyncButton className="btn s" onClick={() => bulkApply({ next_step_at: t, next_step: 'Contato (M1)', next_step_code: 'M1' }, 'Adicionados à fila de hoje.')}>Adicionar à fila de hoje</AsyncButton>
          {!auth.isTotal('crm') ? <AsyncButton className="btn s" onClick={() => bulkApply({ owner_id: auth.uid }, 'Leads assumidos.')}>Assumir</AsyncButton> : null}
          <AsyncButton className="btn s" onClick={async () => {
            if (await confirm(`Arquivar ${sel.size} lead(s)? Eles somem das listas, mas continuam no histórico.`, { ok: 'Arquivar', danger: true })) {
              await bulkApply({ archived_at: new Date().toISOString() }, 'Arquivados.')
            }
          }}>Arquivar</AsyncButton>
          <button type="button" className="btn s g" onClick={() => setSel(new Set())}>Limpar</button>
        </div>
      ) : null}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr>
            <th><input type="checkbox" aria-label="Selecionar todos da página" checked={!!allSel}
              onChange={() => setSel((s) => { const n = new Set(s); pageRows.forEach((l) => (allSel ? n.delete(l.id) : n.add(l.id))); return n })} /></th>
            <th>Empresa</th><th>Nicho</th><th>Bairro</th><th>WhatsApp</th><th>Instagram</th><th>Site?</th><th>Origem</th><th>Etapa</th><th>Responsável</th><th>Último contato</th><th>Próximo passo</th>
          </tr></thead>
          <tbody>
            {pageRows.map((l) => {
              const st = P.stage(l.stage_id)
              const late = st?.kind === 'open' && l.next_step_at && l.next_step_at < t, isToday = st?.kind === 'open' && l.next_step_at === t
              return (
                <tr key={l.id} className={`click ${sel.has(l.id) ? 'on' : ''}`} onClick={(e) => { if (!e.target.closest('input,a,button')) nav(`/erp/leads/${l.id}`) }}>
                  <td><input type="checkbox" aria-label={`Selecionar ${l.company}`} checked={sel.has(l.id)} onChange={() => toggle(l.id)} /></td>
                  <td style={{ fontWeight: 500 }} className="ellipsis"><Link to={`/erp/leads/${l.id}`} style={{ color: 'var(--tx)' }}>{l.company}</Link></td>
                  <td>{l.niche || '—'}</td>
                  <td>{l.neighborhood || '—'}</td>
                  <td className="num">{l.phone || '—'}</td>
                  <td>{l.instagram ? <a href={igLink(l.instagram)} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{igHandle(l.instagram)}</a> : '—'}</td>
                  <td>{l.has_site === null || l.has_site === undefined ? '—' : l.has_site ? 'Sim' : 'Não'}</td>
                  <td>{l.origin || '—'}</td>
                  <td>{stageBadge(st)}{l.lost_reason && st?.kind === 'lost' ? <span className="lbl"> {l.lost_reason}</span> : null}</td>
                  <td style={!l.owner_id ? { color: 'var(--mut)' } : undefined}>{l.owner_id ? auth.memberName(l.owner_id) : 'sem dono'}</td>
                  <td className="num">{l.last_contact_at ? relDay(localDay(l.last_contact_at)) : '—'}</td>
                  <td className="num" style={{ color: late ? 'var(--red)' : isToday ? 'var(--yel)' : undefined }}>
                    {st?.kind !== 'open' ? '—' : l.next_step_at ? `${late ? 'atrasado · ' : ''}${relDay(l.next_step_at)}${l.next_step_code ? ` · ${l.next_step_code}` : ''}` : <span style={{ color: 'var(--red)' }}>definir</span>}
                  </td>
                </tr>
              )
            })}
            {!pageRows.length ? <tr><td colSpan={12}><div className="empty">Nenhum lead nesta visão.{auth.canEdit('crm') ? <button type="button" className="btn s" onClick={() => setImporting(true)}>Importar planilha</button> : null}</div></td></tr> : null}
          </tbody>
        </table></div>
        <div className="tbl-foot">
          <span>Mostrando {list.length ? page * PAGE + 1 : 0}–{Math.min(list.length, (page + 1) * PAGE)} de {list.length}</span>
          <div className="row">
            <button type="button" className="btn s" disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button>
            <button type="button" className="btn s" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)}>Próxima</button>
          </div>
        </div>
      </div>

      {importing ? <ImportModal P={P} leads={leads} onClose={() => setImporting(false)} /> : null}
      {bulk === 'owner' ? (
        <Modal size="sm" title={`Atribuir ${sel.size} lead(s)`} onClose={() => setBulk(null)}>
          <div className="stack-s">
            <button type="button" className="btn" onClick={() => bulkApply({ owner_id: null }, 'Leads sem dono.')}>Deixar sem dono</button>
            {auth.members.map((m) => <AsyncButton key={m.id} className="btn" onClick={() => bulkApply({ owner_id: m.id }, `Atribuídos a ${m.name}.`)}>{m.name}</AsyncButton>)}
          </div>
        </Modal>
      ) : null}
      {bulk === 'stage' ? (
        <Modal size="sm" title={`Mover ${sel.size} lead(s)`} onClose={() => setBulk(null)}>
          <div className="stack-s">
            {P.pipelines.map((p) => (
              <div key={p.id} className="stack-s">
                <span className="lbl">{p.name}</span>
                <div className="row">{P.of(p.id).map((s) => <AsyncButton key={s.id} className="btn s" onClick={() => bulkApply({ stage_id: s.id, pipeline_id: p.id }, `Movidos para ${s.name}.`)}>{s.name}</AsyncButton>)}</div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

// ------------------------------------------------------------------
// Importação de planilha
// ------------------------------------------------------------------
function ImportModal({ P, leads, onClose }) {
  const auth = useAuth()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [parsed, setParsed] = useState(null)
  const [map, setMap] = useState([])
  const [mode, setMode] = useState('skip')
  const [owner, setOwner] = useState(auth.isTotal('crm') ? '' : auth.uid)
  const [niche, setNiche] = useState('')
  const [origin, setOrigin] = useState('')
  const [queueToday, setQueueToday] = useState(true)
  const [busy, setBusy] = useState(false)

  const readFile = (file) => {
    if (!file) return
    setName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const p = parseCsv(reader.result)
      setParsed(p); setMap(p.headers.map(guessField)); setStep(2)
    }
    reader.readAsText(file, 'utf-8')
  }
  const fromPaste = (txt) => {
    const p = parseCsv(txt)
    if (!p.headers.length) return notify('Não encontrei dados no texto colado.', 'err')
    setName('texto colado'); setParsed(p); setMap(p.headers.map(guessField)); setStep(2)
  }

  const records = useMemo(() => {
    if (!parsed) return []
    return parsed.rows.map((r) => {
      const o = {}
      map.forEach((fld, i) => { if (fld && r[i] !== undefined && r[i] !== '') o[fld] = o[fld] ? `${o[fld]} ${r[i]}` : r[i] })
      return o
    }).filter((o) => o.company || o.instagram || o.phone)
  }, [parsed, map])

  const index = useMemo(() => {
    const phones = new Map(), igs = new Map()
    leads.forEach((l) => {
      const p = normalizePhone(l.phone).slice(-8)
      if (p.length === 8) phones.set(p, l)
      const ig = igHandle(l.instagram).toLowerCase()
      if (ig) igs.set(ig, l)
    })
    return { phones, igs }
  }, [leads])
  const dupOf = (o) => {
    const p = normalizePhone(o.phone).slice(-8)
    return (p.length === 8 && index.phones.get(p)) || (o.instagram && index.igs.get(igHandle(o.instagram).toLowerCase())) || null
  }
  const dups = records.filter(dupOf)

  const run = async () => {
    setBusy(true)
    try {
      const st = await defaultLeadStage()
      const stageByName = (nm) => {
        if (!nm) return null
        const s = P.stages.find((x) => x.name.toLowerCase() === String(nm).toLowerCase())
        return s ? { stage_id: s.id, pipeline_id: s.pipeline_id } : null
      }
      const fresh = [], merges = []
      for (const o of records) {
        const d = dupOf(o)
        if (d && mode === 'skip') continue
        const row = {
          company: o.company || igHandle(o.instagram) || o.phone,
          niche: o.niche || niche || null, neighborhood: o.neighborhood || null, city: o.city || 'São Paulo',
          phone: o.phone || null, instagram: o.instagram ? igHandle(o.instagram) : null, website: o.website || null,
          has_site: o.has_site !== undefined ? yes(o.has_site) || /^http|www\./i.test(o.has_site) : o.website ? true : null,
          origin: o.origin || origin || null, notes: o.notes || null,
          estimated_value_cents: o.estimated_value ? toCents(o.estimated_value) : 0,
        }
        if (d && mode === 'merge') {
          const patch = {}
          Object.entries(row).forEach(([k, v]) => { if (v && !d[k]) patch[k] = v })
          if (Object.keys(patch).length) merges.push([d.id, patch])
          continue
        }
        fresh.push({
          ...row, ...(stageByName(o.stage) || st), owner_id: owner || null, _contact: o.contact_name,
          ...(queueToday ? { next_step_at: today(), next_step: 'Primeiro contato (M1)', next_step_code: 'M1' } : {}),
        })
      }
      let created = 0
      for (let i = 0; i < fresh.length; i += 200) {
        const chunk = fresh.slice(i, i + 200)
        const rows = await insert('leads', chunk.map(({ _contact, ...r }) => r), { quiet: false })
        created += rows.length
        const contacts = rows.map((r, j) => (chunk[j]._contact ? { lead_id: r.id, name: chunk[j]._contact, phone: r.phone } : null)).filter(Boolean)
        if (contacts.length) await insert('contacts', contacts, { quiet: true })
      }
      for (const [id, patch] of merges) await updateWhere('leads', (qq) => qq.eq('id', id), patch, { quiet: true })
      emitChange('leads')
      notify(`${created} lead(s) criados${merges.length ? `, ${merges.length} mesclados` : ''}${mode === 'skip' && dups.length ? `, ${dups.length} duplicados pulados` : ''}.`, 'ok')
      onClose()
    } finally { setBusy(false) }
  }

  return (
    <Modal size="lg" title="Importar planilha de leads" onClose={onClose}
      footer={step === 1 ? <button type="button" className="btn" onClick={onClose}>Cancelar</button> : (
        <>
          <button type="button" className="btn" onClick={() => setStep(step - 1)}>Voltar</button>
          {step === 2 ? <button type="button" className="btn p" disabled={!map.includes('company') && !map.includes('instagram')} onClick={() => setStep(3)}>Revisar duplicados</button>
            : <button type="button" className="btn p" disabled={busy} onClick={run}>{busy ? 'Importando…' : `Importar ${mode === 'skip' ? records.length - dups.length : records.length} lead(s)`}</button>}
        </>
      )}>
      <div className="row lbl" style={{ gap: 8 }}>
        <span style={{ color: step >= 1 ? 'var(--green-tx)' : undefined }}>1 Arquivo</span>→
        <span style={{ color: step >= 2 ? 'var(--green-tx)' : undefined }}>2 Colunas</span>→
        <span style={{ color: step >= 3 ? 'var(--green-tx)' : undefined }}>3 Duplicados e confirmação</span>
      </div>

      {step === 1 ? (
        <div className="stack">
          <p className="lbl" style={{ lineHeight: 1.6 }}>No Google Sheets: Arquivo → Fazer download → CSV. Ou copie as células (com o cabeçalho) e cole abaixo. O arquivo é lido no seu navegador; nada é enviado além dos dados dos leads.</p>
          <label className="btn" style={{ width: 'max-content' }}>
            <Icon name="upload" size={14} /> Escolher arquivo .csv
            <input type="file" accept=".csv,.tsv,.txt,text/csv" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
          </label>
          <Field label="Ou cole aqui">
            <textarea className="ta num" rows={8} placeholder={'Empresa\tNome do contato\tCidade/Bairro\tTelefone/WhatsApp\tInstagram\tSite atual?\tOnde achei'}
              onPaste={(e) => { const tx = e.clipboardData.getData('text'); if (tx) { e.preventDefault(); fromPaste(tx) } }} />
          </Field>
        </div>
      ) : null}

      {step === 2 && parsed ? (
        <div className="stack">
          <span style={{ fontSize: 13 }}>{name} · <span className="num">{records.length}</span> linhas com dados</span>
          <div className="tbl-wrap" style={{ maxHeight: 340 }}><table className="tbl">
            <thead><tr><th>Coluna da planilha</th><th>Exemplo</th><th>Vai para o campo</th></tr></thead>
            <tbody>
              {parsed.headers.map((h, i) => (
                <tr key={h + i}>
                  <td>{h || <span className="lbl">(sem nome)</span>}</td>
                  <td className="lbl ellipsis" style={{ maxWidth: 200 }}>{parsed.rows[0]?.[i]}</td>
                  <td><Select value={map[i]} onChange={(v) => setMap((m) => m.map((x, j) => (j === i ? v || '' : x)))} options={LEAD_FIELDS} style={{ width: 220 }} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="fields">
            <Field label="Nicho (se a planilha não tiver)"><input className="in" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex.: Dentista" /></Field>
            <Field label="Origem (se a planilha não tiver)"><input className="in" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex.: Instagram" /></Field>
            {auth.isTotal('crm') ? <Field label="Responsável"><Select value={owner} onChange={(v) => setOwner(v || '')} placeholder="sem dono (fila)" options={auth.members.map((m) => [m.id, m.name])} /></Field> : null}
          </div>
          <label className="check"><input type="checkbox" checked={queueToday} onChange={(e) => setQueueToday(e.target.checked)} />Colocar todos na fila de prospecção de hoje (mensagem M1)</label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="stack">
          {dups.length ? (
            <>
              <div className="note y">{dups.length} linha(s) têm telefone ou Instagram que já existem no CRM. Escolha o que fazer:</div>
              <div className="row">
                {[['skip', 'Pular duplicados'], ['merge', 'Mesclar (completar campos vazios)'], ['create', 'Criar mesmo assim']].map(([v, l]) => (
                  <label key={v} className={`chip ${mode === v ? 'on' : ''}`}><input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} style={{ accentColor: 'var(--green)' }} />{l}</label>
                ))}
              </div>
              <div className="tbl-wrap" style={{ maxHeight: 240 }}><table className="tbl">
                <thead><tr><th>Da planilha</th><th>Já existe como</th></tr></thead>
                <tbody>{dups.slice(0, 50).map((o, i) => <tr key={i}><td>{o.company || o.instagram}</td><td className="lbl">{dupOf(o)?.company}</td></tr>)}</tbody>
              </table></div>
            </>
          ) : <div className="note g">Nenhum duplicado encontrado. Pronto para importar {records.length} lead(s).</div>}
          {records[0] ? (
            <div className="lbl">Exemplo do primeiro: <span style={{ color: 'var(--tx)' }}>{records[0].company}</span>{records[0].phone ? ` · ${records[0].phone}` : ''}{records[0].instagram ? ` · ${igHandle(records[0].instagram)}` : ''}</div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}

export { brl0, dm, getSettings }
