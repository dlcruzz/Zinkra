import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useWorld, metricValue, periodRange, weekdayCount } from '../lib/world'
import { insert, archive, update, saveSetting, notify } from '../lib/data'
import { today, brl0, MONTHS, addDays, addMonths, startOfMonth } from '../lib/format'
import { PageHead, Card, Seg, Loading, ErrorBox, Bar, Field, Select, MoneyInput, AsyncButton, Empty } from '../components/ui'
import { METRICS, MONEY_METRICS, PERIODS } from '../lib/constants'
import { Icon } from '../lib/icons'

export default function Metas() {
  useMeta('Comercial', 'Metas')
  const auth = useAuth()
  const [period, setPeriod] = useState('month')
  const { data: w, loading, error, reload } = useWorld()

  const c = useMemo(() => {
    if (!w) return null
    const t = today()
    const [from, to] = periodRange(period, t)
    const total = period === 'day' ? 1 : weekdayCount(from, to) || 1
    const passed = period === 'day' ? 1 : Math.max(1, weekdayCount(from, t))
    const goals = w.goals.filter((g) => !g.archived_at)
    const scale = (g) => {
      // converte o alvo da meta para o período visualizado
      const per = { day: 1, week: 5, month: weekdayCount(...periodRange('month', t)) || 22 }
      return (Number(g.target) / per[g.period]) * (period === 'day' ? 1 : period === 'week' ? 5 : per.month)
    }
    const people = [{ id: null, name: 'Empresa' }, ...auth.members].map((m) => ({
      ...m,
      rows: goals.filter((g) => (g.user_id || null) === m.id).map((g) => {
        const target = scale(g)
        const done = metricValue(w, g.metric, g.user_id, from, t)
        const proj = (done / passed) * total
        return { g, target, done, proj, ratio: target ? proj / target : 0 }
      }),
    })).filter((p) => p.rows.length)
    // histórico: últimos 4 meses
    const hist = []
    for (let i = 1; i <= 4; i++) {
      const ref = addMonths(startOfMonth(t), -i)
      const [a, b] = periodRange('month', ref)
      const cells = goals.filter((g) => g.period !== 'day').map((g) => {
        const target = g.period === 'month' ? Number(g.target) : Number(g.target) * 4.3
        const done = metricValue(w, g.metric, g.user_id, a, b)
        return { g, target, done, hit: done >= target }
      })
      hist.push({ label: `${MONTHS[Number(a.slice(5, 7)) - 1]}`, cells, a })
    }
    return { from, to, total, passed, people, hist, goals }
  }, [w, period, auth.members])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !c) return <div className="page"><Loading rows={6} /></div>
  const now = new Date()
  const fmt = (g, v) => (MONEY_METRICS.has(g.metric) ? brl0(v) : Math.round(v).toLocaleString('pt-BR'))
  const pctTime = Math.round((c.passed / c.total) * 100)

  return (
    <div className="page">
      <PageHead title={period === 'month' ? `Metas de ${MONTHS[now.getMonth()]}` : period === 'week' ? 'Metas da semana' : 'Metas de hoje'}
        sub={period === 'day' ? 'Alvo do dia calculado a partir das metas semanais e mensais' : `Dia ${c.passed} de ${c.total} dias úteis · ${pctTime}% do período passado`}>
        <Seg value={period} onChange={setPeriod} options={[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']]} />
      </PageHead>

      <div className="cols">
        <div className="stack" style={{ flex: '2 1 560px', minWidth: 0, gap: 16 }}>
          {c.people.map((p) => (
            <Card pad key={p.id || 'co'} title={<h2 style={{ fontSize: 15 }}>{p.name}{p.role ? <span className="lbl" style={{ fontWeight: 400 }}> · {p.role === 'diretor' ? 'diretor geral' : p.role}</span> : null}</h2>}
              action={<span className="lbl">{p.rows.filter((r) => r.ratio >= 1).length} de {p.rows.length} no ritmo</span>}>
              <div className="lbl" style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 170px) 1fr 140px 110px 30px', gap: 14, padding: '4px 0' }}>
                <span>Métrica</span><span>Progresso</span><span>Realizado / meta</span><span>Projeção no fim</span><span />
              </div>
              {p.rows.map(({ g, target, done, ratio }) => (
                <div key={g.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 170px) 1fr 140px 110px 30px', gap: 14, alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--line-2)', fontSize: 13 }}>
                  <span>{METRICS[g.metric]}</span>
                  <div style={{ position: 'relative' }}>
                    <Bar large value={target ? (done / target) * 100 : 0} className={ratio >= 1 ? '' : ratio >= 0.8 ? 'w' : 'd'} />
                    {period !== 'day' ? <span title="onde deveria estar hoje" style={{ position: 'absolute', top: -3, bottom: -3, left: `${pctTime}%`, width: 1, background: '#8A938E' }} /> : null}
                  </div>
                  <span className="num">{fmt(g, done)} / {fmt(g, target)}</span>
                  <span className="num" style={{ color: ratio >= 1 ? 'var(--green-tx)' : ratio >= 0.8 ? 'var(--yel)' : 'var(--red)' }}>{period === 'day' ? `${Math.round((done / (target || 1)) * 100)}%` : `${Math.round(ratio * 100)}%`}</span>
                  {auth.isTotal('metas') ? <button type="button" className="btn s ic g" aria-label="Remover meta" onClick={() => archive('goals', g.id)}><Icon name="x" size={13} /></button> : <span />}
                </div>
              ))}
            </Card>
          ))}
          {!c.people.length ? <Card><Empty icon="target">Nenhuma meta definida ainda.{auth.isTotal('metas') ? ' Crie a primeira ao lado.' : ''}</Empty></Card> : null}

          {c.goals.length ? (
            <Card title="Histórico">
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Mês</th>{c.goals.filter((g) => g.period !== 'day').map((g) => <th key={g.id}>{METRICS[g.metric]}{g.user_id ? ` · ${auth.memberName(g.user_id)}` : ''}</th>)}<th>Batidas</th></tr></thead>
                <tbody>
                  {c.hist.map((h) => (
                    <tr key={h.a}>
                      <td style={{ textTransform: 'capitalize' }}>{h.label}</td>
                      {h.cells.map(({ g, done, target, hit }) => <td key={g.id} className="num">{fmt(g, done)} / {fmt(g, target)} {hit ? <span className="ok">✓</span> : null}</td>)}
                      <td className="num">{h.cells.filter((x) => x.hit).length} de {h.cells.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Card>
          ) : null}
        </div>

        {auth.isTotal('metas') ? <NewGoal w={w} /> : null}
      </div>
    </div>
  )
}

function NewGoal({ w }) {
  const auth = useAuth()
  const [f, setF] = useState({ user_id: auth.members.find((m) => m.role === 'prospector')?.id || auth.uid, metric: 'contatos', period: 'month', target: '', repeat: true })
  const [rev, setRev] = useState(w.settings.goals?.monthly_revenue_cents || 0)
  const money = MONEY_METRICS.has(f.metric)
  const t = today()
  const days = weekdayCount(...periodRange('month', t)) || 22
  const daily = f.period === 'month' ? Number(f.target) / days : f.period === 'week' ? Number(f.target) / 5 : Number(f.target)
  return (
    <div className="stack" style={{ flex: '1 1 300px', minWidth: 0 }}>
      <form className="card pad stack" onSubmit={(e) => e.preventDefault()}>
        <h2>Nova meta</h2>
        <Field label="Para quem"><Select value={f.user_id || ''} onChange={(v) => setF({ ...f, user_id: v })} options={[['', 'Toda a empresa'], ...auth.members.map((m) => [m.id, m.name])]} /></Field>
        <Field label="Métrica"><Select value={f.metric} onChange={(v) => setF({ ...f, metric: v, target: '' })} options={METRICS} /></Field>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <Field label="Período" style={{ flex: 1 }}><Select value={f.period} onChange={(v) => setF({ ...f, period: v })} options={PERIODS} /></Field>
          <Field label="Valor alvo" style={{ flex: 1 }}>
            {money ? <MoneyInput value={f.target} onChange={(v) => setF({ ...f, target: v })} /> : <input className="in num" inputMode="numeric" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value.replace(/\D/g, '') })} />}
          </Field>
        </div>
        {f.target && !money ? <div className="box" style={{ fontSize: 12 }}>Alvo diário: <span className="num">{Math.ceil(daily)}</span> em dias úteis. A pessoa vê isso na tela Hoje e na sessão de prospecção.</div> : null}
        <label className="check"><input type="checkbox" checked={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.checked })} />Repetir todo período</label>
        <AsyncButton className="btn p" onClick={async () => {
          if (!Number(f.target)) return notify('Informe o valor alvo.', 'err')
          await insert('goals', { user_id: f.user_id || null, metric: f.metric, period: f.period, target: Number(f.target), repeat: f.repeat })
          notify('Meta criada.', 'ok'); setF({ ...f, target: '' })
        }}>Salvar meta</AsyncButton>
      </form>
      <div className="card pad stack">
        <h2>Meta de faturamento mensal</h2>
        <p className="lbl">Usada no dashboard, no fluxo de caixa e pela inteligência para saber se o funil cobre o mês.</p>
        <MoneyInput value={rev} onChange={setRev} />
        <AsyncButton className="btn" onClick={async () => { await saveSetting('goals', { ...(w.settings.goals || {}), monthly_revenue_cents: rev }); notify('Meta de faturamento salva.', 'ok') }}>Salvar</AsyncButton>
      </div>
    </div>
  )
}

export { update }
