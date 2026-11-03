// Financeiro dos projetos: ÚNICO lugar onde saldos, comissão e lucro são calculados.
// Todas as telas (projeto, lista, dashboard, fluxo de caixa, conciliação) usam estas funções.
// Dinheiro sempre em centavos (inteiro). Percentual é convertido em pontos-base (1% = 100)
// antes da conta, para nunca depender de número com vírgula flutuante.

import { brl, today, addDays } from './format'

export const TIPOS_VALOR = { base: 'Valor base', adicional: 'Adicional', melhoria: 'Melhoria', mensalidade: 'Mensalidade' }
export const FORMAS_RECEBIMENTO = ['Pix', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro']

const soma = (lista) => (lista || []).reduce((a, x) => a + (Number(x.amount_cents) || 0), 0)

// Mensalidade: amount_cents é o valor POR MÊS. Um ciclo é cobrado no dia do início, todo mês
// (dia 29 a 31 vira 28 para existir em todos os meses), até ends_on se houver.
// Datas no formato AAAA-MM-DD.
export function mesesCobrados(item, hoje = today()) {
  if (!item || item.kind !== 'mensalidade' || !item.starts_on || hoje < item.starts_on) return 0
  const fim = item.ends_on && item.ends_on < hoje ? item.ends_on : hoje
  const [ya, ma, da] = item.starts_on.split('-').map(Number)
  const [yb, mb, db] = fim.split('-').map(Number)
  const n = (yb - ya) * 12 + (mb - ma) + (db >= Math.min(da, 28) ? 1 : 0)
  return Math.max(0, n)
}

// Quanto o item vale até hoje: valor fechado, ou valor mensal vezes os meses já cobrados.
export function valorDoItem(item, hoje = today()) {
  const v = Number(item.amount_cents) || 0
  return item.kind === 'mensalidade' ? v * mesesCobrados(item, hoje) : v
}

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
  const { valores = [], recebimentos = [], parceiro = null, pagamentos = [], abatimentos = [], hoje = today() } = dados
  const valorTotal = valores.reduce((a, x) => a + valorDoItem(x, hoje), 0)
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

// Uma comanda: totais dela e, item por item, quanto foi cobrado e quanto entrou apontando para ele.
// Recebimentos sem item (valor_id vazio) ficam em `semItem`: contam no total da comanda, não em um item.
export function resumoComanda({ valores = [], recebimentos = [], hoje = today() }) {
  const total = calcularProjeto({ valores, recebimentos, hoje })
  const itens = valores.map((item) => ({
    item,
    cobrado: valorDoItem(item, hoje),
    meses: mesesCobrados(item, hoje),
    recebido: soma(recebimentos.filter((r) => r.valor_id === item.id)),
  }))
  return { ...total, itens, semItem: soma(recebimentos.filter((r) => !r.valor_id)) }
}

// Faturamento = dinheiro que já entrou (recebido), nunca o que só foi combinado.
// Janelas móveis que terminam hoje: semana (7 dias), 15 dias, mês (30), 3 meses (90),
// 6 meses (180), 1 ano (365). Cada uma traz também o período anterior de mesmo tamanho.
export const JANELAS_FATURAMENTO = [
  { id: 'semana', rotulo: 'Semana', dias: 7, legenda: 'últimos 7 dias' },
  { id: 'quinzena', rotulo: '15 dias', dias: 15, legenda: 'últimos 15 dias' },
  { id: 'mes', rotulo: 'Mês', dias: 30, legenda: 'últimos 30 dias' },
  { id: 'tri', rotulo: '3 meses', dias: 90, legenda: 'últimos 90 dias' },
  { id: 'sem', rotulo: '6 meses', dias: 180, legenda: 'últimos 180 dias' },
  { id: 'ano', rotulo: '1 ano', dias: 365, legenda: 'últimos 365 dias' },
]

// recebidos: linhas com amount_cents e received_on (só entram as já recebidas, até hoje)
export function faturamento(recebidos, hoje = today()) {
  const feitos = (recebidos || []).filter((r) => r.received_on && r.received_on <= hoje)
  const entre = (de, ate) => soma(feitos.filter((r) => r.received_on >= de && r.received_on <= ate))
  return {
    total: soma(feitos),
    janelas: JANELAS_FATURAMENTO.map((j) => {
      const de = addDays(hoje, -(j.dias - 1))
      const anteriorAte = addDays(de, -1)
      return { ...j, valor: entre(de, hoje), anterior: entre(addDays(anteriorAte, -(j.dias - 1)), anteriorAte) }
    }),
  }
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
