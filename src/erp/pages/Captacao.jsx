import React, { useEffect, useMemo, useState } from 'react'
import { rankPlaces, placeReasons } from '../lib/locais'
import { CATALOG_NAMES } from '../lib/nichos'
import { Link, useSearchParams } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, upsert, update, updateWhere, notify, emitChange, useSettings } from '../lib/data'
import { defaultLeadStage } from '../lib/automations'
import { today, dm, igHandle, normalizePhone, pct } from '../lib/format'
import { yes } from '../lib/csv'
import {
  UFS, UF_NAME, knownHoods, regionOf, fetchCities, fold, locKey, termQuery, batchCode, buildPrompt, buildInstagramPrompt, hoodsPrompt,
  readResultFile, parseResult, matchTerm, NO_RESULT, COLS,
} from '../lib/captacao'
import { PageHead, Loading, ErrorBox, Bar, Badge, Select, AsyncButton, Field, Empty, Tabs, Modal, Stat } from '../components/ui'
import { Icon } from '../lib/icons'
import { supabase } from '../lib/supabase'

const TERM_COLS = 'id, niche, neighborhood, city, uf, region, done, done_at, leads_found, batch_id, reserved_at'

// termos são milhares: busca as páginas de 1000 em paralelo
const isIgBatch = (b) => (b?.terms || []).some((t) => t.source === 'instagram')

async function fetchTerms() {
  const base = () => supabase.from('search_terms').select(TERM_COLS).is('archived_at', null)
  const { count, error } = await supabase.from('search_terms').select('id', { count: 'exact', head: true }).is('archived_at', null)
  if (error) throw error
  const pages = Math.max(1, Math.ceil((count || 0) / 1000))
  const res = await Promise.all(Array.from({ length: pages }, (_, i) => base().order('id').range(i * 1000, i * 1000 + 999)))
  const bad = res.find((r) => r.error)
  if (bad) throw bad.error
  return res.flatMap((r) => r.data || [])
}
const CITY_WHOLE = '(cidade inteira)'
const hoodLabel = (h) => h || CITY_WHOLE

export default function Captacao() {
  useMeta('Comercial', 'Captação')
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'nova'
  const setTab = (t, extra = {}) => setSp({ tab: t, ...extra })
  const [importing, setImporting] = useState(null)

  const { data, loading, error, reload } = useData(async () => {
    const [terms, batches, leads, acts] = await Promise.all([
      fetchTerms(),
      fetchRows('capture_batches', { order: 'created_at', ascending: false, limit: 300 }),
      fetchRows('leads', { select: 'id, company, phone, instagram, niche, city, uf, neighborhood, search_term_id, last_contact_at, won_at, client_id', order: null }),
      fetchRows('activities', { select: 'lead_id, type, result', order: null }).catch(() => []),
    ])
    return { terms, batches, leads, acts }
  }, ['search_terms', 'capture_batches', 'leads', 'activities'])

  if (error) {
    const m = String(error.message || error)
    if (/capture_batches|column .*(city|uf)|search_terms\.(city|uf)/i.test(m)) return <div className="page"><Setup /></div>
    return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  }
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>

  const { terms, batches, leads } = data
  const done = terms.filter((t) => t.done).length
  const cities = new Set(terms.filter((t) => t.done).map((t) => locKey(t.city, t.uf))).size
  const captured = leads.filter((l) => l.search_term_id).length
  const waiting = batches.filter((b) => b.status === 'aguardando')

  return (
    <div className="page">
      <PageHead title="Captação de clientes" sub="Escolha nicho e local, copie o prompt para o Claude, importe a planilha que ele devolver. O sistema lembra o que já foi buscado." />
      <div className="card stats">
        <Stat label="Buscas feitas" value={`${done.toLocaleString('pt-BR')} / ${terms.length.toLocaleString('pt-BR')}`} sub={`${pct(done, terms.length)}% dos termos cadastrados`} />
        <Stat label="Cidades trabalhadas" value={cities} />
        <Stat label="Leads vindos de busca" value={captured.toLocaleString('pt-BR')} />
        <Stat label="Lotes aguardando importação" value={waiting.length} valueClass={waiting.length ? 'ok' : ''} />
      </div>

      <Tabs value={tab} onChange={(t) => setTab(t)} options={[['nova', 'Nova captação'], ['cobertura', 'Cobertura'], ['lotes', 'Lotes', batches.length || null]]} />

      {tab === 'nova' ? (
        <Nova key={`${sp.get('niche') || ''}|${sp.get('city') || ''}|${sp.get('uf') || ''}`} data={data}
          preset={{ niche: sp.get('niche') || '', city: sp.get('city') || '', uf: sp.get('uf') || '' }}
          onImport={(b) => setImporting(b)} />
      ) : tab === 'cobertura' ? (
        <Cobertura data={data} onCapture={(p) => setTab('nova', p)} />
      ) : (
        <Lotes data={data} onImport={(b) => setImporting(b)} />
      )}

      {importing ? <ImportModal batch={importing} data={data} onClose={() => setImporting(null)} /> : null}
    </div>
  )
}

function Setup() {
  return (
    <div className="card" style={{ padding: 22, maxWidth: 720 }}>
      <div className="stack">
        <h2>Falta um passo no banco</h2>
        <p style={{ lineHeight: 1.6 }}>A captação precisa de duas mudanças no Supabase: cidade/UF nos termos de busca e a tabela de lotes.</p>
        <ol style={{ lineHeight: 1.9, paddingLeft: 18 }}>
          <li>Abra o Supabase → <b>SQL Editor</b> → <b>New query</b>.</li>
          <li>Cole o conteúdo do arquivo <span className="num">supabase/erp-captacao.sql</span> (fica na pasta do site) e clique em <b>Run</b>.</li>
          <li>Volte aqui e recarregue a página.</li>
        </ol>
        <p className="lbl">Não apaga nada. Os termos que você já tinha continuam marcados, e as cidades da Grande SP passam a aparecer como cidades.</p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ status de cada local para um nicho
function useLocations(terms, batches, niche, city, uf, extra) {
  return useMemo(() => {
    const open = new Set(batches.filter((b) => b.status === 'aguardando').map((b) => b.id))
    const lk = locKey(city, uf)
    const here = terms.filter((t) => locKey(t.city, t.uf) === lk)
    const mine = new Map(here.filter((t) => fold(t.niche) === fold(niche)).map((t) => [fold(t.neighborhood), t]))
    const map = new Map()
    const add = (hood, region) => {
      const k = fold(hood)
      if (!map.has(k)) map.set(k, { neighborhood: hood, region: region || regionOf(city, uf, hood) || (hood ? 'Bairros' : 'Cidade'), term: mine.get(k) || null })
    }
    knownHoods(city, uf).forEach((h) => add(h.neighborhood, h.region))
    here.forEach((t) => add(t.neighborhood, t.region))
    extra.forEach((h) => add(h))
    if (!map.size || mine.has('')) add('')
    return Array.from(map.values()).map((l) => ({
      ...l,
      status: l.term?.done ? 'feito' : l.term?.batch_id && open.has(l.term.batch_id) ? 'lote' : 'falta',
    }))
  }, [terms, batches, niche, city, uf, extra])
}

// ------------------------------------------------------------------ Nova captação
function Nova({ data, preset, onImport }) {
  const auth = useAuth()
  const settings = useSettings()
  const { terms, batches, leads } = data
  const [niche, setNiche] = useState(preset.niche)
  const [uf, setUf] = useState(preset.uf || 'SP')
  const [city, setCity] = useState(preset.city || 'São Paulo')
  const [size, setSize] = useState(5)
  const [onlyNoSite, setOnlyNoSite] = useState(true)
  const [source, setSource] = useState('maps') // maps | instagram
  const [extra, setExtra] = useState([])
  const [newHoods, setNewHoods] = useState('')
  const [sel, setSel] = useState(null) // null = seleção automática
  const [cities, setCities] = useState([])
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    let alive = true
    fetchCities(uf).then((l) => alive && setCities(l)).catch(() => alive && setCities([]))
    return () => { alive = false }
  }, [uf])
  useEffect(() => { setSel(null); setExtra([]); setResult(null) }, [niche, city, uf])

  const niches = useMemo(() => {
    const m = new Map()
    ;[...(settings.niches || []), ...CATALOG_NAMES, ...terms.map((t) => t.niche), ...leads.map((l) => l.niche)].filter(Boolean).forEach((n) => { if (!m.has(fold(n))) m.set(fold(n), n) })
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [settings, terms, leads])
  const nicheName = niches.find((n) => fold(n) === fold(niche)) || niche.trim()
  const cityName = cities.find((c) => fold(c) === fold(city)) || city.trim()

  const locs = useLocations(terms, batches, nicheName, cityName, uf, extra)
  const auto = useMemo(() => locs.filter((l) => l.status === 'falta').slice(0, size).map((l) => fold(l.neighborhood)), [locs, size])
  const chosen = nicheName && cityName ? sel || auto : []
  const isSel = (l) => chosen.includes(fold(l.neighborhood))
  const toggle = (l) => {
    const k = fold(l.neighborhood)
    setSel(chosen.includes(k) ? chosen.filter((x) => x !== k) : [...chosen, k])
  }
  const counts = { feito: 0, lote: 0, falta: 0 }
  locs.forEach((l) => { counts[l.status]++ })
  const groups = useMemo(() => {
    const g = new Map()
    locs.forEach((l) => { if (!g.has(l.region)) g.set(l.region, []); g.get(l.region).push(l) })
    return Array.from(g.entries())
  }, [locs])
  const noHoods = !locs.some((l) => l.neighborhood)

  // outras cidades da UF onde esse nicho ainda tem busca pendente
  const elsewhere = useMemo(() => {
    if (!nicheName) return []
    const m = new Map()
    terms.filter((t) => t.uf === uf && fold(t.niche) === fold(nicheName) && locKey(t.city, t.uf) !== locKey(cityName, uf)).forEach((t) => {
      const k = t.city
      const v = m.get(k) || { city: k, done: 0, total: 0 }
      v.total++; if (t.done) v.done++
      m.set(k, v)
    })
    return Array.from(m.values()).filter((v) => v.done < v.total).sort((a, b) => b.done - a.done || a.city.localeCompare(b.city)).slice(0, 12)
  }, [terms, nicheName, cityName, uf])

  const copy = async (txt, what) => {
    try { await navigator.clipboard.writeText(txt); setCopied(what); setTimeout(() => setCopied(''), 1800) } catch { notify('Não consegui copiar. Selecione o texto.', 'err') }
  }

  const generate = async () => {
    if (!nicheName) { document.getElementById('cap-niche')?.focus(); return notify('Falta escolher o nicho (ex.: Dentista).', 'err') }
    if (!cityName) return notify('Escolha a cidade.', 'err')
    const pick = locs.filter(isSel)
    if (!pick.length) return notify('Selecione pelo menos um local.', 'err')
    const owner = auth.isTotal('prospeccao') ? null : auth.uid
    const missing = pick.filter((l) => !l.term).map((l) => ({
      niche: nicheName, neighborhood: l.neighborhood, city: cityName, uf, region: l.region && !['Bairros', 'Cidade'].includes(l.region) ? l.region : null, owner_id: owner,
    }))
    const created = missing.length ? await upsert('search_terms', missing, { onConflict: 'niche,neighborhood,city,uf', silent: true }) : []
    const byHood = new Map(created.map((t) => [fold(t.neighborhood), t]))
    const chosenTerms = pick.map((l) => l.term || byHood.get(fold(l.neighborhood))).filter(Boolean)
    const code = batchCode()
    const ig = source === 'instagram'
    const list = chosenTerms.map((t) => ({ id: t.id, neighborhood: t.neighborhood, query: termQuery({ niche: nicheName, neighborhood: t.neighborhood, city: cityName, uf }), ...(ig ? { source: 'instagram' } : {}) }))
    const prompt = ig
      ? buildInstagramPrompt({ code, niche: nicheName, city: cityName, uf, terms: list, onlyNoSite })
      : buildPrompt({ code, niche: nicheName, city: cityName, uf, queries: list.map((x) => x.query), onlyNoSite })
    const batch = await insert('capture_batches', { code, niche: nicheName, city: cityName, uf, terms: list, only_no_site: onlyNoSite, prompt, owner_id: auth.uid }, { silent: true })
    // a cobertura de bairros é do Google Maps: lote do Instagram não reserva nem marca as buscas
    if (!ig) await updateWhere('search_terms', (q) => q.in('id', list.map((x) => x.id)), { batch_id: batch.id, reserved_at: new Date().toISOString() }, { quiet: true, silent: true })
    emitChange('search_terms', 'capture_batches')
    setResult(batch)
    copy(prompt, 'prompt')
  }

  if (result) {
    return (
      <div className="cols">
        <div className="card" style={{ flex: '2 1 560px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="stack-s" style={{ gap: 2 }}>
              <h2>Lote <span className="num ok">{result.code}</span>{result.terms[0]?.source === 'instagram' ? ' · Instagram' : ''} · {result.niche} · {result.city} - {result.uf}</h2>
              <span className="lbl">{result.terms.length} busca(s). {copied === 'prompt' ? 'Prompt copiado.' : 'Copie o prompt e cole no Claude.'}</span>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => copy(result.prompt, 'prompt')}><Icon name="copy" size={14} />{copied === 'prompt' ? 'Copiado' : 'Copiar prompt'}</button>
              <a className="btn" href="https://claude.ai/new" target="_blank" rel="noreferrer"><Icon name="arrow" size={14} />Abrir o Claude</a>
              <button type="button" className="btn p" onClick={() => onImport(result)}><Icon name="upload" size={14} />Importar resultado</button>
            </div>
          </div>
          <div className="box num" style={{ fontSize: 12.5, maxHeight: 460, overflow: 'auto' }}>{result.prompt}</div>
          <div className="row"><button type="button" className="btn g" onClick={() => setResult(null)}>Gerar outro lote</button></div>
        </div>
        <div className="card" style={{ flex: '1 1 280px', padding: '14px 16px' }}>
          <h2 style={{ paddingBottom: 8 }}>Como usar</h2>
          <ol className="lbl" style={{ lineHeight: 1.8, paddingLeft: 18 }}>
            <li>No Chrome, abra o Claude com a extensão ativa.</li>
            <li>{result.terms[0]?.source === 'instagram' ? 'Cole o prompt e deixe ele buscar os perfis (Google + Instagram). Mantenha o Instagram da Zinkra logado.' : 'Cole o prompt e deixe ele rodar as buscas no Google Maps.'}</li>
            <li>Copie o bloco TSV que ele devolver (ou baixe o arquivo).</li>
            <li>Clique em <b>Importar resultado</b>. Os leads entram no CRM e as buscas ficam marcadas como feitas.</li>
          </ol>
          <p className="lbl" style={{ paddingTop: 8 }}>Se fechar esta tela, o lote continua em <b>Lotes</b> para importar depois.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cols">
      <div className="card" style={{ flex: '2 1 560px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="fields">
          <Field label="Nicho">
            <input id="cap-niche" className="in" list="cap-niches" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex.: Dentista" />
            <datalist id="cap-niches">{niches.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
          <Field label="Estado"><Select value={uf} onChange={(v) => { setUf(v || 'SP'); setCity('') }} options={UFS.map(([s, n]) => [s, `${s} · ${n}`])} /></Field>
          <Field label="Cidade" hint={cities.length ? `${cities.length} municípios em ${UF_NAME[uf]}` : 'Digite o nome da cidade'}>
            <input className="in" list="cap-cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Campinas" />
            <datalist id="cap-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Buscas por lote" hint="5 a 8 rende bem numa conversa"><input type="number" min={1} max={30} className="in num" value={size} onChange={(e) => { setSize(Math.max(1, Number(e.target.value) || 1)); setSel(null) }} /></Field>
        </div>
        <PlacePick data={data} niche={nicheName} current={cityName ? { city: cityName, uf } : null}
          onUse={(p) => { setUf(p.uf); setCity(p.city) }} />
        <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 6 }} role="radiogroup" aria-label="Onde captar">
            <span className="lbl">Onde captar</span>
            <button type="button" className={`chip ${source === 'maps' ? 'on' : ''}`} onClick={() => setSource('maps')}><Icon name="search" size={12} />Google Maps</button>
            <button type="button" className={`chip ${source === 'instagram' ? 'on' : ''}`} onClick={() => setSource('instagram')}><Icon name="ig" size={12} />Instagram</button>
          </div>
          <label className="check"><input type="checkbox" checked={onlyNoSite} onChange={(e) => setOnlyNoSite(e.target.checked)} />Captar só quem não tem site próprio</label>
        </div>
        {source === 'instagram' ? <div className="note y">O Claude abre os perfis no Instagram logado neste Chrome, devagar e só lendo (sem seguir nem mandar Direct). Os leads entram com o @ para você prospectar pelo canal Instagram.</div> : null}

        {nicheName && cityName ? (
          <>
            <div className="stack-s" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{nicheName} em {cityName} - {uf}</span>
                <span className="legend">
                  <span><i style={{ background: 'var(--green)' }} />feito {counts.feito}</span>
                  <span><i style={{ background: 'var(--yel, #E5A23A)' }} />em lote {counts.lote}</span>
                  <span><i style={{ border: '1px dashed #4A524E' }} />falta {counts.falta}</span>
                </span>
              </div>
              <Bar value={pct(counts.feito, locs.length)} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="lbl">Clique nos bairros para marcar ou desmarcar. {chosen.length ? `${chosen.length} marcado(s) para este lote.` : 'Nenhum marcado.'}</span>
                <div className="row">
                  {chosen.length ? <button type="button" className="btn s" onClick={() => setSel([])}><Icon name="x" size={12} />Limpar seleção</button> : null}
                  <button type="button" className="btn s g" onClick={() => setSel(null)}>Marcar os próximos {size}</button>
                </div>
              </div>
            </div>
            {groups.map(([region, list]) => (
              <div key={region} className="stack-s" style={{ gap: 8 }}>
                <span className="lbl" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>{region}</span>
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {list.map((l) => {
                    const on = isSel(l)
                    const style = l.status === 'feito' ? { borderStyle: 'solid', borderColor: 'var(--green-ln)', color: 'var(--green-tx)' }
                      : l.status === 'lote' ? { borderStyle: 'solid', borderColor: '#5A4A22', color: '#E5A23A' } : {}
                    return (
                      <button key={l.neighborhood || '_'} type="button" className={`chip ${on ? 'on' : ''}`} style={on ? undefined : style} onClick={() => toggle(l)}
                        title={l.status === 'feito' ? `Feito${l.term?.done_at ? ' em ' + dm(l.term.done_at.slice(0, 10)) : ''}${l.term?.leads_found != null ? ` · ${l.term.leads_found} leads` : ''}` : l.status === 'lote' ? 'Já está em um lote aguardando importação' : 'Ainda não buscado'}>
                        {on ? <Icon name="check" size={12} /> : null}{hoodLabel(l.neighborhood)}
                        {l.status === 'feito' && l.term?.leads_found != null ? <span className="num" style={{ fontSize: 11, opacity: 0.8 }}>{l.term.leads_found}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="stack-s" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{noHoods ? `Ainda não há bairros de ${cityName}. Busque a cidade inteira ou cadastre bairros.` : 'Adicionar bairros'}</span>
              <div className="row">
                <textarea className="ta grow" rows={2} style={{ height: 'auto', minHeight: 34, resize: 'vertical' }} value={newHoods} onChange={(e) => setNewHoods(e.target.value)}
                  placeholder="Ex.: Cambuí, Taquaral, Barão Geraldo (vírgula ou um por linha)"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !newHoods.includes('\n')) { e.preventDefault(); document.getElementById('cap-add')?.click() } }} />
                <button id="cap-add" type="button" className="btn" onClick={() => {
                  const add = newHoods.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
                  if (!add.length) return
                  setExtra((x) => [...x, ...add]); setNewHoods('')
                  setSel([...chosen, ...add.map(fold)])
                }}>Adicionar</button>
                <button type="button" className="btn g" onClick={() => copy(hoodsPrompt(cityName, uf), 'bairros')} title="Prompt curto para o Claude listar os bairros da cidade">
                  <Icon name="copy" size={14} />{copied === 'bairros' ? 'Copiado' : 'Prompt de bairros'}
                </button>
              </div>
              <span className="lbl">Cole a lista que o Claude devolver (um bairro por linha também funciona).</span>
            </div>
          </>
        ) : <Empty icon="search">{!nicheName && cityName ? <>Agora escolha o <b>nicho</b> lá em cima (ex.: Dentista, Advogado) para ver os bairros de {cityName}.</> : 'Escolha o nicho e a cidade para ver o que já foi buscado.'}</Empty>}

        <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <span className="lbl">{chosen.length} local(is) no lote{source === 'instagram' ? ' · Instagram' : ''}{onlyNoSite ? ' · só sem site' : ''}</span>
          <AsyncButton className="btn p" onClick={generate}><Icon name="spark" size={14} />{!nicheName ? 'Escolha o nicho' : !cityName ? 'Escolha a cidade' : !chosen.length ? 'Marque um bairro' : 'Gerar prompt'}</AsyncButton>
        </div>
      </div>

      <div className="stack" style={{ flex: '1 1 300px', minWidth: 0 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <h2 style={{ paddingBottom: 6 }}>Lotes para importar</h2>
          {batches.filter((b) => b.status === 'aguardando').slice(0, 6).map((b) => (
            <div key={b.id} className="li">
              <div className="stack-s grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="ellipsis"><span className="num ok">{b.code}</span>{isIgBatch(b) ? ' · Instagram' : ''} · {b.niche}</span>
                <span className="lbl ellipsis">{b.city} - {b.uf} · {b.terms.length} busca(s) · {dm(b.created_at.slice(0, 10))}</span>
              </div>
              <button type="button" className="btn s" onClick={() => onImport(b)}>Importar</button>
            </div>
          ))}
          {!batches.some((b) => b.status === 'aguardando') ? <p className="lbl">Nenhum. Todo lote gerado aparece aqui até você importar.</p> : null}
        </div>
        {nicheName && elsewhere.length ? (
          <div className="card" style={{ padding: '14px 16px' }}>
            <h2 style={{ paddingBottom: 6 }}>{nicheName}: falta em outras cidades de {uf}</h2>
            {elsewhere.map((c) => (
              <div key={c.city} className="li" style={{ padding: '7px 0' }}>
                <button type="button" className="btn g s" style={{ padding: 0, height: 'auto' }} onClick={() => setCity(c.city)}>{c.city}</button>
                <span className="num lbl">{c.done}/{c.total}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Sugestão de local
const CONTACT_T = new Set(['whatsapp', 'ligacao', 'email', 'visita'])
function PlacePick({ data, niche, current, onUse }) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const { replied, contacted } = useMemo(() => {
    const r = new Set(), c = new Set()
    ;(data.acts || []).forEach((a) => { if (!a.lead_id) return; if (a.result === 'respondeu') r.add(a.lead_id); if (CONTACT_T.has(a.type)) c.add(a.lead_id) })
    return { replied: r, contacted: c }
  }, [data.acts])
  const rk = useMemo(() => rankPlaces({ leads: data.leads, replied, contacted, niche, day: today() }), [data.leads, replied, contacted, niche])
  useEffect(() => setIdx(0), [niche])
  const p = rk.list[idx % rk.list.length]
  if (!p) return null
  const isCur = current && fold(current.city) === fold(p.city) && current.uf === p.uf
  return (
    <div className="card pick">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div className="stack-s" style={{ gap: 3, minWidth: 0 }}>
          <span className="lbl"><Icon name="spark" size={12} /> Sugestão de local{niche ? ` para ${niche}` : ''} · {idx === 0 ? 'hoje' : `opção ${(idx % rk.list.length) + 1}`}</span>
          <strong className="pick-name">{p.city} - {p.uf}</strong>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn s p" disabled={isCur} onClick={() => onUse(p)}><Icon name="check" size={13} />{isCur ? 'Selecionada' : 'Usar este local'}</button>
          <button type="button" className="btn s" onClick={() => setIdx((i) => i + 1)}>Outro local</button>
          <button type="button" className="btn s g" onClick={() => setOpen((o) => !o)}>{open ? 'Fechar lista' : 'Ver mais'}</button>
        </div>
      </div>
      <ul className="pick-why">{placeReasons(p, rk.gReply, niche).map((r) => <li key={r}>{r}</li>)}</ul>
      {open ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {rk.list.slice(0, 18).map((x, i) => (
            <button key={x.key} type="button" className={`chip ${i === idx % rk.list.length ? 'on' : ''}`} onClick={() => setIdx(i)} title={placeReasons(x, rk.gReply, niche).join(' · ')}>{x.city} - {x.uf}</button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ------------------------------------------------------------------ Cobertura
function Cobertura({ data, onCapture }) {
  const { terms, leads } = data
  const [uf, setUf] = useState('SP')
  const [city, setCity] = useState('')
  const [niche, setNiche] = useState('')
  const [q, setQ] = useState('')
  const [ibge, setIbge] = useState([])
  useEffect(() => {
    let alive = true
    fetchCities(uf).then((l) => alive && setIbge(l)).catch(() => alive && setIbge([]))
    return () => { alive = false }
  }, [uf])

  const inUf = useMemo(() => terms.filter((t) => !uf || t.uf === uf), [terms, uf])
  const cityOpts = useMemo(() => Array.from(new Set(inUf.map((t) => t.city))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [inUf])
  const nicheOpts = useMemo(() => Array.from(new Set(inUf.map((t) => t.niche))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [inUf])
  const leadsByTerm = useMemo(() => {
    const m = new Map()
    leads.forEach((l) => { if (l.search_term_id) m.set(l.search_term_id, (m.get(l.search_term_id) || 0) + 1) })
    return m
  }, [leads])

  // agrupa: sem nicho → por nicho; com nicho → por cidade (ou por bairro, se tiver cidade)
  const by = !niche ? 'niche' : !city ? 'city' : 'hood'
  const rows = useMemo(() => {
    const scope = inUf.filter((t) => (!city || t.city === city) && (!niche || t.niche === niche))
    const m = new Map()
    scope.forEach((t) => {
      const k = by === 'niche' ? t.niche : by === 'city' ? t.city : hoodLabel(t.neighborhood)
      const v = m.get(k) || { key: k, total: 0, done: 0, leads: 0, cities: new Set(), next: [], term: t }
      v.total++
      if (t.done) v.done++
      v.leads += leadsByTerm.get(t.id) || t.leads_found || 0
      v.cities.add(t.city)
      if (!t.done && v.next.length < 3) v.next.push(by === 'niche' ? `${hoodLabel(t.neighborhood)}${city ? '' : ` (${t.city})`}` : hoodLabel(t.neighborhood))
      m.set(k, v)
    })
    const f = fold(q)
    return Array.from(m.values()).filter((r) => !f || fold(r.key).includes(f))
      .sort((a, b) => (b.done > 0) - (a.done > 0) || (a.done / a.total < 1) - (b.done / b.total < 1) || b.done - a.done || a.key.localeCompare(b.key, 'pt-BR'))
  }, [inUf, city, niche, by, leadsByTerm, q])

  const untouched = useMemo(() => {
    if (!niche || city) return []
    const has = new Set(inUf.filter((t) => t.niche === niche).map((t) => fold(t.city)))
    return ibge.filter((c) => !has.has(fold(c)))
  }, [ibge, inUf, niche, city])

  const SHOW = 300
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-h" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="stack-s" style={{ gap: 2 }}>
          <h2>{by === 'niche' ? 'Por nicho' : by === 'city' ? `${niche} por cidade` : `${niche} em ${city}`}</h2>
          <span className="lbl">Verde = buscado. Clique em Captar para gerar um lote com o que falta.</span>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Select value={uf} onChange={(v) => { setUf(v || ''); setCity('') }} placeholder="Todo o Brasil" options={UFS.map(([s]) => s)} style={{ width: 120 }} />
          <Select value={city} onChange={(v) => setCity(v || '')} placeholder="Todas as cidades" options={cityOpts} style={{ width: 170 }} />
          <Select value={niche} onChange={(v) => setNiche(v || '')} placeholder="Todos os nichos" options={nicheOpts} style={{ width: 190 }} />
          <input className="in" style={{ width: 150 }} placeholder="Filtrar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {rows.length ? (
        <div className="tbl-wrap" style={{ maxHeight: 600 }}><table className="tbl">
          <thead><tr>
            <th>{by === 'niche' ? 'Nicho' : by === 'city' ? 'Cidade' : 'Bairro'}</th>
            <th className="r">Feitos</th><th style={{ width: 160 }}>Progresso</th><th className="r">Leads</th>
            {by !== 'hood' ? <th>Próximos que faltam</th> : <th>Status</th>}<th />
          </tr></thead>
          <tbody>
            {rows.slice(0, SHOW).map((r) => (
              <tr key={r.key}>
                <td>{r.key}{by === 'niche' && r.cities.size > 1 ? <span className="lbl"> · {r.cities.size} cidades</span> : null}</td>
                <td className="num r">{r.done}/{r.total}</td>
                <td><Bar value={pct(r.done, r.total)} /></td>
                <td className="num r">{r.leads || '—'}</td>
                {by !== 'hood' ? <td className="lbl ellipsis" style={{ maxWidth: 320 }}>{r.done === r.total ? 'tudo feito' : r.next.join(', ')}</td>
                  : <td>{r.done ? <Badge kind="g">feito{r.term.done_at ? ` ${dm(r.term.done_at.slice(0, 10))}` : ''}</Badge> : r.term.batch_id ? <Badge kind="y">em lote</Badge> : <span className="b">falta</span>}</td>}
                <td className="r">
                  {r.done < r.total ? (
                    <button type="button" className="btn s" onClick={() => onCapture({
                      niche: by === 'niche' ? r.key : niche,
                      city: by === 'city' ? r.key : city || (r.cities.size === 1 ? Array.from(r.cities)[0] : 'São Paulo'),
                      uf: r.term.uf,
                    })}>Captar</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : <div style={{ padding: 16 }}><Empty icon="search">Nenhuma busca cadastrada com esses filtros.</Empty></div>}
      {rows.length > SHOW ? <div className="lbl" style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Mostrando {SHOW} de {rows.length}. Use os filtros.</div> : null}
      {untouched.length ? (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }} className="stack-s">
          <span style={{ fontSize: 13, fontWeight: 500 }}>{untouched.length} cidade(s) de {UF_NAME[uf]} sem nenhuma busca de {niche}</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {untouched.slice(0, 40).map((c) => <button key={c} type="button" className="chip" onClick={() => onCapture({ niche, city: c, uf })}>{c}</button>)}
            {untouched.length > 40 ? <span className="lbl">e mais {untouched.length - 40}. Digite a cidade em Nova captação.</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ------------------------------------------------------------------ Lotes
const BATCH_BADGE = { aguardando: ['y', 'aguardando'], importado: ['g', 'importado'], cancelado: ['', 'cancelado'] }
function Lotes({ data, onImport }) {
  const [copied, setCopied] = useState('')
  const { batches } = data
  if (!batches.length) return <div className="card" style={{ padding: 20 }}><Empty icon="doc">Nenhum lote ainda. Gere o primeiro em Nova captação.</Empty></div>
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Lote</th><th>Data</th><th>Nicho</th><th>Local</th><th className="r">Buscas</th><th>Status</th><th className="r">Leads novos</th><th className="r">Repetidos</th><th /></tr></thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id}>
              <td className="num ok">{b.code}{isIgBatch(b) ? <Badge kind="y">Insta</Badge> : null}</td>
              <td className="num lbl">{dm(b.created_at.slice(0, 10))}</td>
              <td>{b.niche}</td>
              <td className="ellipsis" style={{ maxWidth: 260 }} title={b.terms.map((t) => hoodLabel(t.neighborhood)).join(', ')}>{b.city} - {b.uf} <span className="lbl">· {b.terms.map((t) => hoodLabel(t.neighborhood)).join(', ')}</span></td>
              <td className="num r">{b.terms.length}</td>
              <td><Badge kind={BATCH_BADGE[b.status][0]}>{BATCH_BADGE[b.status][1]}</Badge></td>
              <td className="num r">{b.status === 'importado' ? b.leads_created : '—'}</td>
              <td className="num r">{b.status === 'importado' ? b.leads_dup : '—'}</td>
              <td className="r">
                <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                  <button type="button" className="btn s g" onClick={async () => {
                    try { await navigator.clipboard.writeText(b.prompt || ''); setCopied(b.id); setTimeout(() => setCopied(''), 1500) } catch { notify('Não consegui copiar.', 'err') }
                  }}>{copied === b.id ? 'Copiado' : 'Copiar prompt'}</button>
                  {b.status === 'aguardando' ? (
                    <>
                      <button type="button" className="btn s p" onClick={() => onImport(b)}>Importar</button>
                      <AsyncButton className="btn s g" onClick={async () => {
                        await updateWhere('search_terms', (q) => q.eq('batch_id', b.id).eq('done', false), { batch_id: null, reserved_at: null }, { quiet: true, silent: true })
                        await update('capture_batches', b.id, { status: 'cancelado' }, { silent: true })
                        emitChange('search_terms', 'capture_batches')
                        notify(`Lote ${b.code} cancelado. As buscas voltaram para "falta".`, 'ok')
                      }}>Cancelar</AsyncButton>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  )
}

// ------------------------------------------------------------------ Importação do resultado
function ImportModal({ batch, data, onClose }) {
  const auth = useAuth()
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [owner, setOwner] = useState(auth.isTotal('crm') ? '' : auth.uid)
  const [queueToday, setQueueToday] = useState(false)
  const [doneMap, setDoneMap] = useState({})
  const [busy, setBusy] = useState(false)
  const bTerms = batch.terms || []
  const ig = isIgBatch(batch)

  const load = (text, name) => {
    const p = parseResult(text)
    if (!p.rows.length) return notify('Não encontrei linhas no resultado. Confira se copiou o bloco com o cabeçalho.', 'err')
    setParsed(p); setFileName(name)
  }

  const analysis = useMemo(() => {
    if (!parsed) return null
    const phones = new Map(), igs = new Map()
    data.leads.forEach((l) => {
      const p = normalizePhone(l.phone).slice(-8)
      if (p.length === 8) phones.set(p, l)
      const ig = igHandle(l.instagram).toLowerCase()
      if (ig) igs.set(ig, l)
    })
    const seen = new Set()
    const per = new Map(bTerms.map((t) => [t.id, { term: t, rows: 0, fresh: 0, dup: 0 }]))
    const out = parsed.rows.map((r) => {
      const term = matchTerm(r, bTerms)
      const info = term ? per.get(term.id) : null
      if (fold(r.company) === fold(NO_RESULT)) return { r, term, kind: 'vazio' }
      if (info) info.rows++
      const p = normalizePhone(r.phone).slice(-8)
      const ig = igHandle(r.instagram).toLowerCase()
      let kind = 'novo'
      if (batch.only_no_site && yes(r.site)) kind = 'site'
      else if (p.length < 8 && !ig) kind = 'semcontato'
      else if ((p.length === 8 && (phones.has(p) || seen.has('p' + p))) || (ig && (igs.has(ig) || seen.has('i' + ig)))) kind = 'dup'
      if (p.length === 8) seen.add('p' + p)
      if (ig) seen.add('i' + ig)
      if (info && kind === 'novo') info.fresh++
      if (info && kind === 'dup') info.dup++
      return { r, term, kind, dupOf: kind === 'dup' ? phones.get(p) || igs.get(ig) : null }
    })
    // termos que apareceram no resultado (inclusive "SEM RESULTADOS") ficam marcados como feitos
    const touched = new Set(out.filter((x) => x.term).map((x) => x.term.id))
    return { out, per: Array.from(per.values()), touched }
  }, [parsed, data.leads, bTerms, batch.only_no_site])

  useEffect(() => {
    if (analysis) setDoneMap(Object.fromEntries(bTerms.map((t) => [t.id, analysis.touched.has(t.id)])))
  }, [analysis]) // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = analysis ? analysis.out.filter((x) => x.kind === 'novo') : []
  const cnt = (k) => (analysis ? analysis.out.filter((x) => x.kind === k).length : 0)
  const unmatched = analysis ? analysis.out.filter((x) => !x.term && x.kind !== 'vazio').length : 0

  const run = async () => {
    setBusy(true)
    try {
      const st = await defaultLeadStage()
      const rows = fresh.map(({ r, term }) => ({
        company: r.company || igHandle(r.instagram) || r.phone,
        niche: batch.niche, city: batch.city, uf: batch.uf,
        neighborhood: r.neighborhood || term?.neighborhood || null,
        phone: r.phone || null, instagram: r.instagram ? igHandle(r.instagram) : null,
        has_site: r.site ? yes(r.site) : false,
        origin: ig ? `Instagram · ${term?.neighborhood || batch.city}` : term?.query || r.where || 'Captação',
        search_term_id: term?.id || null,
        notes: `Captação · lote ${batch.code}`,
        owner_id: owner || null, ...st,
        ...(queueToday ? { next_step_at: today(), next_step: 'Primeiro contato (M1)', next_step_code: 'M1' } : {}),
      }))
      let created = 0
      for (let i = 0; i < rows.length; i += 200) {
        const res = await insert('leads', rows.slice(i, i + 200), { select: 'id', silent: true })
        created += res.length
      }
      const now = new Date().toISOString()
      for (const p of ig ? [] : analysis.per) {
        if (doneMap[p.term.id]) await update('search_terms', p.term.id, { done: true, leads_found: p.fresh + p.dup, batch_id: batch.id, reserved_at: null }, { quiet: true, silent: true })
        else await update('search_terms', p.term.id, { batch_id: null, reserved_at: null }, { quiet: true, silent: true })
      }
      await update('capture_batches', batch.id, { status: 'importado', leads_created: created, leads_dup: cnt('dup'), imported_at: now }, { quiet: true, silent: true })
      emitChange('leads', 'search_terms', 'capture_batches')
      notify(`${created} lead(s) novos no CRM. ${cnt('dup')} já existiam.`, 'ok')
      onClose()
    } finally { setBusy(false) }
  }

  return (
    <Modal size="lg" title={<>Importar lote <span className="num ok">{batch.code}</span> · {batch.niche} · {batch.city} - {batch.uf}</>} onClose={onClose}
      footer={!parsed ? <button type="button" className="btn" onClick={onClose}>Cancelar</button> : (
        <>
          <button type="button" className="btn" onClick={() => setParsed(null)}>Voltar</button>
          <button type="button" className="btn p" disabled={busy} onClick={run}>{busy ? 'Importando…' : `Importar ${fresh.length} lead(s) novo(s)`}</button>
        </>
      )}>
      {!parsed ? (
        <div className="stack">
          <p className="lbl" style={{ lineHeight: 1.6 }}>Cole aqui o bloco TSV que o Claude devolveu (com o cabeçalho) ou escolha o arquivo .tsv, .csv ou .xlsx. Colunas esperadas: {COLS.join(' · ')}.</p>
          <label className="btn" style={{ width: 'max-content' }}>
            <Icon name="upload" size={14} /> Escolher arquivo
            <input type="file" accept=".tsv,.csv,.txt,.xlsx,text/csv,text/tab-separated-values" style={{ display: 'none' }}
              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { load(await readResultFile(f), f.name) } catch (err) { notify('Não consegui ler o arquivo: ' + (err.message || err), 'err') } }} />
          </label>
          <Field label="Ou cole aqui">
            <textarea className="ta num" rows={10} placeholder={COLS.join('\t')}
              onPaste={(e) => { const tx = e.clipboardData.getData('text'); if (tx) { e.preventDefault(); load(tx, 'texto colado') } }} />
          </Field>
        </div>
      ) : (
        <div className="stack">
          {parsed.missing.length ? <div className="note y">Não achei a(s) coluna(s): {parsed.missing.map((m) => ({ company: 'Empresa', phone: 'Telefone', where: 'Onde achei' }[m])).join(', ')}. Confira o cabeçalho.</div> : null}
          <div className="row lbl" style={{ gap: 14, flexWrap: 'wrap' }}>
            <span>{fileName} · <b className="num">{parsed.rows.length}</b> linhas</span>
            <span className="ok">novos <b className="num">{fresh.length}</b></span>
            <span>já no CRM ou repetidos <b className="num">{cnt('dup')}</b></span>
            {cnt('site') ? <span>com site (ignorados) <b className="num">{cnt('site')}</b></span> : null}
            {cnt('semcontato') ? <span>sem telefone nem Instagram <b className="num">{cnt('semcontato')}</b></span> : null}
          </div>
          {unmatched ? <div className="note y">{unmatched} linha(s) não bateram com nenhuma busca do lote pelo "Onde achei". Elas entram mesmo assim, sem marcar busca.</div> : null}
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Busca</th><th className="r">Linhas</th><th className="r">Novos</th><th className="r">Repetidos</th>{ig ? null : <th>Marcar como feita</th>}</tr></thead>
            <tbody>
              {analysis.per.map((p) => (
                <tr key={p.term.id}>
                  <td>{p.term.query}</td>
                  <td className="num r">{p.rows}</td><td className="num r">{p.fresh}</td><td className="num r">{p.dup}</td>
                  {ig ? null : <td><label className="check"><input type="checkbox" checked={!!doneMap[p.term.id]} onChange={(e) => setDoneMap({ ...doneMap, [p.term.id]: e.target.checked })} />
                    {analysis.touched.has(p.term.id) ? 'feita' : <span className="lbl">não veio no resultado</span>}</label></td>}
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="tbl-wrap" style={{ maxHeight: 240 }}><table className="tbl">
            <thead><tr><th>Empresa</th><th>Telefone</th><th>Instagram</th><th>Bairro</th><th>Situação</th></tr></thead>
            <tbody>
              {analysis.out.filter((x) => x.kind !== 'vazio').slice(0, 200).map((x, i) => (
                <tr key={i}>
                  <td className="ellipsis" style={{ maxWidth: 220 }}>{x.r.company}</td>
                  <td className="num">{x.r.phone || '—'}</td>
                  <td>{x.r.instagram ? igHandle(x.r.instagram) : '—'}</td>
                  <td className="lbl">{x.r.neighborhood || x.term?.neighborhood || '—'}</td>
                  <td>{x.kind === 'novo' ? <Badge kind="g">novo</Badge> : x.kind === 'dup' ? (x.dupOf ? <Link to={`/erp/leads/${x.dupOf.id}`} target="_blank" className="b">já no CRM</Link> : <span className="b">repetido</span>)
                    : x.kind === 'site' ? <span className="b">tem site</span> : <span className="b">sem contato</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="fields">
            {auth.isTotal('crm') ? <Field label="Responsável"><Select value={owner} onChange={(v) => setOwner(v || '')} placeholder="sem dono (fila de todos)" options={auth.members.map((m) => [m.id, m.name])} /></Field> : null}
          </div>
          {ig ? null : <label className="check"><input type="checkbox" checked={queueToday} onChange={(e) => setQueueToday(e.target.checked)} />Colocar os novos na fila de prospecção de hoje (mensagem M1)</label>}
          <span className="lbl">{ig ? 'Eles ficam em Leads. Para mandar Direct, vá em Prospecção, escolha o canal Instagram e o público.' : 'Sem marcar, eles ficam em Leads e você puxa para a fila quando quiser, em Prospecção → Puxar novos leads.'}</span>
        </div>
      )}
    </Modal>
  )
}
