import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMeta, useErp } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, useSettings } from '../lib/data'
import { getPipelines, moveLead } from '../lib/automations'
import { daysSince, brl0, brlShort, initials, relDay, today, localDay } from '../lib/format'
import { PageHead, Seg, Loading, ErrorBox } from '../components/ui'
import { LostModal, WinModal } from './LeadDetalhe'

export default function Pipelines() {
  const { slug } = useParams()
  const nav = useNavigate()
  const auth = useAuth()
  const erp = useErp()
  const settings = useSettings()
  const [view, setView] = useState('kanban')
  const [mine, setMine] = useState(false)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [modal, setModal] = useState(null)
  const [showProsp, setShowProsp] = useState(false)

  const { data, loading, error, reload } = useData(async () => {
    const [P, leads] = await Promise.all([getPipelines(), fetchRows('leads', { limit: 5000 })])
    return { P, leads }
  }, ['leads', 'pipeline_stages', 'pipelines'])

  const cur = data ? (data.P.bySlug(slug) || data.P.pipelines[0]) : null
  useMeta('Comercial', cur?.name || 'Pipelines')

  const cols = useMemo(() => {
    if (!data || !cur) return []
    const leads = data.leads.filter((l) => l.pipeline_id === cur.id && (!mine || l.owner_id === auth.uid))
    // no pipeline de prospecção, Novo e Contatado ficam na tela de Prospecção: aqui só entra quem avançou
    const stages = data.P.of(cur.id)
    const firstAdv = stages.find((s) => /^respond/i.test(s.name))
    const hideBefore = !showProsp && firstAdv ? firstAdv.sort : -Infinity
    return stages.filter((s) => s.kind !== 'open' || s.sort >= hideBefore).map((s) => {
      const cards = leads.filter((l) => l.stage_id === s.id && !(hideBefore > -Infinity && s.kind === 'lost' && l.lost_reason === 'Número inválido'))
        .sort((a, b) => (s.kind === 'lost' || s.kind === 'won' ? (b.stage_changed_at || '').localeCompare(a.stage_changed_at || '') : (a.stage_changed_at || '').localeCompare(b.stage_changed_at || '')))
      const total = cards.reduce((a, l) => a + (l.estimated_value_cents || 0), 0)
      return { s, cards, total, weighted: Math.round(total * (s.probability / 100)) }
    })
  }, [data, cur, mine, auth.uid, showProsp])
  const prospCount = useMemo(() => {
    if (!data || !cur) return 0
    const stages = data.P.of(cur.id)
    const firstAdv = stages.find((s) => /^respond/i.test(s.name))
    if (!firstAdv) return 0
    const early = new Set(stages.filter((s) => s.kind === 'open' && s.sort < firstAdv.sort).map((s) => s.id))
    return data.leads.filter((l) => early.has(l.stage_id) && (!mine || l.owner_id === auth.uid)).length
  }, [data, cur, mine, auth.uid])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  if (!cur) return <div className="page"><div className="empty">Nenhum pipeline configurado.</div></div>

  const open = cols.filter((c) => c.s.kind === 'open' || c.s.kind === 'handoff')
  const openCount = open.reduce((a, c) => a + c.cards.length, 0)
  const openTotal = open.reduce((a, c) => a + c.total, 0)
  const weighted = open.reduce((a, c) => a + c.weighted, 0)
  const wonCol = cols.find((c) => c.s.kind === 'won')
  const lostCol = cols.find((c) => c.s.kind === 'lost')
  const rate = wonCol && lostCol && (wonCol.cards.length + lostCol.cards.length) ? Math.round((wonCol.cards.length / (wonCol.cards.length + lostCol.cards.length)) * 100) : null

  const drop = async (stage) => {
    const lead = drag
    setDrag(null); setOver(null)
    if (!lead || lead.stage_id === stage.id) return
    const canEdit = auth.isTotal('crm') || lead.owner_id === auth.uid || !lead.owner_id
    if (!canEdit) return
    if (stage.kind === 'lost') return setModal({ kind: 'lost', lead })
    if (stage.kind === 'won' && auth.isTotal('clientes')) return setModal({ kind: 'win', lead })
    await moveLead(lead, stage.id)
  }
  const ageStyle = (d) => ({ fontSize: 11, color: d > 7 ? 'var(--red)' : d > 3 ? 'var(--yel)' : 'var(--mut)' })
  const reasons = settings.lost_reasons || ['Preço', 'Sem resposta', 'Já tem fornecedor', 'Não é o momento', 'Outro']

  return (
    <div className="page">
      <PageHead title={cur.name}
        sub={`${openCount} em aberto · ${brl0(openTotal)} estimado · ponderado ${brl0(weighted)}${rate !== null ? ` · taxa de ganho ${rate}%` : ''}`}>
        <Seg value={view} onChange={setView} options={[['kanban', 'Kanban'], ['list', 'Lista']]} />
        <label className="check"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Só os meus</label>
        {prospCount ? <label className="check" title="Leads em Novo e Contatado, que ficam na tela de Prospecção"><input type="checkbox" checked={showProsp} onChange={(e) => setShowProsp(e.target.checked)} />Mostrar em prospecção ({prospCount})</label> : null}
        {auth.isTotal('config') ? <Link to="/erp/config?s=pipes" className="btn">Editar etapas</Link> : null}
        {auth.canEdit('crm') ? <button type="button" className="btn p" onClick={() => erp.openQuick('lead')}>Novo lead</button> : null}
      </PageHead>

      <Seg value={cur.slug} onChange={(s) => nav(`/erp/pipelines/${s}`)} options={data.P.pipelines.map((p) => [p.slug, p.name])} />

      {view === 'kanban' ? (
        <div className="kanban">
          <div className="kanban-in">
            {cols.map(({ s, cards, total }) => (
              <section key={s.id} className={`kcol ${over === s.id ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(s.id) }} onDragLeave={() => setOver((o) => (o === s.id ? null : o))} onDrop={() => drop(s)}>
                <div className="kcol-h">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  <h2>{s.name}</h2>
                  <span className="num lbl">{cards.length}</span>
                </div>
                <div className="num lbl" style={{ padding: '0 4px 4px' }}>{total ? `${brl0(total)}${s.probability && s.kind === 'open' ? ` · ${s.probability}%` : ''}` : s.kind === 'lost' ? 'arraste aqui e informe o motivo' : '—'}</div>
                {cards.slice(0, s.kind === 'lost' || s.kind === 'won' ? 15 : 200).map((l) => {
                  const d = daysSince(localDay(l.stage_changed_at)) || 0
                  return (
                    <div key={l.id} className={`kcard ${drag?.id === l.id ? 'dragging' : ''}`} draggable onDragStart={() => setDrag(l)} onDragEnd={() => { setDrag(null); setOver(null) }}
                      onClick={() => nav(`/erp/leads/${l.id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') nav(`/erp/leads/${l.id}`) }}>
                      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 500 }}>{l.company}</span>
                        <span className="avatar s" title={auth.memberName(l.owner_id)}>{l.owner_id ? initials(auth.memberName(l.owner_id)) : '—'}</span>
                      </div>
                      <span className="lbl">{[l.niche, l.neighborhood].filter(Boolean).join(' · ') || '—'}{l.lost_reason && s.kind === 'lost' ? ` · ${l.lost_reason}` : ''}</span>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="num" style={{ fontSize: 12, color: 'var(--tx-2)' }}>{l.estimated_value_cents ? `${brlShort(l.estimated_value_cents)}${l.estimated_recurring ? '/mês' : ''}` : '—'}</span>
                        {l.next_step_at && s.kind === 'open' ? <span className="num" style={{ fontSize: 11, color: l.next_step_at < today() ? 'var(--red)' : 'var(--mut)' }}>{relDay(l.next_step_at)}</span> : null}
                        <span className="num" style={ageStyle(d)} title="dias nesta etapa">{d}d</span>
                      </div>
                    </div>
                  )
                })}
                {cards.length > 15 && (s.kind === 'lost' || s.kind === 'won') ? <Link to="/erp/leads?view=perdidos" className="lbl" style={{ padding: 4 }}>+ {cards.length - 15} mais</Link> : null}
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Lead</th><th>Etapa</th><th>Responsável</th><th className="r">Valor</th><th className="r">Prob.</th><th className="r">Dias na etapa</th><th>Próximo passo</th></tr></thead>
            <tbody>
              {cols.flatMap(({ s, cards }) => cards.map((l) => (
                <tr key={l.id} className="click" onClick={() => nav(`/erp/leads/${l.id}`)}>
                  <td style={{ fontWeight: 500 }}>{l.company}</td>
                  <td><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.color, marginRight: 8 }} />{s.name}</td>
                  <td>{auth.memberName(l.owner_id)}</td>
                  <td className="num r">{l.estimated_value_cents ? brl0(l.estimated_value_cents) : '—'}</td>
                  <td className="num r">{s.probability}%</td>
                  <td className="num r" style={ageStyle(daysSince(localDay(l.stage_changed_at)))}>{daysSince(localDay(l.stage_changed_at))}</td>
                  <td className="num">{l.next_step_at ? relDay(l.next_step_at) : '—'}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
      <span className="lbl">Dias na etapa: cinza até 3, amarelo de 4 a 7, vermelho acima de 7. Arrastar para "Perdido" pede o motivo; para "Ganho" cria cliente, contrato, cobranças e projeto.</span>

      {modal?.kind === 'lost' ? <LostModal lead={modal.lead} stages={data.P.of(cur.id)} reasons={reasons} onClose={() => setModal(null)} /> : null}
      {modal?.kind === 'win' ? <WinModal lead={modal.lead} P={data.P} onClose={() => setModal(null)} /> : null}
    </div>
  )
}
