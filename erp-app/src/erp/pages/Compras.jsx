import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { insert, update, remove, notify, emitChange } from '../lib/data'
import { useWorld } from '../lib/world'
import { brl, dmy, today } from '../lib/format'
import { NOMES, progressoCompra, podeComprometer, saidasDaCompra } from '../lib/caixinhas'
import { validarValor } from '../lib/financeiro'
import { PageHead, Kpi, Card, Bar, Loading, ErrorBox, Modal, Field, Select, MoneyInput, AsyncButton, Badge, Empty, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'

const PRIORIDADES = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const PESO = { alta: 0, media: 1, baixa: 2 }
const COR = { alta: 'r', media: 'y', baixa: '' }
const DE = { invest: NOMES.invest, caixa: NOMES.caixa }

// Compras da Zinkra: lista do que se quer comprar. O dinheiro vem das caixinhas da empresa:
// dá para COMPROMETER parte do saldo com um item (continua na caixinha, mas fica reservado) ou só guardar.
// Comprar registra UMA saída: nas caixinhas e no fluxo de caixa (categoria Compras), sem lançar duas vezes.
export default function Compras() {
  useMeta('Financeiro', 'Compras')
  const auth = useAuth()
  const confirm = useConfirm()
  const { data: w, loading, error, reload } = useWorld()
  const [modal, setModal] = useState(null)
  const canEdit = auth.canEdit('financeiro')
  const canDelete = auth.isTotal('financeiro')
  const cx = w?.caixinhas

  const { abertas, compradas, descartadas } = useMemo(() => {
    if (!cx) return { abertas: [], compradas: [], descartadas: [] }
    const por = (s) => cx.compras.filter((c) => c.status === s)
    return {
      abertas: por('desejo').sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || String(a.created_at).localeCompare(String(b.created_at))),
      compradas: por('comprada').sort((a, b) => String(b.comprada_em).localeCompare(String(a.comprada_em))),
      descartadas: por('descartada'),
    }
  }, [cx])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !w) return <div className="page"><Loading rows={5} /></div>

  const fechar = () => setModal(null)
  const reservasDe = (c) => cx.reservas.filter((r) => r.compra_id === c.id)
  const totalAbertas = abertas.reduce((a, c) => a + c.valor_cents, 0)
  const comprometido = abertas.reduce((a, c) => a + progressoCompra(c, cx.reservas).reservado, 0)
  const apagar = async (c) => {
    if (await confirm(`Apagar "${c.nome}"?${c.status === 'comprada' ? ' O gasto some do fluxo de caixa e o dinheiro volta para a caixinha.' : ''}`, { ok: 'Apagar', danger: true })) await remove('compras', c.id)
  }
  const liberar = async (r) => { await remove('compras_reservas', r.id) }

  return (
    <div className="page">
      <PageHead title="Compras" sub="O que a Zinkra quer comprar e quanto do dinheiro guardado já está comprometido com cada item">
        {canEdit ? <button type="button" className="btn p" onClick={() => setModal({ tipo: 'compra' })}><Icon name="plus" size={14} />Nova compra</button> : null}
      </PageHead>

      <section className="grid-kpi" aria-label="Resumo das compras">
        <Kpi label="Investimento livre" value={brl(cx.saldos.invest.livre)} hint={`saldo ${brl(cx.saldos.invest.saldo)} · ${brl(cx.saldos.invest.comprometido)} comprometido`} accent />
        <Kpi label="Caixa da Zinkra livre" value={brl(cx.saldos.caixa.livre)} hint={`saldo ${brl(cx.saldos.caixa.saldo)}`} />
        <Kpi label="Na lista de desejos" value={brl(totalAbertas)} hint={`${abertas.length} item(ns)`} />
        <Kpi label="Já comprometido" value={brl(comprometido)} hint={totalAbertas ? `falta ${brl(Math.max(0, totalAbertas - comprometido))} para cobrir tudo` : 'nada na lista'} />
      </section>

      {!cx.configs.length ? <div className="note y">Rode o arquivo <span className="num">supabase/erp-caixinhas.sql</span> no SQL Editor do Supabase para ativar as caixinhas e as compras.</div> : null}
      <p className="lbl">O saldo vem das <Link to="/erp/financeiro/caixinhas" style={{ color: 'var(--green-tx)' }}>Caixinhas</Link>. Comprometer não tira o dinheiro: só reserva para o item. Você também pode não comprometer nada e deixar guardado.</p>

      {abertas.length ? abertas.map((c) => {
        const p = progressoCompra(c, cx.reservas)
        const rs = reservasDe(c)
        return (
          <Card key={c.id} pad title={<h2>{c.nome} {c.link ? <a href={c.link} target="_blank" rel="noreferrer" aria-label="Abrir link do produto" style={{ color: 'var(--green-tx)' }}><Icon name="link" size={13} /></a> : null}</h2>}
            action={<><Badge kind={COR[c.prioridade]} dot={false}>prioridade {PRIORIDADES[c.prioridade].toLowerCase()}</Badge>{canEdit ? <button type="button" className="btn s ic g" aria-label="Editar compra" onClick={() => setModal({ tipo: 'compra', editar: c })}><Icon name="edit" size={13} /></button> : null}</>}>
            <div className="stack">
              <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span className="num" style={{ fontSize: 18 }}>{brl(p.reservado)} <span className="lbl">de {brl(p.alvo)}</span></span>
                <span className="lbl">{p.completo ? 'valor todo comprometido' : `${p.pct}% · falta ${brl(p.falta)} (${100 - p.pct}%)`}</span>
              </div>
              <Bar value={p.pct} large />
              {c.notes ? <span className="lbl">{c.notes}</span> : null}
              {rs.length ? (
                <ul className="lbl" style={{ margin: 0, paddingLeft: 18 }}>
                  {rs.map((r) => (
                    <li key={r.id}>{brl(r.amount_cents)} de {NOMES[r.caixinha]} {canEdit ? <button type="button" className="btn s g" onClick={() => liberar(r)}>Liberar</button> : null}</li>
                  ))}
                </ul>
              ) : <span className="lbl">Nada comprometido ainda: o dinheiro segue guardado nas caixinhas.</span>}
              {canEdit ? (
                <div className="fin-acoes">
                  <button type="button" className="btn" disabled={!p.falta} onClick={() => setModal({ tipo: 'comprometer', compra: c })}><Icon name="shield" size={14} />Comprometer saldo</button>
                  <button type="button" className="btn p" onClick={() => setModal({ tipo: 'comprada', compra: c })}><Icon name="check" size={14} />Marcar como comprada</button>
                  <button type="button" className="btn g" onClick={async () => { await update('compras', c.id, { status: 'descartada' }); notify('Item descartado. O que estava comprometido voltou para livre.', 'ok') }}>Desistir</button>
                </div>
              ) : null}
            </div>
          </Card>
        )
      }) : <div className="card"><Empty icon="money">Nenhuma compra na lista. Registre o que você quer comprar para a Zinkra (um suporte de monitor, um tripé...) em "Nova compra".</Empty></div>}

      {compradas.length ? (
        <Card pad title={<h2>Já compradas</h2>} action={<span className="lbl">{brl(compradas.reduce((a, c) => a + c.pago_cents, 0))} no total</span>}>
          <ol className="fin-tempo">
            {compradas.map((c) => {
              const s = saidasDaCompra(c, cx.reservas)
              return (
                <li key={c.id} className="fin-ev red">
                  <span className="fin-ev-ic"><Icon name="check" size={13} /></span>
                  <div className="fin-ev-m"><span className="fin-ev-t">{c.nome}</span><span className="lbl num">{dmy(c.comprada_em)} · saiu {[s.invest ? `${brl(s.invest)} do investimento` : '', s.caixa ? `${brl(s.caixa)} do caixa` : ''].filter(Boolean).join(' e ')}</span></div>
                  <span className="num fin-ev-v" style={{ color: 'var(--red)' }}>− {brl(c.pago_cents)}</span>
                  {canDelete ? <button type="button" className="btn s ic g" aria-label="Apagar compra" onClick={() => apagar(c)}><Icon name="trash" size={13} /></button> : null}
                </li>
              )
            })}
          </ol>
        </Card>
      ) : null}

      {descartadas.length ? (
        <p className="lbl">Descartadas: {descartadas.map((c) => c.nome).join(', ')}. {canEdit ? <button type="button" className="btn s g" onClick={async () => { for (const c of descartadas) await update('compras', c.id, { status: 'desejo' }, { silent: true }); emitChange('compras'); notify('Voltaram para a lista.', 'ok') }}>Trazer de volta</button> : null}</p>
      ) : null}

      {modal?.tipo === 'compra' ? <CompraModal editar={modal.editar} onClose={fechar} onApagar={modal.editar && canDelete ? () => { fechar(); apagar(modal.editar) } : null} /> : null}
      {modal?.tipo === 'comprometer' ? <ComprometerModal compra={modal.compra} cx={cx} onClose={fechar} /> : null}
      {modal?.tipo === 'comprada' ? <CompradaModal compra={modal.compra} reservas={reservasDe(modal.compra)} onClose={fechar} /> : null}
    </div>
  )
}

function Rodape({ onClose, salvar, texto = 'Salvar' }) {
  return <><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>{texto}</AsyncButton></>
}

function CompraModal({ editar, onClose, onApagar }) {
  const [f, setF] = useState({ nome: editar?.nome || '', valor: editar?.valor_cents || 0, link: editar?.link || '', prioridade: editar?.prioridade || 'media', notes: editar?.notes || '' })
  const [erro, setErro] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const salvar = async () => {
    const e = !f.nome.trim() ? 'Dê um nome para a compra.' : validarValor(f.valor)
    setErro(e)
    if (e) return
    const row = { nome: f.nome.trim(), valor_cents: f.valor, link: f.link.trim() || null, prioridade: f.prioridade, notes: f.notes.trim() || null }
    if (editar) await update('compras', editar.id, row)
    else await insert('compras', row)
    notify('Compra salva.', 'ok')
    onClose()
  }
  return (
    <Modal title={editar ? 'Editar compra' : 'Nova compra'} onClose={onClose} footer={<>{onApagar ? <button type="button" className="btn g" onClick={onApagar}>Apagar</button> : null}<Rodape onClose={onClose} salvar={salvar} /></>}>
      <div className="stack">
        <div className="fields">
          <Field label="O que quer comprar"><input className="in" autoFocus placeholder="Ex.: Tripé para gravar vídeo" value={f.nome} onChange={(e) => set('nome')(e.target.value)} /></Field>
          <Field label="Valor estimado"><MoneyInput value={f.valor} onChange={set('valor')} /></Field>
          <Field label="Prioridade"><Select value={f.prioridade} onChange={(v) => set('prioridade')(v || 'media')} options={PRIORIDADES} /></Field>
          <Field label="Link (opcional)"><input className="in" placeholder="https://" value={f.link} onChange={(e) => set('link')(e.target.value)} /></Field>
        </div>
        <Field label="Observação (como isso ajuda o trabalho)"><input className="in" value={f.notes} onChange={(e) => set('notes')(e.target.value)} /></Field>
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}

function ComprometerModal({ compra, cx, onClose }) {
  const [caixinha, setCaixinha] = useState('invest')
  const max = podeComprometer(compra, cx.reservas, cx.saldos, caixinha)
  const [valor, setValor] = useState(0)
  const [erro, setErro] = useState('')
  const salvar = async () => {
    const e = validarValor(valor) || (valor > max ? `No máximo ${brl(max)} (o que está livre na caixinha e o que ainda falta do item).` : '')
    setErro(e)
    if (e) return
    await insert('compras_reservas', { compra_id: compra.id, caixinha, amount_cents: valor })
    notify('Saldo comprometido com o item.', 'ok')
    onClose()
  }
  return (
    <Modal title={`Comprometer saldo · ${compra.nome}`} size="sm" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} texto="Comprometer" />}>
      <div className="stack">
        <p className="lbl">O dinheiro continua na caixinha, mas fica reservado para este item e não pode ser sacado nem comprometido com outro.</p>
        <Field label="De qual caixinha" hint={`${brl(cx.saldos[caixinha].livre)} livre`}><Select value={caixinha} onChange={(v) => { setCaixinha(v || 'invest'); setValor(0) }} options={DE} /></Field>
        <Field label="Quanto" hint={`pode até ${brl(max)}`}>
          <div className="row" style={{ gap: 8 }}>
            <MoneyInput value={valor} onChange={setValor} />
            <button type="button" className="btn s" onClick={() => setValor(max)} disabled={!max}>Usar o máximo</button>
          </div>
        </Field>
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}

function CompradaModal({ compra, reservas, onClose }) {
  const [f, setF] = useState({ pago: compra.valor_cents, data: today(), de: 'invest' })
  const [erro, setErro] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const previa = saidasDaCompra({ ...compra, status: 'comprada', pago_cents: f.pago, pago_de: f.de }, reservas)
  const salvar = async () => {
    const e = validarValor(f.pago) || (!f.data ? 'Informe a data da compra.' : '')
    setErro(e)
    if (e) return
    await update('compras', compra.id, { status: 'comprada', pago_cents: f.pago, comprada_em: f.data, pago_de: f.de })
    notify('Compra registrada: saiu das caixinhas e entrou no fluxo de caixa uma vez só.', 'ok')
    onClose()
  }
  return (
    <Modal title={`Comprei · ${compra.nome}`} size="sm" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} texto="Registrar compra" />}>
      <div className="stack">
        <div className="fields">
          <Field label="Quanto pagou de verdade"><MoneyInput value={f.pago} onChange={set('pago')} /></Field>
          <Field label="Data"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
          <Field label="O que passar do comprometido sai de"><Select value={f.de} onChange={(v) => set('de')(v || 'invest')} options={DE} /></Field>
        </div>
        <p className="lbl">Vai sair {previa.invest ? `${brl(previa.invest)} do investimento` : ''}{previa.invest && previa.caixa ? ' e ' : ''}{previa.caixa ? `${brl(previa.caixa)} do caixa` : ''}. Primeiro usa o que estava comprometido com o item.</p>
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}
