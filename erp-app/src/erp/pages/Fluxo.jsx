import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useWorld, monthlyFlow, cashSummary } from '../lib/world'
import { brl0, monthLabel, today, addMonths, startOfMonth } from '../lib/format'
import { PageHead, Card, Seg, Loading, ErrorBox, Stat } from '../components/ui'
import { GroupedBars } from '../components/charts'
import { FRONTS } from '../lib/constants'
import { toCsv, download } from '../lib/csv'
import { Icon } from '../lib/icons'

export default function Fluxo() {
  const [view, setView] = useState('fluxo')
  useMeta('Financeiro', view === 'fluxo' ? 'Fluxo de caixa' : 'Resultado mensal')
  const { data: w, loading, error, reload } = useWorld()

  const c = useMemo(() => {
    if (!w) return null
    const t = today()
    const flow = monthlyFlow(w, 6, 3, t)
    let acc = 0
    // saldo acumulado: tudo que entrou e saiu antes da janela + a janela
    const firstKey = flow[0].key
    acc = w.receivables.filter((r) => r.received_on && r.received_on.slice(0, 7) < firstKey).reduce((a, r) => a + r.amount_cents, 0)
      - w.payables.filter((p) => p.paid_on && p.paid_on.slice(0, 7) < firstKey).reduce((a, p) => a + p.amount_cents, 0)
    const rows = flow.map((m) => { acc += m.in - m.out; return { ...m, result: m.in - m.out, acc } })
    const curIdx = rows.findIndex((m) => m.isCur)

    // resultado por frente e categoria (últimos 6 meses, regime de caixa)
    const months = rows.filter((m) => m.past || m.isCur).map((m) => m.key)
    const recBy = {}, payBy = {}
    w.receivables.filter((r) => r.received_on).forEach((r) => {
      const k = r.received_on.slice(0, 7); if (!months.includes(k)) return
      ;(recBy[r.front || 'interno'] ||= {})[k] = ((recBy[r.front || 'interno'] || {})[k] || 0) + r.amount_cents
    })
    w.payables.filter((p) => p.paid_on).forEach((p) => {
      const k = p.paid_on.slice(0, 7); if (!months.includes(k)) return
      ;(payBy[p.category] ||= {})[k] = ((payBy[p.category] || {})[k] || 0) + p.amount_cents
    })
    const sumK = (obj, k) => Object.values(obj).reduce((a, x) => a + (x[k] || 0), 0)
    return { rows, curIdx, months, recBy, payBy, sumK, cs: cashSummary(w, t), goal: w.settings.goals?.monthly_revenue_cents || 0 }
  }, [w])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !c) return <div className="page"><Loading rows={8} /></div>
  const future = c.rows.filter((m) => !m.past && !m.isCur)
  const negative = future.find((m) => m.result < 0)
  const exportCsv = () => download(`fluxo-${today()}.csv`, toCsv(['Mês', 'Entradas', 'Saídas', 'Resultado', 'Saldo acumulado', 'Situação'],
    c.rows.map((m) => [m.key, m.in / 100, m.out / 100, m.result / 100, m.acc / 100, m.past ? 'realizado' : m.isCur ? 'realizado + previsto' : 'previsto'])))

  return (
    <div className="page">
      <PageHead title={view === 'fluxo' ? 'Fluxo de caixa' : 'Resultado mensal'}
        sub={view === 'fluxo' ? 'Realizado até hoje e previsto para os próximos 3 meses, a partir de contratos e contas lançadas' : 'Receita por frente menos despesas por categoria (regime de caixa)'}>
        <Seg value={view} onChange={setView} options={[['fluxo', 'Fluxo de caixa'], ['dre', 'Resultado mensal']]} />
        <button type="button" className="btn" onClick={exportCsv}><Icon name="download" size={14} />CSV</button>
      </PageHead>

      {view === 'fluxo' ? (
        <>
          <div className="card stats">
            <Stat label="Saldo atual (no ERP)" value={brl0(c.cs.cash)} />
            <Stat label="Recorrente mensal" value={brl0(c.cs.mrr)} valueClass="ok" />
            <Stat label="Saldo projetado em 30 dias" value={brl0(c.cs.projected)} valueClass={c.cs.projected < 0 ? 'bad' : ''} />
            <Stat label="Próximos 3 meses" value={brl0(future.reduce((a, m) => a + m.result, 0))} sub="resultado previsto" valueClass={future.reduce((a, m) => a + m.result, 0) < 0 ? 'bad' : ''} />
          </div>
          {negative ? <div className="note r">{monthLabel(negative.key)} fecha negativo na previsão ({brl0(negative.in)} de entradas contra {brl0(negative.out)} de saídas). Feche projetos ou antecipe recebimentos.</div> : null}
          <Card pad title={<h2>Entradas e saídas por mês</h2>} action={
            <div className="legend"><span><i style={{ background: 'var(--green)' }} />Entradas</span><span><i style={{ border: '1px dashed var(--green)' }} />Previstas</span><span><i style={{ background: '#4A524E' }} />Saídas</span></div>}>
            <GroupedBars height={220} labels={c.rows.map((m) => monthLabel(m.key) + (m.isCur ? ' (parcial)' : ''))} highlight={c.curIdx} goal={c.goal}
              series={[
                { name: 'Entradas', color: 'var(--green)', values: c.rows.map((m) => m.in), dashedFrom: c.curIdx + 1 },
                { name: 'Saídas', color: '#4A524E', values: c.rows.map((m) => m.out) },
              ]} />
            <span className="lbl" style={{ display: 'block', marginTop: 10 }}>{c.goal ? `Tracejado horizontal = meta mensal de ${brl0(c.goal)}. ` : ''}Meses futuros só têm o que já está contratado: se a barra cai, é sinal de que o funil precisa fechar agora.</span>
          </Card>
          <Card>
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Mês</th><th className="r">Entradas</th><th className="r">Saídas</th><th className="r">Resultado</th><th className="r">Saldo acumulado</th></tr></thead>
              <tbody>
                {c.rows.map((m) => (
                  <tr key={m.key} className={m.isCur ? 'on' : ''}>
                    <td>{monthLabel(m.key)} <span className="lbl">{m.past ? '' : m.isCur ? 'realizado + previsto' : 'previsto'}</span></td>
                    <td className="num r">{brl0(m.in)}</td><td className="num r">{brl0(m.out)}</td>
                    <td className="num r" style={{ color: m.result >= 0 ? 'var(--green-tx)' : 'var(--red)' }}>{m.result >= 0 ? '+ ' : '− '}{brl0(Math.abs(m.result))}</td>
                    <td className="num r">{brl0(m.acc)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Resultado</th>{c.months.map((k) => <th key={k} className="r">{monthLabel(k)}</th>)}</tr></thead>
            <tbody>
              <tr className="grp"><td>Receita</td>{c.months.map((k) => <td key={k} className="num r">{brl0(c.sumK(c.recBy, k))}</td>)}</tr>
              {Object.keys(c.recBy).map((f) => (
                <tr key={f}><td style={{ paddingLeft: 28, color: 'var(--tx-3)' }}>{FRONTS[f] || f}</td>{c.months.map((k) => <td key={k} className="num r mut">{brl0(c.recBy[f][k] || 0)}</td>)}</tr>
              ))}
              <tr className="grp"><td>Despesas</td>{c.months.map((k) => <td key={k} className="num r">{brl0(c.sumK(c.payBy, k))}</td>)}</tr>
              {Object.keys(c.payBy).map((f) => (
                <tr key={f}><td style={{ paddingLeft: 28, color: 'var(--tx-3)' }}>{f}</td>{c.months.map((k) => <td key={k} className="num r mut">{brl0(c.payBy[f][k] || 0)}</td>)}</tr>
              ))}
              <tr className="grp"><td>Lucro</td>{c.months.map((k) => { const v = c.sumK(c.recBy, k) - c.sumK(c.payBy, k); return <td key={k} className="num r" style={{ color: v >= 0 ? 'var(--green-tx)' : 'var(--red)' }}>{brl0(v)}</td> })}</tr>
              <tr><td>Margem</td>{c.months.map((k) => { const r = c.sumK(c.recBy, k); return <td key={k} className="num r">{r ? Math.round(((r - c.sumK(c.payBy, k)) / r) * 100) + '%' : '—'}</td> })}</tr>
            </tbody>
          </table></div>
        </Card>
      )}
    </div>
  )
}

export { addMonths, startOfMonth }
