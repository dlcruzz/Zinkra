import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, Field, MoneyInput, AsyncButton, CountUp } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, insert, update, notify } from '../lib/data'
import { brl } from '../lib/format'
import { hojeSP, proximosRecebimentos } from '../lib/pf/datas'
import { lerCadastros, lerConfig, lerResumoBase } from '../lib/pf/api'
import { RecebimentosBloco, CompromissosBloco, ParcelamentosBloco, DividasBloco, diaSemanaData } from './listas'
import { RegraFimDeSemana } from './Configuracoes'

const PASSOS = [
  ['Saldo', 'Quanto você tem hoje'],
  ['Recebimentos', 'O que entra todo mês'],
  ['Contas', 'O que está para vencer'],
  ['Parcelas e dívidas', 'O que você ainda está pagando'],
]
const TABELAS = ['pf_config', 'pf_contas', 'pf_categorias', 'pf_recebimentos_modelo', 'pf_compromissos', 'pf_parcelamentos', 'pf_dividas']

const inteiro = (s) => { const n = parseInt(String(s).replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null }
const dia = (n) => Number.isInteger(n) && n >= 1 && n <= 31

async function carregar() {
  const [config, cad, compromissos, parcelamentos, dividas] = await Promise.all([
    lerConfig(),
    lerCadastros(),
    fetchRows('pf_compromissos', { where: (q) => q.eq('status', 'aberta').is('parcela_id', null).is('fatura_id', null), order: 'vencimento', ascending: true }),
    fetchRows('pf_parcelamentos', { where: (q) => q.eq('ativo', true), order: 'created_at', ascending: true }),
    fetchRows('pf_dividas', { where: (q) => q.eq('ativo', true), order: 'created_at', ascending: true }),
  ])
  return { config, ...cad, compromissos, parcelamentos, dividas }
}

export default function PrimeirosPassos() {
  useMeta('Pessoal', 'Primeiros passos')
  const nav = useNavigate()
  const { data, loading, error, reload } = useData(carregar, TABELAS, [])
  const [passo, setPasso] = useState(null)
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={8} /></div>
  const { config } = data
  const atual = passo ?? Math.min(4, Math.max(1, config.onboarding_passo))
  const alcancado = Math.max(config.onboarding_passo, atual)
  const concluido = Boolean(config.onboarding_ok_em)

  const irPara = async (n) => {
    setPasso(n)
    if (n > config.onboarding_passo) await update('pf_config', config.id, { onboarding_passo: n }, { quiet: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const concluir = async () => {
    await update('pf_config', config.id, { onboarding_passo: 4, onboarding_ok_em: new Date().toISOString() })
    notify('Tudo certo. Seu painel pessoal está pronto.', 'ok')
    nav('/erp/pessoal')
  }

  return (
    <div className="page pf">
      <PageHead title="Primeiros passos" sub="Quatro perguntas rápidas para o sistema conhecer o seu mês. Cada passo já fica salvo." />
      <ol className="pf-passos" aria-label="Passos">
        {PASSOS.map(([nome, sub], i) => {
          const n = i + 1
          const estado = n === atual ? 'on' : n < atual || (concluido && n <= alcancado) ? 'ok' : ''
          return (
            <li key={nome} className={estado}>
              <button type="button" disabled={n > alcancado} onClick={() => irPara(n)} aria-current={n === atual ? 'step' : undefined}>
                <span className="pf-bola num">{estado === 'ok' ? '✓' : n}</span>
                <span className="pf-passo-t"><b>{nome}</b><span>{sub}</span></span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="pf-aba" key={atual}>
        {atual === 1 ? <PassoSaldo data={data} avancar={() => irPara(2)} /> : null}
        {atual === 2 ? (
          <>
            <RecebimentosBloco modelos={data.modelos} contas={data.contas} regra={config.regra_fim_semana} />
            <RegraFimDeSemana config={config} modelos={data.modelos} />
            {!data.modelos.length ? <div className="note y">Sem nenhum recebimento cadastrado o sistema não consegue projetar o seu mês. Você pode seguir e voltar depois.</div> : null}
            <Navegacao voltar={() => irPara(1)} avancar={() => irPara(3)} />
          </>
        ) : null}
        {atual === 3 ? (
          <>
            <CompromissosBloco itens={data.compromissos} categorias={data.categorias} />
            <div className="note info">Conta que se repete (aluguel, internet): cadastre com "Todo mês" e a data do próximo vencimento. Sem nenhuma por agora? Pode seguir.</div>
            <Navegacao voltar={() => irPara(2)} avancar={() => irPara(4)} />
          </>
        ) : null}
        {atual === 4 ? (
          <>
            <ParcelamentosBloco itens={data.parcelamentos} contas={data.contas} categorias={data.categorias} />
            <DividasBloco itens={data.dividas} />
            <Resumo data={data} />
            <Navegacao voltar={() => irPara(3)} avancar={concluir} rotulo={concluido ? 'Salvar e voltar' : 'Concluir'} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function Navegacao({ voltar, avancar, rotulo = 'Continuar' }) {
  return (
    <div className="pf-nav">
      <button type="button" className="btn" onClick={voltar}>Voltar</button>
      <AsyncButton className="btn p" onClick={avancar}>{rotulo}</AsyncButton>
    </div>
  )
}

// ---------------------------------------------------------------- passo 1: saldo (e cartão, se tiver)
function PassoSaldo({ data, avancar }) {
  const auth = useAuth()
  const conta = data.contas.find((c) => c.tipo === 'corrente')
  const cartao = data.contas.find((c) => c.tipo === 'cartao')
  const [f, setF] = useState({
    nome: conta?.nome || 'Santander', saldo: conta?.saldo_inicial_cent || 0,
    temCartao: Boolean(cartao), cNome: cartao?.nome || 'Cartão Santander',
    fech: cartao?.fechamento_dia ?? '', venc: cartao?.vencimento_dia ?? '', limite: cartao?.limite_cent || 0,
  })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const continuar = async () => {
    if (!f.nome.trim()) return notify('Dê um nome para a conta, por exemplo o nome do banco.', 'err')
    const fech = inteiro(f.fech), venc = inteiro(f.venc)
    if (f.temCartao && (!f.cNome.trim() || !dia(fech) || !dia(venc))) return notify('Para o cartão, informe o nome e os dias de fechamento e de vencimento da fatura.', 'err')
    const dadosConta = { nome: f.nome.trim(), tipo: 'corrente', saldo_inicial_cent: f.saldo, data_saldo_inicial: hojeSP() }
    if (conta) await update('pf_contas', conta.id, dadosConta)
    else await insert('pf_contas', { ...dadosConta, owner_id: auth.uid, ordem: 0 })
    if (f.temCartao) {
      const dadosCartao = { nome: f.cNome.trim(), tipo: 'cartao', fechamento_dia: fech, vencimento_dia: venc, limite_cent: f.limite || null }
      if (cartao) await update('pf_contas', cartao.id, dadosCartao)
      else await insert('pf_contas', { ...dadosCartao, owner_id: auth.uid, ordem: 1 })
    }
    avancar()
  }
  return (
    <div className="pf-bloco">
      <div className="pf-cabeca"><div className="stack-s"><h2>Quanto você tem na conta hoje?</h2><span className="lbl">Abra o app do banco e confira o saldo de agora. Depois dele, cada centavo é contado pelo sistema.</span></div></div>
      <div className="fields">
        <Field label="Nome da conta"><input className="in" value={f.nome} onChange={(e) => set('nome')(e.target.value)} /></Field>
        <Field label="Saldo de hoje (R$)" hint="Se estiver no vermelho, digite com sinal de menos."><MoneyInput value={f.saldo} onChange={set('saldo')} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.temCartao} onChange={(e) => set('temCartao')(e.target.checked)} />Tenho cartão de crédito</label>
      {f.temCartao ? (
        <div className="fields pf-entra">
          <Field label="Nome do cartão"><input className="in" value={f.cNome} onChange={(e) => set('cNome')(e.target.value)} /></Field>
          <Field label="Dia do fechamento"><input className="in num" inputMode="numeric" maxLength={2} value={f.fech} onChange={(e) => set('fech')(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Dia do vencimento"><input className="in num" inputMode="numeric" maxLength={2} value={f.venc} onChange={(e) => set('venc')(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Limite (opcional)"><MoneyInput value={f.limite} onChange={set('limite')} /></Field>
        </div>
      ) : null}
      <div className="pf-nav"><span /><AsyncButton className="btn p" onClick={continuar}>Continuar</AsyncButton></div>
    </div>
  )
}

// ---------------------------------------------------------------- fim: o que o sistema entendeu
function Resumo({ data }) {
  const r = useData(lerResumoBase, ['pf_contas', 'pf_compromissos', 'pf_parcelas', 'pf_parcelamentos', 'pf_dividas'], [])
  const prox = proximosRecebimentos(data.modelos, data.config.regra_fim_semana, hojeSP(), 1)[0]
  const x = r.data
  if (!x) return null
  const linhas = [
    ['Saldo nas contas', x.saldo_contas_cent],
    ['Contas em aberto', x.contas_abertas.total_cent, `${x.contas_abertas.n} conta(s)`],
    ['Parcelas que ainda faltam', x.parcelas_abertas.total_cent, `${x.parcelas_abertas.n} parcela(s) em ${x.parcelamentos_ativos} parcelamento(s)`],
    ['Dívidas', x.dividas.saldo_cent, `${x.dividas.n} dívida(s)`],
  ]
  return (
    <div className="pf-bloco pf-resumo">
      <div className="pf-cabeca"><div className="stack-s"><h2>O que o sistema entendeu</h2><span className="lbl">Confira antes de concluir. Dá para ajustar tudo depois.</span></div></div>
      {linhas.map(([nome, cent, sub]) => (
        <div className="pf-linha slim" key={nome}>
          <div className="pf-meio"><span className="pf-nome">{nome}</span>{sub ? <span className="lbl">{sub}</span> : null}</div>
          <span className="pf-valor num"><CountUp value={brl(cent)} /></span>
        </div>
      ))}
      <div className="note g">
        {prox
          ? <>Próximo recebimento: <b>{diaSemanaData(prox.data)}</b>{prox.modelo.valor_esperado_cent ? <> · {brl(prox.modelo.valor_esperado_cent)} esperados</> : null}.</>
          : 'Nenhum recebimento fixo cadastrado ainda.'}
      </div>
    </div>
  )
}
