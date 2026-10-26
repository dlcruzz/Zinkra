import React, { useState } from 'react'
import { Modal, Field, Select, MoneyInput, AsyncButton, Seg } from '../components/ui'
import { insert, update, notify } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { addMonths } from '../lib/format'
import { hojeSP } from '../lib/pf/datas'
import { gerarRecorrentes, salvarCompromisso } from '../lib/pf/nucleo'
import { valoresDoParcelamento, gerarParcelas, primeiraData } from '../lib/pf/parcelas'
import { TIPOS_CONTA, PRIORIDADES, RECORRENCIAS, CORES, percentual } from '../lib/pf/api'

const rodape = (onClose, salvar, rotulo = 'Salvar') => (
  <>
    <button type="button" className="btn" onClick={onClose}>Cancelar</button>
    <AsyncButton className="btn p" onClick={salvar}>{rotulo}</AsyncButton>
  </>
)
const diaValido = (v) => Number.isInteger(v) && v >= 1 && v <= 31
const inteiro = (s) => { const n = parseInt(String(s).replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null }

// ---------------------------------------------------------------- conta / cartão
export function ModalConta({ conta, tipoInicial = 'corrente', onClose }) {
  const auth = useAuth()
  const [f, setF] = useState(() => conta ? {
    nome: conta.nome, tipo: conta.tipo, saldo: conta.saldo_inicial_cent, data: conta.data_saldo_inicial || hojeSP(),
    fech: conta.fechamento_dia ?? '', venc: conta.vencimento_dia ?? '', limite: conta.limite_cent || 0,
  } : { nome: tipoInicial === 'cartao' ? 'Cartão' : 'Conta corrente', tipo: tipoInicial, saldo: 0, data: hojeSP(), fech: '', venc: '', limite: 0 })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const cartao = f.tipo === 'cartao'
  const salvar = async () => {
    if (!f.nome.trim()) return notify('Dê um nome para a conta.', 'err')
    const fech = inteiro(f.fech), venc = inteiro(f.venc)
    if (cartao && (!diaValido(fech) || !diaValido(venc))) return notify('Informe o dia do fechamento e o dia do vencimento da fatura (de 1 a 31).', 'err')
    const dados = cartao
      ? { nome: f.nome.trim(), tipo: f.tipo, fechamento_dia: fech, vencimento_dia: venc, limite_cent: f.limite || null, saldo_inicial_cent: 0, data_saldo_inicial: null }
      : { nome: f.nome.trim(), tipo: f.tipo, saldo_inicial_cent: f.saldo, data_saldo_inicial: f.data || hojeSP(), fechamento_dia: null, vencimento_dia: null, limite_cent: null }
    if (conta) await update('pf_contas', conta.id, dados)
    else await insert('pf_contas', { ...dados, owner_id: auth.uid })
    notify(conta ? 'Conta atualizada.' : 'Conta criada.', 'ok')
    onClose(true)
  }
  return (
    <Modal size="sm" title={conta ? 'Editar conta' : cartao ? 'Novo cartão' : 'Nova conta'} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar)}>
      <Field label="Nome"><input className="in" autoFocus value={f.nome} onChange={(e) => set('nome')(e.target.value)} /></Field>
      {!conta ? <Field label="Tipo"><Select value={f.tipo} onChange={set('tipo')} options={TIPOS_CONTA} /></Field> : null}
      {cartao ? (
        <div className="fields">
          <Field label="Dia do fechamento"><input className="in num" inputMode="numeric" maxLength={2} value={f.fech} onChange={(e) => set('fech')(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Dia do vencimento"><input className="in num" inputMode="numeric" maxLength={2} value={f.venc} onChange={(e) => set('venc')(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Limite (opcional)"><MoneyInput value={f.limite} onChange={set('limite')} /></Field>
        </div>
      ) : (
        <div className="fields">
          <Field label="Saldo de hoje (R$)" hint="Pode ser negativo, se a conta está no vermelho."><MoneyInput value={f.saldo} onChange={set('saldo')} /></Field>
          <Field label="Saldo conferido em"><input type="date" className="in" value={f.data} onChange={(e) => set('data')(e.target.value)} /></Field>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------- recebimento fixo
export function ModalRecebimento({ modelo, sugestao, contas, onClose }) {
  const auth = useAuth()
  const correntes = contas.filter((c) => c.tipo !== 'cartao')
  const [f, setF] = useState(() => modelo
    ? { descricao: modelo.descricao, dia: String(modelo.dia_mes), valor: modelo.valor_esperado_cent, conta: modelo.conta_id }
    : { descricao: sugestao?.descricao || '', dia: sugestao?.dia ? String(sugestao.dia) : '', valor: 0, conta: correntes[0]?.id || null })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const salvar = async () => {
    const dia = inteiro(f.dia)
    if (!f.descricao.trim()) return notify('Escreva de onde vem esse dinheiro.', 'err')
    if (!diaValido(dia)) return notify('Informe o dia do mês em que o dinheiro entra (de 1 a 31).', 'err')
    const dados = { descricao: f.descricao.trim(), dia_mes: dia, valor_esperado_cent: f.valor, conta_id: f.conta || null }
    if (modelo) await update('pf_recebimentos_modelo', modelo.id, dados)
    else await insert('pf_recebimentos_modelo', { ...dados, owner_id: auth.uid })
    onClose(true)
  }
  return (
    <Modal size="sm" title={modelo ? 'Editar recebimento' : 'Novo recebimento fixo'} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar)}>
      <Field label="De onde vem"><input className="in" autoFocus value={f.descricao} onChange={(e) => set('descricao')(e.target.value)} placeholder="Ex.: pagamento do dia 15" /></Field>
      <div className="fields">
        <Field label="Dia do mês" hint="Dia 30 em mês curto vira o último dia."><input className="in num" inputMode="numeric" maxLength={2} value={f.dia} onChange={(e) => set('dia')(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Valor esperado (R$)"><MoneyInput value={f.valor} onChange={set('valor')} /></Field>
      </div>
      {correntes.length ? <Field label="Cai em qual conta"><Select value={f.conta} onChange={set('conta')} options={correntes.map((c) => [c.id, c.nome])} placeholder="Nenhuma em especial" /></Field> : null}
    </Modal>
  )
}

// ---------------------------------------------------------------- categoria
export function ModalCategoria({ categoria, tipoInicial = 'saida', onClose }) {
  const auth = useAuth()
  const [f, setF] = useState(() => categoria
    ? { nome: categoria.nome, tipo: categoria.tipo, cor: categoria.cor, essencial: categoria.essencial }
    : { nome: '', tipo: tipoInicial, cor: CORES[2], essencial: false })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const salvar = async () => {
    if (!f.nome.trim()) return notify('Dê um nome para a categoria.', 'err')
    const dados = { nome: f.nome.trim(), tipo: f.tipo, cor: f.cor, essencial: f.tipo === 'saida' && f.essencial }
    if (categoria) await update('pf_categorias', categoria.id, dados)
    else await insert('pf_categorias', { ...dados, owner_id: auth.uid, ordem: 100 })
    onClose(true)
  }
  return (
    <Modal size="sm" title={categoria ? 'Editar categoria' : 'Nova categoria'} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar)}>
      <Field label="Nome"><input className="in" autoFocus value={f.nome} onChange={(e) => set('nome')(e.target.value)} /></Field>
      {!categoria ? <Field label="Tipo"><Seg value={f.tipo} onChange={set('tipo')} options={[['saida', 'Saída'], ['entrada', 'Entrada']]} /></Field> : null}
      <Field label="Cor">
        <div className="pf-cores" role="radiogroup" aria-label="Cor da categoria">
          {CORES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={f.cor === c} aria-label={c} className={f.cor === c ? 'on' : ''} style={{ background: c }} onClick={() => set('cor')(c)} />
          ))}
        </div>
      </Field>
      {f.tipo === 'saida' ? (
        <label className="check"><input type="checkbox" checked={f.essencial} onChange={(e) => set('essencial')(e.target.checked)} />Gasto essencial (não dá para cortar)</label>
      ) : null}
    </Modal>
  )
}

// ---------------------------------------------------------------- conta a pagar
// Sem `compromisso`: cria. Com `compromisso`: edita (e, se for conta que se repete, pode valer para as próximas).
export function ModalCompromisso({ compromisso, categorias, onClose }) {
  const auth = useAuth()
  const edicao = Boolean(compromisso)
  const [f, setF] = useState(() => compromisso ? {
    descricao: compromisso.descricao, valor: compromisso.valor_cent, venc: compromisso.vencimento, recorrencia: compromisso.recorrencia, prioridade: compromisso.prioridade,
    categoria: compromisso.categoria_id, multa: compromisso.multa_pct ? String(compromisso.multa_pct).replace('.', ',') : '', juros: compromisso.juros_dia_pct ? String(compromisso.juros_dia_pct).replace('.', ',') : '', serie: true,
  } : { descricao: '', valor: 0, venc: hojeSP(), recorrencia: 'unica', prioridade: 'importante', categoria: null, multa: '', juros: '', serie: true })
  const [mais, setMais] = useState(Boolean(compromisso && (compromisso.multa_pct || compromisso.juros_dia_pct)))
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const repete = f.recorrencia !== 'unica'
  const salvar = async () => {
    if (!f.descricao.trim()) return notify('Escreva o que é essa conta.', 'err')
    if (!f.valor) return notify('Informe o valor da conta.', 'err')
    if (!f.venc) return notify('Informe o vencimento.', 'err')
    const dados = {
      descricao: f.descricao.trim(), valor_cent: f.valor, vencimento: f.venc, prioridade: f.prioridade, categoria_id: f.categoria || null,
      multa_pct: f.multa ? percentual(f.multa) : null, juros_dia_pct: f.juros ? percentual(f.juros) : null,
    }
    if (edicao) {
      await salvarCompromisso(compromisso, dados, { serie: repete && f.serie, hoje: hojeSP() })
      notify('Conta atualizada.', 'ok')
    } else {
      await insert('pf_compromissos', { ...dados, owner_id: auth.uid, recorrencia: f.recorrencia, dia_venc: repete ? Number(f.venc.slice(8)) : null })
      if (repete) await gerarRecorrentes(hojeSP())
    }
    onClose(true)
  }
  return (
    <Modal size="sm" title={edicao ? 'Editar conta' : 'Nova conta a pagar'} onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar)}>
      <Field label="O que é"><input className="in" autoFocus value={f.descricao} onChange={(e) => set('descricao')(e.target.value)} placeholder="Ex.: aluguel, internet, faculdade" /></Field>
      <div className="fields">
        <Field label="Valor (R$)"><MoneyInput value={f.valor} onChange={set('valor')} /></Field>
        <Field label="Vence em"><input type="date" className="in" value={f.venc} onChange={(e) => set('venc')(e.target.value)} /></Field>
        {edicao ? null : <Field label="Repete"><Select value={f.recorrencia} onChange={set('recorrencia')} options={RECORRENCIAS} /></Field>}
        <Field label="Importância"><Select value={f.prioridade} onChange={set('prioridade')} options={PRIORIDADES} /></Field>
      </div>
      <Field label="Categoria"><Select value={f.categoria} onChange={set('categoria')} placeholder="Sem categoria" options={categorias.filter((c) => c.tipo === 'saida').map((c) => [c.id, c.nome])} /></Field>
      <button type="button" className="btn g s" style={{ alignSelf: 'flex-start' }} onClick={() => setMais(!mais)}>{mais ? 'Esconder' : 'Se atrasar, cobra multa ou juros?'}</button>
      {mais ? (
        <div className="fields">
          <Field label="Multa (%)"><input className="in num" inputMode="decimal" value={f.multa} onChange={(e) => set('multa')(e.target.value)} placeholder="2" /></Field>
          <Field label="Juros por dia (%)"><input className="in num" inputMode="decimal" value={f.juros} onChange={(e) => set('juros')(e.target.value)} placeholder="0,033" /></Field>
        </div>
      ) : null}
      {edicao && repete ? <label className="check"><input type="checkbox" checked={f.serie} onChange={(e) => set('serie')(e.target.checked)} />Valer também para as próximas vezes que ainda não foram pagas</label> : null}
      {!edicao && repete ? <span className="note g">As próximas vezes são criadas sozinhas, com 90 dias de antecedência.</span> : null}
    </Modal>
  )
}

// ---------------------------------------------------------------- parcelamento
export function ModalParcelamento({ contas, categorias, onClose }) {
  const auth = useAuth()
  const cartoes = contas.filter((c) => c.tipo === 'cartao' && c.ativo)
  const [f, setF] = useState({ descricao: '', forma: 'carne', conta: cartoes[0]?.id || null, modo: 'parcela', valor: 0, n: '', pagas: '0', prox: hojeSP(), juros: 0, categoria: null })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const n = inteiro(f.n) || 0, pagas = inteiro(f.pagas) || 0
  const { total, parcela } = valoresDoParcelamento({ modo: f.modo, valorCent: f.valor, n })
  const salvar = async () => {
    if (!f.descricao.trim()) return notify('Escreva o que foi parcelado.', 'err')
    if (n < 1) return notify('Informe em quantas parcelas.', 'err')
    if (!f.valor) return notify('Informe o valor.', 'err')
    if (pagas >= n) return notify('Todas as parcelas já foram pagas, então não tem o que cadastrar.', 'err')
    if (f.forma === 'cartao' && !f.conta) return notify('Cadastre o cartão antes (em Contas e cartões) ou escolha "Carnê ou boleto".', 'err')
    const p = await insert('pf_parcelamentos', {
      owner_id: auth.uid, descricao: f.descricao.trim(), valor_total_cent: total, n_parcelas: n, valor_parcela_cent: parcela,
      primeira_data: primeiraData(f.prox, pagas), parcela_atual: pagas, forma: f.forma, conta_id: f.forma === 'cartao' ? f.conta : null,
      juros_total_cent: f.juros || null, categoria_id: f.categoria || null,
    })
    const linhas = gerarParcelas({ total, parcela, n, jaPagas: pagas, proximoVenc: f.prox }).map((x) => ({ ...x, owner_id: auth.uid, parcelamento_id: p.id }))
    const { error } = await supabase.from('pf_parcelas').insert(linhas)
    if (error) {
      await supabase.from('pf_parcelamentos').delete().eq('id', p.id) // não deixa parcelamento sem parcelas
      throw error
    }
    onClose(true)
  }
  return (
    <Modal title="Novo parcelamento" onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar)}>
      <Field label="O que foi parcelado"><input className="in" autoFocus value={f.descricao} onChange={(e) => set('descricao')(e.target.value)} placeholder="Ex.: notebook, curso, financiamento" /></Field>
      <div className="fields">
        <Field label="Como paga"><Seg value={f.forma} onChange={set('forma')} options={[['carne', 'Carnê ou boleto'], ['cartao', 'Cartão']]} /></Field>
        {f.forma === 'cartao' ? (
          <Field label="Qual cartão">
            {cartoes.length ? <Select value={f.conta} onChange={set('conta')} options={cartoes.map((c) => [c.id, c.nome])} /> : <span className="note y">Nenhum cartão cadastrado ainda.</span>}
          </Field>
        ) : null}
      </div>
      <div className="fields">
        <Field label="Eu sei o valor…"><Seg value={f.modo} onChange={set('modo')} options={[['parcela', 'da parcela'], ['total', 'total']]} /></Field>
        <Field label={f.modo === 'parcela' ? 'Valor da parcela (R$)' : 'Valor total (R$)'}><MoneyInput value={f.valor} onChange={set('valor')} /></Field>
        <Field label="Número de parcelas"><input className="in num" inputMode="numeric" maxLength={3} value={f.n} onChange={(e) => set('n')(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Já pagas" hint="Se acabou de comprar, deixe 0."><input className="in num" inputMode="numeric" maxLength={3} value={f.pagas} onChange={(e) => set('pagas')(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label={f.forma === 'cartao' ? 'Vencimento da fatura da próxima parcela' : 'Vencimento da próxima parcela'}><input type="date" className="in" value={f.prox} onChange={(e) => set('prox')(e.target.value)} /></Field>
        <Field label="Juros no total (opcional)" hint="Quanto pagou a mais por parcelar."><MoneyInput value={f.juros} onChange={set('juros')} /></Field>
      </div>
      <Field label="Categoria"><Select value={f.categoria} onChange={set('categoria')} placeholder="Sem categoria" options={categorias.filter((c) => c.tipo === 'saida').map((c) => [c.id, c.nome])} /></Field>
      {n > 0 && f.valor ? <PrevisaoParcelas total={total} parcela={parcela} n={n} pagas={pagas} prox={f.prox} /> : null}
    </Modal>
  )
}

function PrevisaoParcelas({ total, parcela, n, pagas, prox }) {
  const restam = Math.max(0, n - pagas)
  const falta = Math.max(0, total - parcela * pagas)
  const fim = restam ? addMonths(prox, restam - 1) : null
  const brlf = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <div className="note g">
      Total de {brlf(total)}. {restam ? <>Faltam <b>{restam}</b> de {n} parcelas, <b>{brlf(falta)}</b> a pagar, a última em {fim.slice(8)}/{fim.slice(5, 7)}/{fim.slice(0, 4)}.</> : 'Nada a pagar.'}
    </div>
  )
}

// ---------------------------------------------------------------- dívida
export function ModalDivida({ onClose }) {
  const auth = useAuth()
  const [f, setF] = useState({ credor: '', saldo: 0, minima: 0, juros: '', dia: '', prioridade: 'importante' })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const salvar = async () => {
    if (!f.credor.trim()) return notify('Escreva com quem é a dívida.', 'err')
    if (!f.saldo) return notify('Informe quanto você ainda deve.', 'err')
    const dia = f.dia ? inteiro(f.dia) : null
    if (f.dia && !diaValido(dia)) return notify('O dia do vencimento precisa estar entre 1 e 31.', 'err')
    await insert('pf_dividas', {
      owner_id: auth.uid, credor: f.credor.trim(), saldo_devedor_cent: f.saldo, parcela_minima_cent: f.minima,
      juros_mes_pct: f.juros ? percentual(f.juros) : null, dia_venc: dia, prioridade: f.prioridade,
    })
    onClose(true)
  }
  return (
    <Modal size="sm" title="Nova dívida" onClose={() => onClose(false)} footer={rodape(() => onClose(false), salvar)}>
      <Field label="Com quem"><input className="in" autoFocus value={f.credor} onChange={(e) => set('credor')(e.target.value)} placeholder="Ex.: banco, loja, pessoa" /></Field>
      <div className="fields">
        <Field label="Quanto ainda deve (R$)"><MoneyInput value={f.saldo} onChange={set('saldo')} /></Field>
        <Field label="Parcela mínima (R$)"><MoneyInput value={f.minima} onChange={set('minima')} /></Field>
        <Field label="Juros ao mês (%)"><input className="in num" inputMode="decimal" value={f.juros} onChange={(e) => set('juros')(e.target.value)} placeholder="Se souber" /></Field>
        <Field label="Dia do vencimento"><input className="in num" inputMode="numeric" maxLength={2} value={f.dia} onChange={(e) => set('dia')(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <Field label="Importância"><Select value={f.prioridade} onChange={set('prioridade')} options={PRIORIDADES} /></Field>
    </Modal>
  )
}
