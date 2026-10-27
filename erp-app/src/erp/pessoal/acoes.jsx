import React, { useState } from 'react'
import { Modal, Field, Select, MoneyInput, AsyncButton, Seg } from '../components/ui'
import { notify, update } from '../lib/data'
import { brl, dmy } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { contaPadrao, registrarGasto, gastoNoCartao, pagarCompromisso, pagarParcela, pagarDivida, cancelarCompromisso, categoriaReserva, anteciparParcelas, lerParcelasDoParcelamento } from '../lib/pf/nucleo'
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
  const cartoes = contas.filter((c) => c.tipo === 'cartao' && c.ativo)
  const [com, setCom] = useState('conta')
  const [cartao, setCartao] = useState(cartoes[0]?.id || null)
  const reserva = categoriaReserva(categorias)
  const opcoes = categorias.filter((c) => c.tipo === 'saida' && c.ativo !== false && c.id !== reserva?.id)
  const salvar = async () => {
    if (!valor) return notify('Informe quanto foi o gasto.', 'err')
    if (com === 'cartao' && cartao) await gastoNoCartao({ contaId: cartao, data: hojeSP(), valorCent: valor, categoriaId: cat, descricao: desc.trim() })
    else await registrarGasto({ valorCent: valor, categoriaId: cat, contaId: contaPadrao(contas)?.id, descricao: desc.trim(), data: hojeSP() })
    notify(com === 'cartao' ? `Gasto de ${brl(valor)} lançado na fatura do cartão.` : `Gasto de ${brl(valor)} registrado.`, 'ok')
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
      {cartoes.length ? (
        <Field label="Pago com">
          <Seg value={com} onChange={setCom} options={[['conta', 'Conta ou dinheiro'], ['cartao', 'Cartão']]} />
          {com === 'cartao' && cartoes.length > 1 ? <Select value={cartao} onChange={setCartao} options={cartoes.map((c) => [c.id, c.nome])} /> : null}
        </Field>
      ) : null}
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
    else if (item.tipo === 'divida') await pagarDivida(item.ref, { data: f.data, valorCent: f.valor, contaId: f.baixa ? null : f.conta })
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

// ---------------------------------------------------------------- antecipar parcelas (várias de uma vez)
export function ModalAntecipar({ parcelamento, contas, onClose }) {
  const [parcelas, setParcelas] = useState(null)
  const [sel, setSel] = useState([])
  const [data, setData] = useState(hojeSP())
  const [conta, setConta] = useState(contaPadrao(contas)?.id || null)
  const correntes = contas.filter((c) => c.ativo && c.tipo !== 'cartao')
  React.useEffect(() => { lerParcelasDoParcelamento(parcelamento.id).then(setParcelas).catch(() => setParcelas([])) }, [parcelamento.id])
  const total = (parcelas || []).filter((p) => sel.includes(p.id)).reduce((s, p) => s + Number(p.valor_cent), 0)
  const alterna = (id) => setSel((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  // marcar a parcela n marca também todas as anteriores em aberto (antecipar é pagar as próximas em sequência)
  const ate = (p) => setSel(parcelas.filter((x) => x.numero <= p.numero).map((x) => x.id))
  const salvar = async () => {
    if (!sel.length) return notify('Marque as parcelas que quer pagar agora.', 'err')
    await anteciparParcelas(sel, { data, contaId: conta })
    notify(`${sel.length} ${sel.length === 1 ? 'parcela paga' : 'parcelas pagas'}: ${brl(total)}.`, 'ok')
    onClose(true)
  }
  return (
    <Modal size="sm" title={`Antecipar: ${parcelamento.descricao}`} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar, `Pagar ${brl(total)}`)}>
      {parcelas === null ? <span className="lbl">Carregando as parcelas…</span> : (
        <div className="pf-check">
          {parcelas.map((p) => (
            <label key={p.id} className={`pf-check-item ${sel.includes(p.id) ? '' : ''}`}>
              <input type="checkbox" checked={sel.includes(p.id)} onChange={() => alterna(p.id)} />
              <span className="pf-check-t"><span>Parcela {p.numero}/{parcelamento.n_parcelas}</span><small>vence {dmy(p.vencimento)}</small></span>
              <span className="num">{brl(p.valor_cent)}</span>
              <button type="button" className="btn s g" onClick={(e) => { e.preventDefault(); ate(p) }}>até aqui</button>
            </label>
          ))}
        </div>
      )}
      <div className="fields">
        <Field label="Pago em"><input type="date" className="in" value={data} onChange={(e) => setData(e.target.value)} /></Field>
        {correntes.length > 1 ? <Field label="Saiu de qual conta"><Select value={conta} onChange={setConta} options={correntes.map((c) => [c.id, c.nome])} /></Field> : null}
      </div>
      <span className="lbl">Cada parcela vira um lançamento. Se pagou menos por causa de desconto, ajuste o valor depois em Lançamentos.</span>
    </Modal>
  )
}
