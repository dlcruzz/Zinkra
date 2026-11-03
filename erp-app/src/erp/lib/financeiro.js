// Financeiro dos projetos: ÚNICO lugar onde saldos, comissão e lucro são calculados.
// Todas as telas (projeto, lista, dashboard, fluxo de caixa, conciliação) usam estas funções.
// Dinheiro sempre em centavos (inteiro). Percentual é convertido em pontos-base (1% = 100)
// antes da conta, para nunca depender de número com vírgula flutuante.

import { brl } from './format'

export const TIPOS_VALOR = { base: 'Valor base', adicional: 'Adicional', melhoria: 'Melhoria' }
export const FORMAS_RECEBIMENTO = ['Pix', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro']

const soma = (lista) => (lista || []).reduce((a, x) => a + (Number(x.amount_cents) || 0), 0)

// parceiro: { kind: 'fixa' | 'percentual', amount_cents, pct } ou null (projeto sem parceiro)
export function comissaoTotal(parceiro, valorTotal) {
  if (!parceiro) return 0
  if (parceiro.kind === 'percentual') {
    const pontosBase = Math.round((Number(parceiro.pct) || 0) * 100)
    return Math.round((valorTotal * pontosBase) / 10000)
  }
  return Number(parceiro.amount_cents) || 0
}

// dados: { valores, recebimentos, parceiro, pagamentos, abatimentos } (listas de linhas com amount_cents)
export function calcularProjeto(dados = {}) {
  const { valores = [], recebimentos = [], parceiro = null, pagamentos = [], abatimentos = [] } = dados
  const valorTotal = soma(valores)
  const recebido = soma(recebimentos)
  const diferenca = valorTotal - recebido
  const temParceiro = Boolean(parceiro)
  // sem parceiro não existe comissão: pagamentos e abatimentos soltos são ignorados
  const comissao = temParceiro ? comissaoTotal(parceiro, valorTotal) : 0
  const comissaoPaga = temParceiro ? soma(pagamentos) : 0
  const abatido = temParceiro ? soma(abatimentos) : 0
  const saldoComissao = comissao - comissaoPaga - abatido

  const alertas = []
  if (recebido > valorTotal) alertas.push('recebido_acima_do_total')
  if (temParceiro && saldoComissao < 0) alertas.push(comissaoPaga > comissao ? 'comissao_paga_a_mais' : 'abatimento_maior_que_saldo')

  return {
    valorTotal,
    recebido,
    faltaReceber: Math.max(0, diferenca),
    excedenteRecebido: Math.max(0, -diferenca),
    temParceiro,
    comissaoTotal: comissao,
    comissaoPaga,
    abatido,
    // nunca fica negativa na tela: o que passou do saldo aparece em creditoComParceiro
    comissaoAPagar: Math.max(0, saldoComissao),
    creditoComParceiro: Math.max(0, -saldoComissao),
    lucroPrevisto: valorTotal - comissao + abatido,
    quitado: valorTotal > 0 && diferenca <= 0 && (!temParceiro || saldoComissao <= 0),
    alertas,
  }
}

export const ALERTAS = {
  recebido_acima_do_total: 'O total recebido passou do valor do projeto. Confira os lançamentos.',
  abatimento_maior_que_saldo: 'Os abatimentos passaram do que faltava pagar de comissão: o parceiro ficou devendo para você.',
  comissao_paga_a_mais: 'Já foi pago mais comissão do que o combinado.',
}

// Validação dos formulários: valor zero ou negativo nunca passa.
export function validarValor(cents) {
  const n = Number(cents)
  if (!Number.isInteger(n)) return 'Informe um valor válido.'
  if (n <= 0) return 'O valor precisa ser maior que zero.'
  return ''
}

// Avisos que NÃO bloqueiam: devolve a mensagem ou ''.
export function avisoRecebimento(fin, novoValor) {
  const depois = fin.recebido + novoValor
  return depois > fin.valorTotal
    ? `Com este recebimento o total recebido (${brl(depois)}) passa do valor do projeto (${brl(fin.valorTotal)}).`
    : ''
}
export function avisoAbatimento(fin, novoValor) {
  return novoValor > fin.comissaoAPagar
    ? 'Este abatimento é maior que a comissão que ainda falta pagar. O parceiro ficará devendo a diferença.'
    : ''
}

// Linha do tempo única, mais recente primeiro.
export function linhaDoTempo({ valores = [], recebimentos = [], pagamentos = [], abatimentos = [] }) {
  const tem = (tipo, data, r) => ({ tipo, data: data || (r.created_at || '').slice(0, 10), criado: r.created_at || '', row: r, valor: r.amount_cents })
  return [
    ...valores.map((r) => tem('valor', r.on_date, r)),
    ...recebimentos.map((r) => tem('recebimento', r.received_on, r)),
    ...pagamentos.map((r) => tem('pagamento', r.paid_on, r)),
    ...abatimentos.map((r) => tem('abatimento', r.on_date, r)),
  ].sort((a, b) => (a.data === b.data ? b.criado.localeCompare(a.criado) : b.data.localeCompare(a.data)))
}

// Monta os dados de um projeto a partir das listas gerais (como vêm do banco).
export function dadosDoProjeto(f, projectId) {
  const doProj = (lista) => (lista || []).filter((r) => r.project_id === projectId)
  return {
    valores: doProj(f.valores),
    recebimentos: doProj(f.recebimentos),
    parceiro: (f.parceiros || []).find((r) => r.project_id === projectId) || null,
    pagamentos: doProj(f.pagamentos),
    abatimentos: doProj(f.abatimentos),
  }
}

// Um projeto só entra no modelo novo quando tem ao menos um item de valor.
export function projetoNoModeloNovo(f, projectId) {
  return (f.valores || []).some((r) => r.project_id === projectId)
}

// Carteira: um cálculo por projeto + totais (rodapé da lista, dashboard, fluxo).
export function calcularCarteira(f, projetos) {
  const linhas = projetos
    .filter((p) => projetoNoModeloNovo(f, p.id))
    .map((p) => ({ projeto: p, fin: calcularProjeto(dadosDoProjeto(f, p.id)) }))
  const totais = linhas.reduce((t, { fin }) => ({
    valorTotal: t.valorTotal + fin.valorTotal,
    recebido: t.recebido + fin.recebido,
    faltaReceber: t.faltaReceber + fin.faltaReceber,
    comissaoAPagar: t.comissaoAPagar + fin.comissaoAPagar,
    lucroPrevisto: t.lucroPrevisto + fin.lucroPrevisto,
  }), { valorTotal: 0, recebido: 0, faltaReceber: 0, comissaoAPagar: 0, lucroPrevisto: 0 })
  return { linhas, totais }
}

// Para o fluxo de caixa e o painel: evita contar duas vezes o mesmo dinheiro.
// Projeto no modelo novo SUBSTITUI as parcelas do contrato dele em "Contas a receber"
// e as contas a pagar geradas pelas comissões desse contrato.
export function semDuplicidade(w, f) {
  const novos = new Set((f.valores || []).map((v) => v.project_id))
  const contratos = new Set((w.projects || []).filter((p) => novos.has(p.id) && p.contract_id).map((p) => p.contract_id))
  if (!contratos.size) return { receivables: w.receivables, payables: w.payables, contratos }
  const pagaveisComissao = new Set((w.commissions || []).filter((c) => contratos.has(c.contract_id) && c.payable_id).map((c) => c.payable_id))
  return {
    receivables: w.receivables.filter((r) => !contratos.has(r.contract_id)),
    payables: w.payables.filter((p) => !pagaveisComissao.has(p.id)),
    contratos,
  }
}
