import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, Empty, Seg, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'
import { useData, fetchRows, notify } from '../lib/data'
import { brl, addMonths } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { lerCadastros } from '../lib/pf/api'
import { apagarLancamento } from '../lib/pf/nucleo'
import { diaSemanaData } from './listas'
import { ModalGasto, ModalLancamento } from './acoes'
import { MesNav } from './Contas'
import ImportarExtrato from './ImportarExtrato'

const TABELAS = ['pf_lancamentos', 'pf_categorias', 'pf_contas']

export default function Lancamentos() {
  useMeta('Pessoal · Lançamentos', 'Pessoal')
  const hoje = hojeSP()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const { data, loading, error, reload } = useData(async () => {
    const ini = `${mes}-01`, fim = addMonths(ini, 1)
    const [cad, linhas] = await Promise.all([
      lerCadastros(),
      fetchRows('pf_lancamentos', { where: (q) => q.gte('data', ini).lt('data', fim), order: 'data', ascending: false }),
    ])
    return { ...cad, linhas }
  }, TABELAS, [mes])
  const [filtro, setFiltro] = useState('todos')
  const [gasto, setGasto] = useState(false)
  const [importando, setImportando] = useState(false)
  const [editando, setEditando] = useState(null)
  const confirmar = useConfirm()

  const visiveis = useMemo(() => (data ? data.linhas.filter((l) => filtro === 'todos' || (filtro === 'entradas' ? l.valor_cent > 0 : l.valor_cent < 0)) : []), [data, filtro])
  const grupos = useMemo(() => {
    const g = []
    for (const l of visiveis) {
      if (!g.length || g[g.length - 1].dia !== l.data) g.push({ dia: l.data, itens: [] })
      g[g.length - 1].itens.push(l)
    }
    return g
  }, [visiveis])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>

  const { categorias, contas, linhas } = data
  const cat = (id) => categorias.find((c) => c.id === id)
  const entrou = linhas.filter((l) => l.valor_cent > 0).reduce((s, l) => s + Number(l.valor_cent), 0)
  const saiu = linhas.filter((l) => l.valor_cent < 0).reduce((s, l) => s - Number(l.valor_cent), 0)
  const [ano, mm] = mes.split('-').map(Number)

  const apagar = async (l) => {
    const ligado = l.compromisso_id || l.parcela_id
    const ok = await confirmar(ligado ? 'Desfazer o pagamento? A conta volta para "em aberto".' : 'Apagar este lançamento? O saldo será recalculado.', { ok: ligado ? 'Desfazer' : 'Apagar', danger: true })
    if (!ok) return
    await apagarLancamento(l.id)
    notify(ligado ? 'Pagamento desfeito.' : 'Lançamento apagado.', 'ok')
    setEditando(null)
  }

  return (
    <div className="page pf pf-lanc">
      <PageHead title="Lançamentos" sub="O dinheiro que realmente entrou e saiu.">
        <button type="button" className="btn" onClick={() => setImportando(true)}><Icon name="upload" size={14} />Importar extrato</button>
        <button type="button" className="btn p" onClick={() => setGasto(true)}><Icon name="plus" size={14} />Gasto</button>
      </PageHead>

      <MesNav ano={ano} mm={mm} irMes={(n) => setMes(addMonths(`${mes}-01`, n).slice(0, 7))} />

      <div className="pf-faixa">
        <div><span className="lbl">Entrou</span><b className="num pos">{brl(entrou)}</b></div>
        <div><span className="lbl">Saiu</span><b className="num">{brl(saiu)}</b></div>
        <div><span className="lbl">Diferença</span><b className={`num ${entrou - saiu < 0 ? 'neg' : ''}`}>{brl(entrou - saiu)}</b></div>
      </div>

      <div className="pf-barra-filtros">
        <Seg value={filtro} onChange={setFiltro} options={[['todos', 'Tudo'], ['entradas', 'Entradas'], ['saidas', 'Saídas']]} />
      </div>

      {grupos.length ? grupos.map((g) => (
        <section className="pf-bloco" key={g.dia}>
          <div className="pf-cabeca"><div className="stack-s"><h2>{diaSemanaData(g.dia)}</h2></div><span className="lbl num">{brl(g.itens.reduce((s, l) => s + Number(l.valor_cent), 0))}</span></div>
          {g.itens.map((l) => {
            const c = cat(l.categoria_id)
            const entrada = l.valor_cent > 0
            return (
              <button type="button" className="pf-linha pf-lanc-linha" key={l.id} onClick={() => setEditando(l)} aria-label={`Editar ${l.descricao || c?.nome || 'lançamento'}`}>
                <i className="pf-bolinha" style={{ background: c?.cor || 'var(--mut-2)' }} aria-hidden="true" />
                <span className="pf-meio">
                  <span className="pf-nome">{l.descricao || c?.nome || (entrada ? 'Entrada' : 'Gasto')}</span>
                  <span className="lbl">{c ? c.nome : 'Sem categoria'}{l.compromisso_id || l.parcela_id ? ' · conta paga' : ''}{l.recebimento_modelo_id ? ' · recebimento' : ''}</span>
                </span>
                <span className={`pf-valor num ${entrada ? 'pos' : ''}`}>{entrada ? '+' : '−'} {brl(Math.abs(l.valor_cent))}</span>
              </button>
            )
          })}
        </section>
      )) : <Empty icon="money" action={<button type="button" className="btn p" onClick={() => setGasto(true)}>Registrar um gasto</button>}>Nenhum lançamento {filtro === 'todos' ? '' : 'desse tipo '}neste mês.</Empty>}

      {importando ? <ImportarExtrato contas={contas} categorias={categorias} onClose={() => setImportando(false)} /> : null}
      {gasto ? <ModalGasto categorias={categorias} contas={contas} onClose={() => setGasto(false)} /> : null}
      {editando ? <ModalLancamento lancamento={editando} categorias={categorias} contas={contas} onClose={() => setEditando(null)} onApagar={() => apagar(editando)} /> : null}
    </div>
  )
}
