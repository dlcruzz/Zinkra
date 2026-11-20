import React, { useMemo, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { insert, update, remove, notify, emitChange } from '../lib/data'
import { useWorld } from '../lib/world'
import { brl, dmy, today } from '../lib/format'
import { ORDEM, ZINKRA, DANILO, NOMES, DESCRICAO, PADRAO, validarPercentuais, validarSaque, extrato, configEm, pctDaConfig, ajusteParaBanco } from '../lib/caixinhas'
import { validarValor } from '../lib/financeiro'
import { PageHead, Kpi, Card, Seg, Loading, ErrorBox, Modal, Field, Select, MoneyInput, AsyncButton, Badge, Empty, useConfirm } from '../components/ui'
import { Icon } from '../lib/icons'

const pctTxt = (n) => `${Number(n).toLocaleString('pt-BR')}%`
const opcoesCaixinha = Object.fromEntries(ZINKRA.map((k) => [k, NOMES[k]]))
const curto = (k) => NOMES[k].replace('Danilo · ', '').replace(' da Zinkra', '')

// Caixinhas: cada real que entra (projeto ou SaaS) é dividido pelos percentuais vigentes.
// O ERP calcula a divisão; aqui o Danilo confirma o que já moveu no banco e registra saques e transferências.
export default function Caixinhas() {
  useMeta('Financeiro', 'Caixinhas')
  const auth = useAuth()
  const confirm = useConfirm()
  const { data: w, loading, error, reload } = useWorld()
  const [filtro, setFiltro] = useState('todas')
  const [modal, setModal] = useState(null)
  const canEdit = auth.canEdit('financeiro')
  const canDelete = auth.isTotal('financeiro')

  const cx = w?.caixinhas
  const linhas = useMemo(() => (cx ? extrato({ caixinha: filtro === 'todas' ? null : filtro, entradas: cx.entradas, movimentos: cx.movimentos, compras: cx.compras, reservas: cx.reservas }).filter((l) => ZINKRA.includes(l.caixinha)) : []), [cx, filtro])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !w) return <Loading page rows={5} />

  const fechar = () => setModal(null)
  const pendentes = cx.entradas.filter((e) => !e.repassado)
  const vigente = configEm(cx.configs, today()) || cx.configs[cx.configs.length - 1]
  // a parte do Danilo não fica registrada: é só o aviso do que ainda falta mandar para ele
  const paraMandar = DANILO.reduce((o, k) => ({ ...o, [k]: pendentes.reduce((a, e) => a + e.partes[k], 0) }), {})

  const repassar = async (lista) => {
    for (const e of lista) await insert('caixinha_repasses', { origem_tipo: e.origem_tipo, origem_id: e.origem_id, repassado_em: today() }, { silent: true })
    emitChange('caixinha_repasses')
    notify(lista.length > 1 ? 'Todos marcados como movidos no banco.' : 'Marcado como movido no banco.', 'ok')
  }
  const desfazerRepasse = async (e) => { await remove('caixinha_repasses', e.repasse.id) }
  const apagarMov = async (m) => {
    if (await confirm(m.tipo === 'saida' ? 'Apagar este saque? O saldo volta, mas o apagamento fica no histórico de alterações.' : 'Apagar este lançamento?', { ok: 'Apagar', danger: true })) {
      if (m.grupo) {
        for (const par of cx.movimentos.filter((x) => x.grupo === m.grupo)) await remove('caixinha_movimentos', par.id, { quiet: true })
        notify('Transferência apagada.', 'ok')
      } else await remove('caixinha_movimentos', m.id)
    }
  }

  return (
    <div className="page">
      <PageHead title="Caixinhas" sub="Só o dinheiro da Zinkra fica registrado aqui (caixa e investimento). A parte que é sua só aparece como aviso do que mandar">
        {canEdit ? <>
          <button type="button" className="btn" onClick={() => setModal({ tipo: 'banco' })}><Icon name="check" size={14} />Atualizar saldo do banco</button>
          <button type="button" className="btn" onClick={() => setModal({ tipo: 'percentuais' })}><Icon name="sliders" size={14} />Percentuais</button>
          <button type="button" className="btn" onClick={() => setModal({ tipo: 'movimento', modo: 'entrada' })}><Icon name="plus" size={14} />Adicionar saldo</button>
          <button type="button" className="btn" onClick={() => setModal({ tipo: 'movimento', modo: 'transferencia' })}><Icon name="arrow" size={14} />Mover entre caixinhas</button>
          <button type="button" className="btn p" onClick={() => setModal({ tipo: 'movimento', modo: 'saque' })}><Icon name="up" size={14} />Sacar</button>
        </> : null}
      </PageHead>

      {!cx.configs.length ? (
        <div className="note y">Nenhuma regra de divisão encontrada. Rode o arquivo <span className="num">supabase/erp-caixinhas.sql</span> no SQL Editor do Supabase e atualize. Se já rodou, crie a primeira regra em "Percentuais".</div>
      ) : null}

      <section className="grid-kpi" aria-label="Saldo das caixinhas">
        {ZINKRA.map((k) => {
          const s = cx.saldos[k]
          const dica = [s.comprometido ? `${brl(s.livre)} livre · ${brl(s.comprometido)} comprometido` : 'tudo livre', s.paradoNaConta ? `${brl(s.paradoNaConta)} ainda na conta` : null].filter(Boolean).join(' · ')
          return <Kpi key={k} label={NOMES[k]} value={brl(s.saldo)} hint={dica} accent />
        })}
        <Kpi label="Para mandar a você" value={brl(paraMandar.gastar + paraMandar.guardar)} hint={paraMandar.gastar + paraMandar.guardar ? `para gastar ${brl(paraMandar.gastar)} · para guardar ${brl(paraMandar.guardar)}` : 'nada para mandar agora'} />
      </section>

      {vigente ? (
        <p className="lbl">Divisão em vigor desde {dmy(vigente.vigente_desde)}: {ORDEM.map((k) => `${NOMES[k]} ${pctTxt(vigente[`pct_${k}`])}`).join(' · ')}. A comissão do parceiro sai antes de dividir. As duas partes suas viram só aviso para mandar.</p>
      ) : null}

      <Card pad title={<h2>Para mover no banco</h2>} action={pendentes.length && canEdit ? <AsyncButton className="btn s" onClick={() => repassar(pendentes)}>Marcar todos como movidos</AsyncButton> : null}>
        {pendentes.length ? (
          <ol className="fin-tempo">
            {pendentes.map((e) => (
              <li key={e.chave} className="fin-ev green" style={{ alignItems: 'flex-start' }}>
                <span className="fin-ev-ic"><Icon name="down" size={13} /></span>
                <div className="fin-ev-m">
                  <span className="fin-ev-t">Entrou {brl(e.bruto)} · {e.titulo}</span>
                  <span className="lbl num">{dmy(e.data)}{e.comissao ? ` · comissão do parceiro ${brl(e.comissao)} fora · dividindo ${brl(e.base)}` : ''}</span>
                  <span className="num" style={{ fontSize: 13 }}>Mandar para você: gastar {brl(e.partes.gastar)} · guardar {brl(e.partes.guardar)}</span>
                  <span className="num" style={{ fontSize: 13 }}>Mover na Zinkra: Caixa {brl(e.partes.caixa)} · Investimento {brl(e.partes.invest)}</span>
                </div>
                {canEdit ? <AsyncButton className="btn s" onClick={() => repassar([e])}>Já movi no banco</AsyncButton> : null}
              </li>
            ))}
          </ol>
        ) : <p className="lbl">Nada pendente. Quando entrar um recebimento, a divisão aparece aqui para você mover no banco.</p>}
      </Card>

      <Card pad title={<h2>Extrato</h2>} action={<Seg value={filtro} onChange={setFiltro} options={[['todas', 'Todas'], ...ZINKRA.map((k) => [k, curto(k)])]} />}>
        {linhas.length ? (
          <ol className="fin-tempo">
            {linhas.map((l) => (
              <li key={l.id} className={`fin-ev ${l.sinal > 0 ? 'green' : 'red'}`}>
                <span className="fin-ev-ic"><Icon name={l.sinal > 0 ? 'down' : 'up'} size={13} /></span>
                <div className="fin-ev-m">
                  <span className="fin-ev-t">{l.titulo}</span>
                  <span className="lbl num">{dmy(l.data)} · {NOMES[l.caixinha]}{l.detalhe ? ` · ${l.detalhe}` : ''}</span>
                </div>
                <span className="num fin-ev-v" style={l.sinal < 0 ? { color: 'var(--red)' } : undefined}>{l.sinal > 0 ? '+' : '−'} {brl(l.valor)}</span>
                {canDelete && l.mov ? <button type="button" className="btn s ic g" aria-label="Apagar lançamento" onClick={() => apagarMov(l.mov)}><Icon name="trash" size={13} /></button> : null}
              </li>
            ))}
          </ol>
        ) : <Empty icon="money">Nada no extrato ainda. As entradas aparecem sozinhas; saques e transferências você registra nos botões do topo.</Empty>}
      </Card>

      {cx.entradas.some((e) => e.repassado) && canEdit ? (
        <Card pad title={<h2>Já movidos no banco</h2>} action={<span className="lbl">{cx.entradas.filter((e) => e.repassado).length} entrada(s)</span>}>
          <ol className="fin-tempo">
            {cx.entradas.filter((e) => e.repassado).map((e) => (
              <li key={e.chave} className="fin-ev">
                <span className="fin-ev-ic"><Icon name="check" size={13} /></span>
                <div className="fin-ev-m"><span className="fin-ev-t">{e.titulo} · {brl(e.bruto)}</span><span className="lbl num">entrou {dmy(e.data)} · movido em {dmy(e.repasse.repassado_em)}</span></div>
                <button type="button" className="btn s g" onClick={() => desfazerRepasse(e)}>Desmarcar</button>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {modal?.tipo === 'movimento' ? <MovimentoModal modo={modal.modo} saldos={cx.saldos} onClose={fechar} /> : null}
      {modal?.tipo === 'banco' ? <BancoModal saldos={cx.saldos} onClose={fechar} /> : null}
      {modal?.tipo === 'percentuais' ? <PercentuaisModal configs={cx.configs} vigente={vigente} onClose={fechar} /> : null}
    </div>
  )
}

// Acerta o saldo do sistema com o que o banco mostra em cada caixinha da Zinkra. Não pergunta o que aconteceu
// com a diferença: o ajuste entra com a nota fixa "ajuste ao saldo do banco".
function BancoModal({ saldos, onClose }) {
  const [v, setV] = useState(() => Object.fromEntries(ZINKRA.map((k) => [k, saldos[k].saldo - saldos[k].paradoNaConta])))
  const salvar = async () => {
    let n = 0
    for (const k of ZINKRA) {
      const aj = ajusteParaBanco(saldos[k], v[k])
      if (!aj) continue
      await insert('caixinha_movimentos', aj.tipo === 'entrada'
        ? { caixinha: k, tipo: 'entrada', amount_cents: aj.valor, feito_em: today(), descricao: 'Ajuste ao saldo do banco' }
        : { caixinha: k, tipo: 'saida', amount_cents: aj.valor, feito_em: today(), motivo: 'Ajuste ao saldo do banco', destino: 'Ajuste de saldo' }, { silent: true })
      n += 1
    }
    emitChange('caixinha_movimentos')
    notify(n ? 'Saldos atualizados com o valor do banco.' : 'Os saldos já estavam iguais ao banco.', 'ok')
    onClose()
  }
  return (
    <Modal title="Atualizar saldo com o banco" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} />}>
      <div className="stack">
        <p className="lbl">Digite quanto o banco mostra em cada caixinha da Zinkra. O sistema acerta a diferença sozinho. O que ele já dividiu e você ainda não moveu no banco não entra nessa conta.</p>
        <div className="fields">
          {ZINKRA.map((k) => (
            <Field key={k} label={NOMES[k]} hint={saldos[k].paradoNaConta ? `${brl(saldos[k].paradoNaConta)} ainda para mover` : undefined}>
              <MoneyInput value={v[k]} onChange={(x) => setV((o) => ({ ...o, [k]: x }))} />
            </Field>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function Rodape({ onClose, salvar, texto = 'Salvar' }) {
  return <><button type="button" className="btn" onClick={onClose}>Cancelar</button><AsyncButton className="btn p" onClick={salvar}>{texto}</AsyncButton></>
}

// modo: 'saque' (exige motivo e destino), 'entrada' (saldo que já existia, ajuste) ou 'transferencia'
function MovimentoModal({ modo, saldos, onClose }) {
  const [f, setF] = useState({ caixinha: modo === 'saque' ? 'invest' : 'caixa', para: 'invest', valor: 0, motivo: '', destino: '', descricao: '', data: today() })
  const [erro, setErro] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const livre = saldos[f.caixinha]?.livre ?? 0

  const salvar = async () => {
    let e = ''
    if (modo === 'saque') e = validarSaque({ valor: f.valor, motivo: f.motivo, destino: f.destino, caixinha: f.caixinha }, saldos)
    else if (modo === 'transferencia') e = f.caixinha === f.para ? 'Escolha caixinhas diferentes.' : validarSaque({ valor: f.valor, motivo: 'transferência', destino: 'transferência', caixinha: f.caixinha }, saldos)
    else e = validarValor(f.valor) || (!f.descricao.trim() ? 'Diga de onde vem esse saldo (ex.: saldo que eu já tinha guardado).' : '')
    setErro(e)
    if (e) return
    if (modo === 'saque') {
      await insert('caixinha_movimentos', { caixinha: f.caixinha, tipo: 'saida', amount_cents: f.valor, feito_em: f.data, motivo: f.motivo.trim(), destino: f.destino.trim() })
    } else if (modo === 'transferencia') {
      const grupo = crypto.randomUUID()
      await insert('caixinha_movimentos', { caixinha: f.caixinha, tipo: 'saida', amount_cents: f.valor, feito_em: f.data, motivo: `Transferência para ${NOMES[f.para]}`, destino: NOMES[f.para], grupo }, { silent: true })
      await insert('caixinha_movimentos', { caixinha: f.para, tipo: 'entrada', amount_cents: f.valor, feito_em: f.data, descricao: `Transferência de ${NOMES[f.caixinha]}`, grupo })
    } else {
      await insert('caixinha_movimentos', { caixinha: f.caixinha, tipo: 'entrada', amount_cents: f.valor, feito_em: f.data, descricao: f.descricao.trim() })
    }
    notify(modo === 'saque' ? 'Saque registrado com o motivo.' : modo === 'transferencia' ? 'Transferência registrada.' : 'Saldo adicionado.', 'ok')
    onClose()
  }
  const titulo = modo === 'saque' ? 'Sacar de uma caixinha' : modo === 'transferencia' ? 'Mover entre caixinhas' : 'Adicionar saldo'
  return (
    <Modal title={titulo} onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} />}>
      <div className="stack">
        {modo === 'saque' ? <p className="lbl">Todo saque guarda o porquê e para quê, para você ler daqui a anos o que fez com o dinheiro.</p> : null}
        {modo === 'entrada' ? <p className="lbl">Use para dinheiro que já existia antes das caixinhas ou para um ajuste. O que entra de projeto já é dividido sozinho.</p> : null}
        <div className="fields">
          <Field label={modo === 'transferencia' ? 'Tirar de' : 'Caixinha'} hint={modo !== 'entrada' ? `${brl(livre)} livre` : undefined}>
            <Select value={f.caixinha} onChange={(v) => set('caixinha')(v || 'invest')} options={opcoesCaixinha} />
          </Field>
          {modo === 'transferencia' ? <Field label="Levar para"><Select value={f.para} onChange={(v) => set('para')(v || 'invest')} options={opcoesCaixinha} /></Field> : null}
          <Field label="Valor"><MoneyInput value={f.valor} onChange={set('valor')} /></Field>
          <Field label="Data"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
        </div>
        {modo === 'saque' ? <>
          <Field label="Por que está sacando?"><input className="in" autoFocus placeholder="Ex.: contratar um social media" value={f.motivo} onChange={(e) => set('motivo')(e.target.value)} /></Field>
          <Field label="O que vai fazer com o dinheiro?"><input className="in" placeholder="Ex.: pagar o primeiro mês e impulsionar 3 posts" value={f.destino} onChange={(e) => set('destino')(e.target.value)} /></Field>
        </> : null}
        {modo === 'entrada' ? <Field label="De onde vem"><input className="in" placeholder="Ex.: saldo que eu já tinha guardado" value={f.descricao} onChange={(e) => set('descricao')(e.target.value)} /></Field> : null}
        {erro ? <div className="note r">{erro}</div> : null}
      </div>
    </Modal>
  )
}

function PercentuaisModal({ configs, vigente, onClose }) {
  const ini = vigente ? pctDaConfig(vigente) : PADRAO
  const [f, setF] = useState({ ...Object.fromEntries(ORDEM.map((k) => [k, String(ini[k]).replace('.', ',')])), desde: today() })
  const [erro, setErro] = useState('')
  const nums = Object.fromEntries(ORDEM.map((k) => [k, Number(String(f[k]).replace(',', '.'))]))
  const soma = ORDEM.reduce((a, k) => a + (Number.isFinite(nums[k]) ? nums[k] : 0), 0)
  const salvar = async () => {
    const e = validarPercentuais(nums)
    setErro(e)
    if (e) return
    const row = { vigente_desde: f.desde, pct_gastar: nums.gastar, pct_guardar: nums.guardar, pct_caixa: nums.caixa, pct_invest: nums.invest }
    const mesmaData = configs.find((c) => c.vigente_desde === f.desde)
    if (mesmaData) await update('caixinhas_config', mesmaData.id, row)
    else await insert('caixinhas_config', row)
    notify('Percentuais salvos. Valem para o que entrar a partir dessa data.', 'ok')
    onClose()
  }
  return (
    <Modal title="Percentuais da divisão" onClose={onClose} footer={<Rodape onClose={onClose} salvar={salvar} />}>
      <div className="stack">
        <p className="lbl">Cada entrada é dividida assim, depois de tirar a comissão do parceiro. Mudar aqui só vale para o que entrar a partir da data escolhida; o que já foi dividido não muda.</p>
        <div className="fields">
          {ORDEM.map((k) => (
            <Field key={k} label={NOMES[k]} hint={DESCRICAO[k]}><input className="in num" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
          ))}
          <Field label="Vale a partir de"><input type="date" className="in" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></Field>
        </div>
        <Badge kind={Math.round(soma * 100) === 10000 ? 'g' : 'r'} dot={false}>Soma: {soma.toLocaleString('pt-BR')}%</Badge>
        {erro ? <div className="note r">{erro}</div> : null}
        {configs.length ? <p className="lbl">Histórico: {[...configs].reverse().map((c) => `${dmy(c.vigente_desde)} → ${pctTxt(c.pct_gastar)}/${pctTxt(c.pct_guardar)}/${pctTxt(c.pct_caixa)}/${pctTxt(c.pct_invest)}`).join(' · ')}</p> : null}
      </div>
    </Modal>
  )
}
