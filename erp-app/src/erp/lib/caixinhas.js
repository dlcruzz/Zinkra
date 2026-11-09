// Caixinhas: ÚNICO lugar onde se calcula a divisão do dinheiro que entra e os saldos de cada caixinha.
// Nada é copiado para o banco: a divisão sai do recebimento (projeto ou SaaS) e dos percentuais vigentes
// na data dele. No banco ficam só as regras e o que o Danilo registra à mão (saques, ajustes, compras).
// Dinheiro em centavos (inteiro). Percentual vira pontos-base (1% = 100) antes da conta.

import { today } from './format'

export const ORDEM = ['gastar', 'guardar', 'caixa', 'invest']
export const NOMES = {
  gastar: 'Danilo · para gastar',
  guardar: 'Danilo · para guardar',
  caixa: 'Caixa da Zinkra',
  invest: 'Investimento da Zinkra',
}
export const DESCRICAO = {
  gastar: 'Seu salário do mês: pode gastar sem culpa.',
  guardar: 'Sua reserva pessoal: acumula.',
  caixa: 'Segurança da empresa: custos fixos e imprevistos.',
  invest: 'Crescer a Zinkra: social media, tráfego, equipamento.',
}
export const PADRAO = { gastar: 40, guardar: 15, caixa: 25, invest: 20 }

const soma = (lista, f = (x) => x.amount_cents) => (lista || []).reduce((a, x) => a + (Number(f(x)) || 0), 0)
const bps = (pct) => Math.round((Number(pct) || 0) * 100)

// pct: { gastar, guardar, caixa, invest } em % (aceita 12,5). Devolve a mensagem de erro ou ''.
export function validarPercentuais(pct) {
  const v = ORDEM.map((k) => Number(pct?.[k]))
  if (v.some((n) => !Number.isFinite(n) || n < 0)) return 'Os percentuais precisam ser números de zero para cima.'
  const total = v.reduce((a, n) => a + bps(n), 0)
  return total === 10000 ? '' : `A soma precisa dar 100%. Agora dá ${(total / 100).toLocaleString('pt-BR')}%.`
}

// Divide um valor (centavos) pelas caixinhas sem perder nem criar centavo:
// as três últimas arredondam para baixo e "gastar" fica com o resto.
export function dividir(base, pct) {
  const b = Math.max(0, Math.round(Number(base) || 0))
  const parte = (k) => Math.floor((b * bps(pct[k])) / 10000)
  const guardar = parte('guardar'), caixa = parte('caixa'), invest = parte('invest')
  return { gastar: b - guardar - caixa - invest, guardar, caixa, invest }
}

// regra vigente numa data: a mais recente com vigente_desde <= data (ou null se a data é anterior a todas)
export function configEm(configs, data) {
  let achada = null
  for (const c of configs || []) {
    if (c.vigente_desde <= data && (!achada || c.vigente_desde > achada.vigente_desde)) achada = c
  }
  return achada
}
export const pctDaConfig = (c) => ({ gastar: Number(c.pct_gastar), guardar: Number(c.pct_guardar), caixa: Number(c.pct_caixa), invest: Number(c.pct_invest) })

// Parte da comissão do parceiro que está dentro de um recebimento: proporcional ao que o projeto deve de comissão.
// A comissão não é dinheiro do Danilo, é custo da venda: sai antes da divisão.
export function comissaoDoRecebimento(valor, fin) {
  if (!fin || !(fin.valorTotal > 0) || !(fin.comissaoTotal > 0)) return 0
  return Math.min(valor, Math.round((valor * fin.comissaoTotal) / fin.valorTotal))
}

// Todo recebimento a partir da primeira regra vira uma entrada dividida. `repassado` = já movi no banco.
//   fin: { recebimentos, ... } do mundo; saas: { recebimentos }; linhas: carteira (um cálculo por projeto);
//   rotulo(tipo, row): nome para mostrar.
export function entradasDasCaixinhas({ fin = {}, saas = {}, linhas = [], configs = [], repasses = [], rotulo = () => '', hoje = today() }) {
  const finDoProjeto = new Map(linhas.map((l) => [l.projeto.id, l.fin]))
  const feito = new Map(repasses.map((r) => [`${r.origem_tipo}:${r.origem_id}`, r]))
  const out = []
  const adiciona = (tipo, row, data, comissao) => {
    if (!data || data > hoje) return
    const cfg = configEm(configs, data)
    if (!cfg) return
    const bruto = Number(row.amount_cents) || 0
    const base = bruto - comissao
    const chave = `${tipo}:${row.id}`
    out.push({
      chave, origem_tipo: tipo, origem_id: row.id, data, titulo: rotulo(tipo, row), bruto, comissao, base,
      partes: dividir(base, pctDaConfig(cfg)), pct: pctDaConfig(cfg),
      repasse: feito.get(chave) || null, repassado: feito.has(chave),
    })
  }
  for (const r of fin.recebimentos || []) adiciona('recebimento', r, r.received_on, comissaoDoRecebimento(Number(r.amount_cents) || 0, finDoProjeto.get(r.project_id)))
  for (const r of saas.recebimentos || []) adiciona('saas', r, r.received_on, 0)
  return out.sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? 1 : -1))
}

// De onde sai o dinheiro de uma compra feita: primeiro o que estava reservado (na ordem em que foi reservado),
// o que passar do reservado sai de `pago_de` (padrão: investimento). Reserva que sobrou fica liberada.
export function saidasDaCompra(compra, reservas = []) {
  const out = { caixa: 0, invest: 0 }
  if (!compra || compra.status !== 'comprada') return out
  let resto = Number(compra.pago_cents) || 0
  const minhas = reservas.filter((r) => r.compra_id === compra.id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  for (const r of minhas) {
    const tira = Math.min(resto, Number(r.amount_cents) || 0)
    out[r.caixinha] += tira
    resto -= tira
  }
  if (resto > 0) out[compra.pago_de || 'invest'] += resto
  return out
}

// Compra paga vira UMA saída de caixa da empresa no fluxo de caixa (sem lançar de novo em Contas a pagar).
export const pagaveisDeCompras = (compras = []) => compras.filter((c) => c.status === 'comprada').map((c) => ({
  id: 'compra-' + c.id, category: 'Compras', recurrence: 'once', series_id: null,
  amount_cents: Number(c.pago_cents) || 0, due_on: c.comprada_em, paid_on: c.comprada_em,
}))

// Saldo de cada caixinha:
//   entrou = parte dos recebimentos + entradas à mão (transferências, ajustes)
//   saiu   = saques e gastos à mão + compras pagas
//   comprometido = reservado para compras ainda não feitas; livre = saldo - comprometido
//   paradoNaConta = parte que o ERP já dividiu mas você ainda não marcou "já movi no banco"
export function saldosCaixinhas({ entradas = [], movimentos = [], compras = [], reservas = [] }) {
  const res = {}
  for (const k of ORDEM) {
    const doMov = movimentos.filter((m) => m.caixinha === k)
    const dasCompras = compras.reduce((a, c) => a + (saidasDaCompra(c, reservas)[k] || 0), 0)
    const entrou = entradas.reduce((a, e) => a + e.partes[k], 0) + soma(doMov.filter((m) => m.tipo === 'entrada'))
    const saiu = soma(doMov.filter((m) => m.tipo === 'saida')) + dasCompras
    const abertas = new Set(compras.filter((c) => c.status === 'desejo').map((c) => c.id))
    const comprometido = soma(reservas.filter((r) => r.caixinha === k && abertas.has(r.compra_id)))
    res[k] = {
      entrou, saiu, saldo: entrou - saiu, comprometido, livre: entrou - saiu - comprometido,
      paradoNaConta: entradas.filter((e) => !e.repassado).reduce((a, e) => a + e.partes[k], 0),
    }
  }
  return res
}

// Saque: exige valor, motivo e destino (para ler daqui a anos) e não deixa passar do que está livre.
export function validarSaque({ valor, motivo, destino, caixinha }, saldos) {
  const n = Number(valor)
  if (!Number.isInteger(n) || n <= 0) return 'Informe um valor maior que zero.'
  if (!String(motivo || '').trim()) return 'Diga por que está tirando esse dinheiro.'
  if (!String(destino || '').trim()) return 'Diga o que vai fazer com esse dinheiro.'
  const livre = saldos?.[caixinha]?.livre ?? 0
  if (n > livre) return 'Esse valor passa do que está livre na caixinha (o que está comprometido com compras não entra).'
  return ''
}

// Compra: quanto já está comprometido, quanto falta e o percentual (para a barra de progresso).
export function progressoCompra(compra, reservas = []) {
  const alvo = Number(compra?.valor_cents) || 0
  const reservado = compra?.status === 'comprada' ? Number(compra.pago_cents) || 0
    : soma(reservas.filter((r) => r.compra_id === compra?.id))
  const falta = Math.max(0, alvo - reservado)
  return { alvo, reservado, falta, pct: alvo ? Math.min(100, Math.round((reservado / alvo) * 100)) : 0, completo: alvo > 0 && reservado >= alvo }
}

// Quanto ainda se pode comprometer com uma compra a partir de uma caixinha.
export const podeComprometer = (compra, reservas, saldos, caixinha) =>
  Math.max(0, Math.min(progressoCompra(compra, reservas).falta, saldos?.[caixinha]?.livre ?? 0))

// Extrato de uma caixinha (ou de todas), mais recente primeiro: entradas dos recebimentos, movimentos e compras.
export function extrato({ caixinha = null, entradas = [], movimentos = [], compras = [], reservas = [] }) {
  const linhas = []
  for (const e of entradas) {
    for (const k of ORDEM) if ((!caixinha || caixinha === k) && e.partes[k] > 0) linhas.push({ id: `${e.chave}:${k}`, caixinha: k, data: e.data, sinal: 1, valor: e.partes[k], titulo: `Entrou: ${e.titulo}`, detalhe: '', tipo: 'divisao' })
  }
  for (const m of movimentos) {
    if (caixinha && m.caixinha !== caixinha) continue
    linhas.push({
      id: m.id, caixinha: m.caixinha, data: m.feito_em, sinal: m.tipo === 'entrada' ? 1 : -1, valor: Number(m.amount_cents) || 0,
      titulo: m.tipo === 'saida' ? (m.motivo || 'Saque') : (m.descricao || 'Entrada'),
      detalhe: m.tipo === 'saida' ? `Para: ${m.destino || '—'}` : '', tipo: m.grupo ? 'transferencia' : m.tipo === 'saida' ? 'saque' : 'ajuste', mov: m,
    })
  }
  for (const c of compras.filter((x) => x.status === 'comprada')) {
    const s = saidasDaCompra(c, reservas)
    for (const k of ['caixa', 'invest']) if (s[k] > 0 && (!caixinha || caixinha === k)) linhas.push({ id: `compra-${c.id}-${k}`, caixinha: k, data: c.comprada_em, sinal: -1, valor: s[k], titulo: `Compra: ${c.nome}`, detalhe: '', tipo: 'compra' })
  }
  return linhas.sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? 1 : -1))
}
