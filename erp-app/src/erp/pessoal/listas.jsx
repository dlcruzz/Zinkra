import React, { useState } from 'react'
import { Badge, Empty, useConfirm, AsyncButton } from '../components/ui'
import { Icon } from '../lib/icons'
import { useAuth } from '../lib/auth'
import { remove, notify, emitChange } from '../lib/data'
import { brl, dm, dmy, WEEK_S, parseDate } from '../lib/format'
import { hojeSP, proximasDatas, ehFeriado } from '../lib/pf/datas'
import { resumoParcelamento } from '../lib/pf/parcelas'
import { TIPOS_CONTA, PRIORIDADES, PRIORIDADE_COR, RECORRENCIAS, restaurarCategoriasPadrao } from '../lib/pf/api'
import { ModalConta, ModalRecebimento, ModalCategoria, ModalCompromisso, ModalParcelamento, ModalDivida } from './modais'

export const diaSemanaData = (iso) => `${WEEK_S[parseDate(iso).getDay()]} ${dm(iso)}`

function Acoes({ onEditar, onApagar, rotulo }) {
  return (
    <span className="pf-acoes">
      {onEditar ? <button type="button" className="btn ic s g" aria-label={`Editar ${rotulo}`} onClick={onEditar}><Icon name="edit" size={14} /></button> : null}
      {onApagar ? <button type="button" className="btn ic s g" aria-label={`Apagar ${rotulo}`} onClick={onApagar}><Icon name="trash" size={14} /></button> : null}
    </span>
  )
}

function useApagar(tabela, aviso) {
  const confirmar = useConfirm()
  return async (id, nome, extra) => {
    if (!(await confirmar(`Apagar "${nome}"? ${extra || ''}`.trim(), { ok: 'Apagar', danger: true }))) return
    await remove(tabela, id)
    notify(aviso, 'ok')
  }
}

function Cabeca({ titulo, sub, children }) {
  return (
    <div className="pf-cabeca">
      <div className="stack-s"><h2>{titulo}</h2>{sub ? <span className="lbl">{sub}</span> : null}</div>
      <div className="row">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------- recebimentos fixos
export function RecebimentosBloco({ modelos, contas, regra }) {
  const [modal, setModal] = useState(null)
  const apagar = useApagar('pf_recebimentos_modelo', 'Recebimento apagado.')
  const hoje = hojeSP()
  const tem = (dia) => modelos.some((m) => m.dia_mes === dia)
  return (
    <div className="pf-bloco">
      <Cabeca titulo="Recebimentos fixos" sub="O dinheiro que você espera receber todo mês.">
        {!tem(15) ? <button type="button" className="btn s" onClick={() => setModal({ sugestao: { dia: 15, descricao: 'Recebimento do dia 15' } })}>+ Dia 15</button> : null}
        {!tem(30) ? <button type="button" className="btn s" onClick={() => setModal({ sugestao: { dia: 30, descricao: 'Recebimento do dia 30' } })}>+ Dia 30</button> : null}
        <button type="button" className="btn s p" onClick={() => setModal({})}><Icon name="plus" size={13} stroke={2.2} />Outro</button>
      </Cabeca>
      {modelos.length ? modelos.map((m) => {
        const [prox] = proximasDatas(m.dia_mes, regra, hoje, 1)
        const conta = contas.find((c) => c.id === m.conta_id)
        return (
          <div className="pf-linha" key={m.id}>
            <div className="pf-dia" aria-hidden="true"><b className="num">{String(m.dia_mes).padStart(2, '0')}</b><span>dia</span></div>
            <div className="pf-meio">
              <span className="pf-nome">{m.descricao}</span>
              <span className="lbl">
                {prox ? <>Próximo: <b style={{ color: 'var(--tx-2)', fontWeight: 500 }}>{diaSemanaData(prox.data)}</b>{prox.ajustada ? ` (dia ${dm(prox.nominal)} ${ehFeriado(prox.nominal) ? 'é feriado' : 'cai no fim de semana'})` : ''}</> : null}
                {conta ? ` · ${conta.nome}` : ''}
              </span>
            </div>
            <span className="pf-valor num">{m.valor_esperado_cent ? brl(m.valor_esperado_cent) : <span className="mut">sem valor</span>}</span>
            <Acoes rotulo={m.descricao} onEditar={() => setModal({ modelo: m })} onApagar={() => apagar(m.id, m.descricao)} />
          </div>
        )
      }) : <Empty icon="up">Nenhum recebimento fixo ainda. Use "+ Dia 15" e "+ Dia 30" para começar.</Empty>}
      {modal ? <ModalRecebimento modelo={modal.modelo} sugestao={modal.sugestao} contas={contas} onClose={() => setModal(null)} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------- contas e cartões
export function ContasBloco({ contas }) {
  const [modal, setModal] = useState(null)
  const apagar = useApagar('pf_contas', 'Conta apagada.')
  return (
    <div className="pf-bloco">
      <Cabeca titulo="Contas e cartões" sub="Onde o seu dinheiro está e o cartão que gera fatura.">
        <button type="button" className="btn s" onClick={() => setModal({ tipoInicial: 'cartao' })}>+ Cartão</button>
        <button type="button" className="btn s p" onClick={() => setModal({ tipoInicial: 'corrente' })}><Icon name="plus" size={13} stroke={2.2} />Conta</button>
      </Cabeca>
      {contas.length ? contas.map((c) => (
        <div className="pf-linha" key={c.id}>
          <div className="pf-dia" aria-hidden="true"><Icon name={c.tipo === 'cartao' ? 'doc' : 'money'} size={18} /></div>
          <div className="pf-meio">
            <span className="pf-nome">{c.nome} {!c.ativo ? <Badge dot={false}>Desativada</Badge> : null}</span>
            <span className="lbl">
              {TIPOS_CONTA[c.tipo]}
              {c.tipo === 'cartao'
                ? ` · fecha dia ${c.fechamento_dia}, vence dia ${c.vencimento_dia}${c.limite_cent ? ` · limite ${brl(c.limite_cent)}` : ''}`
                : c.data_saldo_inicial ? ` · saldo conferido em ${dmy(c.data_saldo_inicial)}` : ''}
            </span>
          </div>
          <span className="pf-valor num">{c.tipo === 'cartao' ? '' : brl(c.saldo_inicial_cent)}</span>
          <Acoes rotulo={c.nome} onEditar={() => setModal({ conta: c })}
            onApagar={() => apagar(c.id, c.nome, 'Lançamentos feitos nela ficam, mas sem conta.')} />
        </div>
      )) : <Empty icon="money">Nenhuma conta cadastrada.</Empty>}
      {modal ? <ModalConta conta={modal.conta} tipoInicial={modal.tipoInicial} onClose={() => setModal(null)} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------- categorias
export function CategoriasBloco({ categorias }) {
  const auth = useAuth()
  const [modal, setModal] = useState(null)
  const apagar = useApagar('pf_categorias', 'Categoria apagada.')
  const restaurar = async () => {
    await restaurarCategoriasPadrao(auth.uid)
    emitChange('pf_categorias')
    notify('Categorias padrão de volta.', 'ok')
  }
  const grupo = (tipo, titulo) => (
    <div className="pf-grupo">
      <div className="pf-grupo-t"><span>{titulo}</span><button type="button" className="btn s g" onClick={() => setModal({ tipoInicial: tipo })}>+ Nova</button></div>
      {categorias.filter((c) => c.tipo === tipo).map((c) => (
        <div className="pf-linha slim" key={c.id}>
          <i className="pf-bolinha" style={{ background: c.cor }} aria-hidden="true" />
          <div className="pf-meio"><span className="pf-nome">{c.nome}</span></div>
          {c.essencial ? <Badge kind="bl" dot={false}>Essencial</Badge> : null}
          <Acoes rotulo={c.nome} onEditar={() => setModal({ categoria: c })} onApagar={() => apagar(c.id, c.nome, 'O que já foi lançado com ela fica sem categoria.')} />
        </div>
      ))}
    </div>
  )
  return (
    <div className="pf-bloco">
      <Cabeca titulo="Categorias" sub="Servem para entender para onde o dinheiro vai. Pode mudar à vontade.">
        <AsyncButton className="btn s" onClick={restaurar}>Recolocar as padrão</AsyncButton>
      </Cabeca>
      <div className="pf-duas">{grupo('saida', 'Saídas')}{grupo('entrada', 'Entradas')}</div>
      {modal ? <ModalCategoria categoria={modal.categoria} tipoInicial={modal.tipoInicial} onClose={() => setModal(null)} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------- contas a pagar
export function CompromissosBloco({ itens, categorias }) {
  const [modal, setModal] = useState(false)
  const apagar = useApagar('pf_compromissos', 'Conta apagada.')
  const total = itens.reduce((a, c) => a + c.valor_cent, 0)
  const cat = (id) => categorias.find((c) => c.id === id)
  return (
    <div className="pf-bloco">
      <Cabeca titulo="Contas a pagar" sub={itens.length ? `${itens.length} em aberto, ${brl(total)} no total.` : 'Aluguel, internet, faculdade, o que vence e ainda não foi pago.'}>
        <button type="button" className="btn s p" onClick={() => setModal(true)}><Icon name="plus" size={13} stroke={2.2} />Conta</button>
      </Cabeca>
      {itens.length ? itens.map((c) => (
        <div className="pf-linha" key={c.id}>
          <div className="pf-dia" aria-hidden="true"><b className="num">{c.vencimento.slice(8)}</b><span>{c.vencimento.slice(5, 7)}/{c.vencimento.slice(2, 4)}</span></div>
          <div className="pf-meio">
            <span className="pf-nome">{c.descricao}</span>
            <span className="row" style={{ gap: 6 }}>
              <Badge kind={PRIORIDADE_COR[c.prioridade]} dot={false}>{PRIORIDADES[c.prioridade]}</Badge>
              {c.recorrencia !== 'unica' ? <Badge dot={false}>{RECORRENCIAS[c.recorrencia]}</Badge> : null}
              {cat(c.categoria_id) ? <span className="lbl">{cat(c.categoria_id).nome}</span> : null}
            </span>
          </div>
          <span className="pf-valor num">{brl(c.valor_cent)}</span>
          <Acoes rotulo={c.descricao} onApagar={() => apagar(c.id, c.descricao)} />
        </div>
      )) : <Empty icon="down">Nenhuma conta em aberto cadastrada.</Empty>}
      {modal ? <ModalCompromisso categorias={categorias} onClose={() => setModal(false)} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------- parcelamentos
export function ParcelamentosBloco({ itens, contas, categorias }) {
  const [modal, setModal] = useState(false)
  const apagar = useApagar('pf_parcelamentos', 'Parcelamento apagado.')
  return (
    <div className="pf-bloco">
      <Cabeca titulo="Parcelamentos em andamento" sub="Compras no cartão, carnês, financiamentos.">
        <button type="button" className="btn s p" onClick={() => setModal(true)}><Icon name="plus" size={13} stroke={2.2} />Parcelamento</button>
      </Cabeca>
      {itens.length ? itens.map((p) => {
        const r = resumoParcelamento(p)
        const feitas = p.parcela_atual
        return (
          <div className="pf-linha tall" key={p.id}>
            <div className="pf-meio">
              <span className="pf-nome">{p.descricao}</span>
              <span className="lbl">
                {p.forma === 'cartao' ? contas.find((c) => c.id === p.conta_id)?.nome || 'Cartão' : 'Carnê ou boleto'}
                {r.restantes ? ` · termina em ${dm(r.terminaEm)}/${r.terminaEm.slice(0, 4)}` : ''}
              </span>
              <div className="pf-prog" aria-label={`${feitas} de ${p.n_parcelas} parcelas pagas`}>
                <i style={{ width: `${(feitas / p.n_parcelas) * 100}%` }} />
              </div>
            </div>
            <div className="pf-dir">
              <span className="pf-valor num">{brl(p.valor_parcela_cent)}</span>
              <span className="lbl num">{feitas}/{p.n_parcelas} · faltam {brl(r.falta)}</span>
            </div>
            <Acoes rotulo={p.descricao} onApagar={() => apagar(p.id, p.descricao, 'As parcelas em aberto dele somem junto.')} />
          </div>
        )
      }) : <Empty icon="folder">Nenhum parcelamento em andamento.</Empty>}
      {modal ? <ModalParcelamento contas={contas} categorias={categorias} onClose={() => setModal(false)} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------- dívidas
export function DividasBloco({ itens }) {
  const [modal, setModal] = useState(false)
  const apagar = useApagar('pf_dividas', 'Dívida apagada.')
  const total = itens.reduce((a, d) => a + d.saldo_devedor_cent, 0)
  return (
    <div className="pf-bloco">
      <Cabeca titulo="Dívidas" sub={itens.length ? `${brl(total)} no total.` : 'Empréstimos, cheque especial, acordos, o que não é parcela de compra.'}>
        <button type="button" className="btn s p" onClick={() => setModal(true)}><Icon name="plus" size={13} stroke={2.2} />Dívida</button>
      </Cabeca>
      {itens.length ? itens.map((d) => (
        <div className="pf-linha" key={d.id}>
          <div className="pf-meio">
            <span className="pf-nome">{d.credor}</span>
            <span className="lbl">
              {d.parcela_minima_cent ? `Mínimo ${brl(d.parcela_minima_cent)}` : 'Sem parcela mínima'}
              {d.juros_mes_pct !== null ? ` · ${String(d.juros_mes_pct).replace('.', ',')}% ao mês` : ''}
              {d.dia_venc ? ` · vence dia ${d.dia_venc}` : ''}
            </span>
          </div>
          <span className="pf-valor num">{brl(d.saldo_devedor_cent)}</span>
          <Acoes rotulo={d.credor} onApagar={() => apagar(d.id, d.credor)} />
        </div>
      )) : <Empty icon="shield">Nenhuma dívida cadastrada.</Empty>}
      {modal ? <ModalDivida onClose={() => setModal(false)} /> : null}
    </div>
  )
}
