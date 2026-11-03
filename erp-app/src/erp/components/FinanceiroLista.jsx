import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, fetchRows } from '../lib/data'
import { brl } from '../lib/format'
import { calcularCarteira } from '../lib/financeiro'
import { Seg, Loading, ErrorBox, Badge, Empty } from './ui'
import { TABELAS_FIN } from './FinanceiroProjeto'

const FILTROS = [['todos', 'Todos'], ['receber', 'Com saldo a receber'], ['comissao', 'Com comissão a pagar'], ['quitados', 'Quitados']]

export async function carregarFinanceiro() {
  const [valores, recebimentos, parceiros, pagamentos, abatimentos] = await Promise.all(
    ['project_valores', 'project_recebimentos', 'project_comissao', 'project_comissao_pagamentos', 'project_comissao_abatimentos']
      .map((t) => fetchRows(t, { order: 'created_at' })))
  return { valores, recebimentos, parceiros, pagamentos, abatimentos }
}

// Lista de projetos com os saldos em colunas, filtros e totais no rodapé.
export default function FinanceiroLista({ projetos }) {
  const nav = useNavigate()
  const [filtro, setFiltro] = useState('todos')
  const { data: f, loading, error, reload } = useData(carregarFinanceiro, TABELAS_FIN)

  const { linhas, mostradas, totais, sem } = useMemo(() => {
    if (!f) return { linhas: [], mostradas: [], totais: null, sem: 0 }
    const { linhas } = calcularCarteira(f, projetos)
    const ok = {
      todos: () => true,
      receber: ({ fin }) => fin.faltaReceber > 0,
      comissao: ({ fin }) => fin.comissaoAPagar > 0,
      quitados: ({ fin }) => fin.quitado,
    }[filtro]
    const mostradas = linhas.filter(ok).sort((a, b) => b.fin.faltaReceber - a.fin.faltaReceber)
    // o rodapé soma exatamente o que está na tela
    const totais = mostradas.reduce((t, { fin }) => ({
      valorTotal: t.valorTotal + fin.valorTotal, recebido: t.recebido + fin.recebido, faltaReceber: t.faltaReceber + fin.faltaReceber,
      comissaoAPagar: t.comissaoAPagar + fin.comissaoAPagar, lucroPrevisto: t.lucroPrevisto + fin.lucroPrevisto,
    }), { valorTotal: 0, recebido: 0, faltaReceber: 0, comissaoAPagar: 0, lucroPrevisto: 0 })
    return { linhas, mostradas, totais, sem: projetos.length - linhas.length }
  }, [f, projetos, filtro])

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading || !f) return <Loading rows={5} />

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Seg value={filtro} onChange={setFiltro} options={FILTROS} />
        {sem > 0 ? <span className="lbl">{sem} projeto(s) ainda sem valor cadastrado no financeiro</span> : null}
      </div>
      {!linhas.length ? <div className="card"><Empty icon="money">Nenhum projeto com valor lançado. Abra um projeto, vá em Financeiro e cadastre o valor base.</Empty></div> : (
        <div className="card tbl-wrap"><table className="tbl fin-tbl">
          <thead><tr><th>Projeto</th><th>Parceiro</th><th className="r">Valor total</th><th className="r">Recebido</th><th className="r">Falta receber</th><th className="r">Comissão a pagar</th><th className="r">Lucro previsto</th></tr></thead>
          <tbody>
            {mostradas.map(({ projeto: p, fin }) => (
              <tr key={p.id} className="click" onClick={() => nav(`/erp/projetos/${p.id}`)}>
                <td data-l="Projeto"><span style={{ fontWeight: 500 }}>{p.name}</span><br /><span className="lbl">{p.client}</span></td>
                <td data-l="Parceiro">{(f.parceiros.find((x) => x.project_id === p.id) || {}).partner_name || '—'}</td>
                <td data-l="Valor total" className="num r">{brl(fin.valorTotal)}</td>
                <td data-l="Recebido" className="num r">{brl(fin.recebido)}</td>
                <td data-l="Falta receber" className="num r">{fin.faltaReceber ? brl(fin.faltaReceber) : <Badge kind="g">{fin.quitado ? 'quitado' : 'em dia'}</Badge>}{fin.alertas.includes('recebido_acima_do_total') ? <span className="warn" title="Recebido acima do total"> !</span> : null}</td>
                <td data-l="Comissão a pagar" className="num r">{fin.comissaoAPagar ? brl(fin.comissaoAPagar) : '—'}</td>
                <td data-l="Lucro previsto" className="num r">{brl(fin.lucroPrevisto)}</td>
              </tr>
            ))}
            {!mostradas.length ? <tr><td colSpan={7} className="lbl">Nenhum projeto neste filtro.</td></tr> : null}
          </tbody>
          <tfoot><tr className="fin-total">
            <td colSpan={2}>Total · {mostradas.length} projeto(s)</td>
            <td className="num r">{brl(totais.valorTotal)}</td><td className="num r">{brl(totais.recebido)}</td>
            <td className="num r">{brl(totais.faltaReceber)}</td><td className="num r">{brl(totais.comissaoAPagar)}</td><td className="num r">{brl(totais.lucroPrevisto)}</td>
          </tr></tfoot>
        </table></div>
      )}
    </div>
  )
}
