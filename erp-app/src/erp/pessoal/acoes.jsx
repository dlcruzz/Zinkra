import React, { useState } from 'react'
import { Modal, Field, Select, MoneyInput, AsyncButton, Seg } from '../components/ui'
import { notify, update } from '../lib/data'
import { brl, dmy } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { contaPadrao, registrarGasto, pagarCompromisso, pagarParcela, cancelarCompromisso, categoriaReserva } from '../lib/pf/nucleo'
import { encargosDeAtraso } from '../lib/pf/motor'

const rodape = (onClose, salvar, rotulo) => (
  <>
    <button type="button" className="btn" onClick={onClose}>Cancelar</button>
    <AsyncButton className="btn p" onClick={salvar}>{rotulo}</AsyncButton>
  </>
)

// ---------------------------------------------------------------- + Gasto (valor, categoria, ok)
export function ModalGasto({ categorias, contas, onClose }) {
  const [valor, setValor] = useState(0)
  const [cat, setCat] = useState(null)
  const [desc, setDesc] = useState('')
  const reserva = categoriaReserva(categorias)
  const opcoes = categorias.filter((c) => c.tipo === 'saida' && c.ativo !== false && c.id !== reserva?.id)
  const salvar = async () => {
    if (!valor) return notify('Informe quanto foi o gasto.', 'err')
    await registrarGasto({ valorCent: valor, categoriaId: cat, contaId: contaPadrao(contas)?.id, descricao: desc.trim(), data: hojeSP() })
    notify(`Gasto de ${brl(valor)} registrado.`, 'ok')
    onClose(true)
  }
  return (
    <Modal size="sm" title="Registrar gasto" onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar, 'Registrar')}>
      <Field label="Quanto foi (R$)">
        <MoneyInput value={valor} onChange={setValor} autoFocus aria-label="Valor do gasto" className="in num pf-gasto-valor"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvar().catch(() => {}) } }} />
      </Field>
      <Field label="Em quê">
        <div className="pf-chips" role="radiogroup" aria-label="Categoria do gasto">
          {opcoes.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(cat === c.id ? null : c.id)}>
              <i style={{ background: c.cor }} aria-hidden="true" />{c.nome}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Anotação (opcional)"><input className="in" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: almoço, uber" /></Field>
    </Modal>
  )
}

// ---------------------------------------------------------------- pagar uma conta ou parcela
// `item` vem do motor (normalizarObrigacoes): { id, ref, tipo, descricao, valor_cent, vencimento, multa_pct, juros_dia_pct }
export function ModalPagar({ item, contas, onClose }) {
  const hoje = hojeSP()
  const encargos = encargosDeAtraso(item, hoje)
  const correntes = contas.filter((c) => c.ativo && c.tipo !== 'cartao')
  const [f, setF] = useState({ data: hoje, valor: item.valor_cent + encargos, conta: contaPadrao(contas)?.id || null, baixa: false })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const salvar = async () => {
    if (!f.data) return notify('Informe a data do pagamento.', 'err')
    if (!f.baixa && !f.valor) return notify('Informe o valor pago.', 'err')
    const args = { data: f.data, valorCent: f.valor, contaId: f.conta, gerar: !f.baixa }
    if (item.tipo === 'parcela') await pagarParcela(item.ref, args)
    else await pagarCompromisso(item.ref, args)
    notify(f.baixa ? 'Conta marcada como paga.' : `Pago ${brl(f.valor)}. O lançamento foi criado.`, 'ok')
    onClose(true)
  }
  return (
    <Modal size="sm" title={`Pagar: ${item.descricao}`} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar, 'Marcar como paga')}>
      <div className="note">
        Vence em {dmy(item.vencimento)}, {brl(item.valor_cent)}.
        {encargos ? <> Está atrasada: com multa e juros até hoje dá <b>{brl(item.valor_cent + encargos)}</b>.</> : null}
      </div>
      <div className="fields">
        <Field label="Pago em"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
        <Field label="Valor pago (R$)"><MoneyInput value={f.valor} onChange={set('valor')} disabled={f.baixa} /></Field>
      </div>
      {correntes.length > 1 && !f.baixa ? <Field label="Saiu de qual conta"><Select value={f.conta} onChange={set('conta')} options={correntes.map((c) => [c.id, c.nome])} /></Field> : null}
      <label className="check"><input type="checkbox" checked={f.baixa} onChange={(e) => set('baixa')(e.target.checked)} />Já paguei antes: só dar baixa, sem lançar na conta</label>
    </Modal>
  )
}

// ---------------------------------------------------------------- cancelar conta (só esta ou a série)
export function ModalCancelar({ conta, onClose }) {
  const repete = conta.recorrencia !== 'unica' || Boolean(conta.origem_id)
  const [modo, setModo] = useState('esta')
  const salvar = async () => {
    await cancelarCompromisso(conta, { serie: modo === 'serie', hoje: hojeSP() })
    notify(modo === 'serie' ? 'Conta encerrada: as próximas não serão mais criadas.' : 'Conta cancelada.', 'ok')
    onClose(true)
  }
  return (
    <Modal size="sm" title={`Cancelar "${conta.descricao}"`} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar, 'Cancelar conta')}>
      <p className="lbl">A conta sai do cálculo e do calendário. Ela fica no histórico como cancelada.</p>
      {repete ? (
        <Field label="O que cancelar"><Seg value={modo} onChange={setModo} options={[['esta', 'Só esta'], ['serie', 'Esta e as próximas']]} /></Field>
      ) : null}
    </Modal>
  )
}

// ---------------------------------------------------------------- editar lançamento
export function ModalLancamento({ lancamento, categorias, contas, onClose, onApagar }) {
  const [f, setF] = useState({
    data: lancamento.data, valor: Math.abs(lancamento.valor_cent), desc: lancamento.descricao || '', cat: lancamento.categoria_id, conta: lancamento.conta_id,
  })
  const entrada = lancamento.valor_cent > 0
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const ligado = Boolean(lancamento.compromisso_id || lancamento.parcela_id)
  const salvar = async () => {
    if (!f.valor) return notify('Informe o valor.', 'err')
    await update('pf_lancamentos', lancamento.id, {
      data: f.data, valor_cent: entrada ? f.valor : -f.valor, descricao: f.desc.trim(), categoria_id: f.cat || null, conta_id: f.conta || null,
    })
    notify('Lançamento atualizado.', 'ok')
    onClose(true)
  }
  const correntes = contas.filter((c) => c.ativo && c.tipo !== 'cartao')
  return (
    <Modal size="sm" title={entrada ? 'Editar entrada' : 'Editar gasto'} onClose={() => onClose(false)}
      footer={(
        <>
          <button type="button" className="btn danger" onClick={onApagar}>{ligado ? 'Desfazer pagamento' : 'Apagar'}</button>
          <AsyncButton className="btn p" onClick={salvar}>Salvar</AsyncButton>
        </>
      )}>
      <div className="fields">
        <Field label="Valor (R$)"><MoneyInput value={f.valor} onChange={set('valor')} /></Field>
        <Field label="Data"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
      </div>
      <Field label="Descrição"><input className="in" value={f.desc} onChange={(e) => set('desc')(e.target.value)} /></Field>
      <div className="fields">
        <Field label="Categoria"><Select value={f.cat} onChange={set('cat')} placeholder="Sem categoria" options={categorias.filter((c) => c.tipo === (entrada ? 'entrada' : 'saida')).map((c) => [c.id, c.nome])} /></Field>
        {correntes.length > 1 ? <Field label="Conta"><Select value={f.conta} onChange={set('conta')} options={correntes.map((c) => [c.id, c.nome])} /></Field> : null}
      </div>
      {ligado ? <span className="note y">Esse lançamento pagou uma conta. Se apagar, a conta volta para "em aberto".</span> : null}
    </Modal>
  )
}
