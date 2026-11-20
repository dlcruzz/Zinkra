// Financeiro dos projetos: ÚNICO lugar onde saldos, comissão e lucro são calculados.
// Todas as telas (projeto, lista, dashboard, fluxo de caixa, conciliação) usam estas funções.
// Dinheiro sempre em centavos (inteiro). Percentual é convertido em pontos-base (1% = 100)
// antes da conta, para nunca depender de número com vírgula flutuante.

import { brl, today, addDays } from './format'

export const TIPOS_VALOR = { base: 'Valor base', adicional: 'Adicional', melhoria: 'Melhoria', mensalidade: 'Mensalidade', desconto: 'Desconto' }
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
// Desconto é guardado como número positivo, mas ABATE o total do projeto (vale negativo na conta).
export function valorDoItem(item, hoje = today()) {
  const v = Number(item.amount_cents) || 0
  if (item.kind === 'desconto') return -v
  return item.kind === 'mensalidade' ? v * mesesCobrados(item, hoje) : v
}

// Cartão de crédito: a taxa da maquininha é custo. O projeto continua FATURADO pelo valor cheio;
// o que cai na conta é o valor menos a taxa. cartao: { parcelas, taxa_pct, base_cents } ou null.
// A taxa é a TOTAL cobrada nas parcelas (ex.: 3,1563%). Conta em milionésimos para não depender de vírgula flutuante.
export function taxaDoCartao(cartao, valorTotal) {
  if (!cartao || !(valorTotal > 0)) return 0
  const noCartao = Number(cartao.base_cents) > 0 ? Math.min(Number(cartao.base_cents), valorTotal) : valorTotal
  const milionesimos = Math.round((Number(cartao.taxa_pct) || 0) * 10000)
  return Math.round((noCartao * milionesimos) / 1000000)
}

// De quanto foi a taxa a partir do que caiu na conta: devolve a taxa em % com 4 casas (ex.: 3200 → 3099 = 3,1563).
export function taxaPelaCaida(valorNoCartao, caiuNaConta) {
  const v = Number(valorNoCartao), c = Number(caiuNaConta)
  if (!(v > 0) || !(c >= 0) || c > v) return 0
  return Math.round(((v - c) / v) * 1000000) / 10000
}

// parceiro: { kind: 'fixa' | 'percentual', amount_cents, pct, base } ou null (projeto sem parceiro).
// Percentual: sobre o que CAIU na conta (base 'liquido', o padrão) ou sobre o valor cheio (base 'bruto').
export function comissaoTotal(parceiro, valorTotal, valorLiquido = valorTotal) {
  if (!parceiro) return 0
  if (parceiro.kind === 'percentual') {
    const pontosBase = Math.round((Number(parceiro.pct) || 0) * 100)
    const base = parceiro.base === 'bruto' ? valorTotal : valorLiquido
    return Math.round((base * pontosBase) / 10000)
  }
  return Number(parceiro.amount_cents) || 0
}

// dados: { valores, recebimentos, parceiro, pagamentos, abatimentos, cartao } (listas de linhas com amount_cents)
export function calcularProjeto(dados = {}) {
  const { valores = [], recebimentos = [], parceiro = null, pagamentos = [], abatimentos = [], cartao = null, hoje = today() } = dados
  const valorTotal = valores.reduce((a, x) => a + valorDoItem(x, hoje), 0)
  const taxaCartao = taxaDoCartao(cartao, valorTotal)
  // o que o cliente paga e o que realmente cai na conta (valor cheio menos a taxa da maquininha)
  const valorLiquido = valorTotal - taxaCartao
  const recebido = soma(recebimentos)
  const diferenca = valorLiquido - recebido
  const temParceiro = Boolean(parceiro)
  // sem parceiro não existe comissão: pagamentos e abatimentos soltos são ignorados
  const comissao = temParceiro ? comissaoTotal(parceiro, valorTotal, valorLiquido) : 0
  const comissaoPaga = temParceiro ? soma(pagamentos) : 0
  const abatido = temParceiro ? soma(abatimentos) : 0
  const saldoComissao = comissao - comissaoPaga - abatido

  const alertas = []
  if (recebido > valorLiquido) alertas.push('recebido_acima_do_total')
  if (temParceiro && saldoComissao < 0) alertas.push(comissaoPaga > comissao ? 'comissao_paga_a_mais' : 'abatimento_maior_que_saldo')

  return {
    valorTotal,
    temCartao: Boolean(cartao),
    parcelas: cartao ? Number(cartao.parcelas) || 1 : 0,
    taxaCartao,
    valorLiquido,
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
    // sobra para a Zinkra: valor cheio − taxa do cartão − comissão (+ o que o parceiro devolveu em abatimento)
    lucroPrevisto: valorLiquido - comissao + abatido,
    quitado: valorTotal > 0 && diferenca <= 0 && (!temParceiro || saldoComissao <= 0),
    alertas,
  }
}

export const ALERTAS = {
  recebido_acima_do_total: 'O total recebido passou do que devia cair na conta (valor do projeto menos a taxa do cartão). Confira os lançamentos.',
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
  const limite = fin.valorLiquido ?? fin.valorTotal
  if (depois <= limite) return ''
  return fin.temCartao
    ? `Com este recebimento o total recebido (${brl(depois)}) passa do que deve cair na conta (${brl(limite)}, o valor do projeto menos a taxa do cartão). Lance o que caiu de verdade, já sem a taxa.`
    : `Com este recebimento o total recebido (${brl(depois)}) passa do valor do projeto (${brl(fin.valorTotal)}).`
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

// Datas em que cada mensalidade foi cobrada até hoje (uma por mês, no dia do início).
const somaMeses = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`
}
export const datasDeCobranca = (item, hoje = today()) =>
  Array.from({ length: mesesCobrados(item, hoje) }, (_, k) => somaMeses(item.starts_on, k))

// Financeiro SaaS: produtos próprios da Zinkra com assinatura mensal.
//   mrr = soma das assinaturas vigentes hoje; emAberto = mensalidades já vencidas sem recebimento ligado.
export function resumoSaas({ produtos = [], assinaturas = [], recebimentos = [] } = {}, hoje = today()) {
  const feitos = recebimentos.filter((r) => r.received_on && r.received_on <= hoje)
  const vigente = (a) => a.starts_on <= hoje && (!a.ends_on || a.ends_on >= hoje)
  const comoItem = (a) => ({ kind: 'mensalidade', amount_cents: a.amount_cents, starts_on: a.starts_on, ends_on: a.ends_on })
  const linhas = assinaturas.map((a) => {
    const esperado = valorDoItem(comoItem(a), hoje)
    const recebido = soma(feitos.filter((r) => r.assinatura_id === a.id))
    return { assinatura: a, vigente: vigente(a), meses: mesesCobrados(comoItem(a), hoje), esperado, recebido, emAberto: Math.max(0, esperado - recebido) }
  })
  const porProduto = produtos.map((p) => {
    const deste = linhas.filter((l) => l.assinatura.produto_id === p.id)
    const vigentes = deste.filter((l) => l.vigente)
    return {
      produto: p,
      mrr: soma(vigentes.map((l) => l.assinatura)),
      assinantes: vigentes.length,
      recebido: soma(feitos.filter((r) => r.produto_id === p.id)),
      emAberto: deste.reduce((a, l) => a + l.emAberto, 0),
    }
  })
  const mes = hoje.slice(0, 7)
  return {
    mrr: porProduto.reduce((a, p) => a + p.mrr, 0),
    assinantes: porProduto.reduce((a, p) => a + p.assinantes, 0),
    recebidoTotal: soma(feitos),
    recebidoMes: soma(feitos.filter((r) => r.received_on.slice(0, 7) === mes)),
    emAberto: linhas.reduce((a, l) => a + l.emAberto, 0),
    porProduto,
    assinaturas: linhas,
  }
}

// FATURADO = tudo que a Zinkra já fechou até hoje, mesmo o que ainda falta receber:
//   projetos no modelo novo: cada item de valor na data dele (mensalidade: uma vez por mês cobrado);
//   contratos no modelo antigo: cada parcela já recebida ou vencida;
//   SaaS: o que entrou nos recebimentos de cada produto.
// RECEBIDO = o que já entrou no caixa. Nada é contado duas vezes: o mundo (w) já traz o modelo novo
// no lugar das parcelas antigas do mesmo contrato (semDuplicidade) e o banco só vira recebimento uma vez.
export function faturado(w, hoje = today()) {
  const nomeCliente = (id) => (w.clients || []).find((c) => c.id === id)?.name || 'Sem cliente'
  const projeto = (id) => (w.projects || []).find((p) => p.id === id)
  const rotuloProjeto = (id) => { const p = projeto(id); return p ? `${nomeCliente(p.client_id)} · ${p.name}` : 'Projeto removido' }
  const fat = []
  const rec = []
  const valor = (x) => Number(x.amount_cents) || 0
  const fin = w.fin || {}

  for (const v of fin.valores || []) {
    const origem = rotuloProjeto(v.project_id)
    if (v.kind === 'mensalidade') datasDeCobranca(v, hoje).forEach((d) => fat.push({ origem, data: d, valor: valor(v) }))
    else fat.push({ origem, data: v.on_date, valor: valorDoItem(v, hoje) })
  }
  for (const r of fin.recebimentos || []) rec.push({ origem: rotuloProjeto(r.project_id), data: r.received_on, valor: valor(r) })

  // modelo antigo: sobram em w.receivables só as parcelas que NÃO foram trocadas pelo modelo novo
  for (const r of w.receivables || []) {
    if (/^(proj|saas)-rec-/.test(String(r.id))) continue
    const contrato = (w.contracts || []).find((c) => c.id === r.contract_id)
    const cliente = nomeCliente(r.client_id || contrato?.client_id)
    const origem = contrato?.title ? `${cliente} · ${contrato.title}` : cliente
    const data = r.received_on || r.due_on
    if (!data || data > hoje) continue
    fat.push({ origem, data, valor: valor(r) })
    if (r.received_on) rec.push({ origem, data: r.received_on, valor: valor(r) })
  }

  const nomeProduto = (id) => (w.saas?.produtos || []).find((p) => p.id === id)?.name || 'produto'
  for (const r of w.saas?.recebimentos || []) {
    const origem = `SaaS · ${nomeProduto(r.produto_id)}`
    fat.push({ origem, data: r.received_on, valor: valor(r) })
    rec.push({ origem, data: r.received_on, valor: valor(r) })
  }

  const ate = (l) => l.data && l.data <= hoje
  const feitosFat = fat.filter(ate)
  const feitosRec = rec.filter(ate)
  const origens = new Map()
  feitosFat.forEach((l) => origens.set(l.origem, { origem: l.origem, faturado: (origens.get(l.origem)?.faturado || 0) + l.valor, recebido: origens.get(l.origem)?.recebido || 0 }))
  feitosRec.forEach((l) => {
    const o = origens.get(l.origem) || { origem: l.origem, faturado: 0, recebido: 0 }
    origens.set(l.origem, { ...o, recebido: o.recebido + l.valor })
  })
  const total = soma(feitosFat.map((l) => ({ amount_cents: l.valor })))
  const recebido = soma(feitosRec.map((l) => ({ amount_cents: l.valor })))
  // taxa do cartão: foi faturado o valor cheio, mas esta parte nunca vai cair na conta (é custo, não é saldo a receber)
  const taxasCartao = (w.carteira?.linhas || []).reduce((a, l) => a + (l.fin?.taxaCartao || 0), 0)
  return {
    total,
    recebido,
    taxasCartao,
    falta: Math.max(0, total - taxasCartao - recebido),
    lancamentos: feitosFat.map((l) => ({ amount_cents: l.valor, received_on: l.data })),
    porOrigem: [...origens.values()].sort((a, b) => b.faturado - a.faturado),
  }
}

// Por período, a partir de lançamentos { amount_cents, received_on } (received_on = a data do lançamento).
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
    cartao: (f.cartoes || []).find((r) => r.project_id === projectId) || null,
  }
}

// Um projeto só entra no modelo novo quando tem ao menos um item de valor.
export function projetoNoModeloNovo(f, projectId) {
  return (f.valores || []).some((r) => r.project_id === projectId)
}

// Quando o Danilo espera receber o saldo do projeto (data da comanda aberta), ou null.
export const previsaoDoSaldo = (f, projectId) =>
  (f.comandas || []).find((c) => c.project_id === projectId && c.status === 'aberta' && c.receber_previsto_em)?.receber_previsto_em || null

// Saldo dos projetos que se espera receber até uma data (entra no "a receber em 30 dias").
export const saldoPrevistoAte = (linhas, ate) =>
  linhas.reduce((a, l) => a + (l.previsao && l.previsao <= ate ? l.fin.faltaReceber : 0), 0)

// Carteira: um cálculo por projeto + totais (rodapé da lista, dashboard, fluxo).
export function calcularCarteira(f, projetos) {
  const linhas = projetos
    .filter((p) => projetoNoModeloNovo(f, p.id))
    .map((p) => ({ projeto: p, fin: calcularProjeto(dadosDoProjeto(f, p.id)), previsao: previsaoDoSaldo(f, p.id) }))
  const totais = linhas.reduce((t, { fin }) => ({
    valorTotal: t.valorTotal + fin.valorTotal,
    taxaCartao: t.taxaCartao + fin.taxaCartao,
    recebido: t.recebido + fin.recebido,
    faltaReceber: t.faltaReceber + fin.faltaReceber,
    comissaoAPagar: t.comissaoAPagar + fin.comissaoAPagar,
    lucroPrevisto: t.lucroPrevisto + fin.lucroPrevisto,
  }), { valorTotal: 0, taxaCartao: 0, recebido: 0, faltaReceber: 0, comissaoAPagar: 0, lucroPrevisto: 0 })
  return { linhas, totais }
}

// Regra do financeiro: TODO valor pertence a um projeto. Parcela do modelo antigo (Contas a receber) só
// vale se o contrato dela estiver ligado a algum projeto; as demais (avulsas ou de contrato solto) ficam
// fora do faturamento e do caixa e aparecem num aviso, para o Danilo mover para um projeto ou arquivar.
export function separarSemProjeto(receivables = [], projects = []) {
  const contratosDeProjeto = new Set(projects.map((p) => p.contract_id).filter(Boolean))
  const vinculadas = []
  const semProjeto = []
  for (const r of receivables) (r.contract_id && contratosDeProjeto.has(r.contract_id) ? vinculadas : semProjeto).push(r)
  return { vinculadas, semProjeto }
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

// ------------------------------------------------------------------
// Situação de pagamento: "o cliente está em dia?" (só LÊ o que já existe: não cria nem duplica valor).
// ------------------------------------------------------------------
const diasEntre = (de, ate) => Math.round((Date.parse(ate + 'T12:00:00') - Date.parse(de + 'T12:00:00')) / 864e5)

// Data desde a qual falta pagar: a previsão que o Danilo definiu; se não houver e o projeto for só de
// mensalidade, a primeira cobrança que o recebido ainda não cobre; senão não há data (null).
export function vencimentoDoSaldo({ valores = [], recebimentos = [], previsao = null, hoje = today() }) {
  if (previsao) return previsao
  if (!valores.length || !valores.every((v) => v.kind === 'mensalidade')) return null
  const cobrancas = valores.flatMap((v) => datasDeCobranca(v, hoje).map((d) => ({ d, v: Number(v.amount_cents) || 0 }))).sort((a, b) => a.d.localeCompare(b.d))
  const pago = soma(recebimentos)
  let acumulado = 0
  for (const c of cobrancas) {
    acumulado += c.v
    if (acumulado > pago) return c.d
  }
  return null
}

// estado: sem_valor | pago | em_dia (falta, mas ainda não venceu) | atrasado | aberto (falta e não há data)
export function situacaoDoProjeto(fin, dados = {}, hoje = today()) {
  if (!(fin.valorTotal > 0)) return { estado: 'sem_valor', falta: 0, dias: 0, ate: null }
  if (fin.faltaReceber <= 0) return { estado: 'pago', falta: 0, dias: 0, ate: null }
  const ate = vencimentoDoSaldo({ ...dados, hoje })
  if (!ate) return { estado: 'aberto', falta: fin.faltaReceber, dias: 0, ate: null }
  const dias = diasEntre(ate, hoje)
  return dias > 0 ? { estado: 'atrasado', falta: fin.faltaReceber, dias, ate } : { estado: 'em_dia', falta: fin.faltaReceber, dias: 0, ate }
}

// Um cliente: pagamento de cada projeto dele (modelo novo) + parcelas antigas que ainda valem.
// `w` é o mundo já sem duplicidade: w.receivables só traz parcela antiga NÃO trocada pelo modelo novo,
// e os recebimentos dos projetos entram só pela carteira (nunca duas vezes).
export function resumoDoCliente(w, clienteId, hoje = today()) {
  const projetos = (w.carteira?.linhas || [])
    .filter((l) => l.projeto.client_id === clienteId)
    .map((l) => ({
      ...l,
      situacao: situacaoDoProjeto(l.fin, { ...dadosDoProjeto(w.fin || {}, l.projeto.id), previsao: l.previsao }, hoje),
    }))
  const antigas = (w.receivables || []).filter((r) => r.client_id === clienteId && !/^(proj|saas)-rec-/.test(String(r.id)))
  const antigasAbertas = antigas.filter((r) => !r.received_on)
  const antigasVencidas = antigasAbertas.filter((r) => r.due_on && r.due_on < hoje)
  const diasAntigas = antigasVencidas.reduce((m, r) => Math.max(m, diasEntre(r.due_on, hoje)), 0)
  const diasProjetos = projetos.reduce((m, l) => Math.max(m, l.situacao.dias), 0)
  const dias = Math.max(diasAntigas, diasProjetos)
  const atrasado = antigasVencidas.length > 0 || projetos.some((l) => l.situacao.estado === 'atrasado')
  const semData = projetos.some((l) => l.situacao.estado === 'aberto')
  const falta = projetos.reduce((a, l) => a + l.fin.faltaReceber, 0) + soma(antigasAbertas)
  const recebido = projetos.reduce((a, l) => a + l.fin.recebido, 0) + soma(antigas.filter((r) => r.received_on))
  // em_dia: nada vencido; a_receber: há saldo sem data para cobrar; atrasado: tem algo vencido
  const estado = atrasado ? 'atrasado' : semData ? 'a_receber' : 'em_dia'
  return { projetos, antigas, falta, recebido, dias, estado, temFinanceiro: projetos.length > 0 || antigas.length > 0 }
}

// Comissão de cada parceiro nos projetos (para a tela de Parceiros): quanto combinado, pago, abatido e a pagar.
export function comissoesPorParceiro(w) {
  const nome = (s) => String(s || '').trim().toLowerCase()
  const porProjeto = new Map((w.carteira?.linhas || []).map((l) => [l.projeto.id, l]))
  const linhas = (w.fin?.parceiros || []).map((c) => {
    const l = porProjeto.get(c.project_id)
    return l ? { parceiroId: c.partner_id || null, nome: c.partner_name, chave: c.partner_id || 'n:' + nome(c.partner_name), projeto: l.projeto, fin: l.fin } : null
  }).filter(Boolean)
  const mapa = new Map()
  for (const x of linhas) {
    const g = mapa.get(x.chave) || { chave: x.chave, parceiroId: x.parceiroId, nome: x.nome, combinado: 0, pago: 0, abatido: 0, aPagar: 0, projetos: [] }
    g.combinado += x.fin.comissaoTotal
    g.pago += x.fin.comissaoPaga
    g.abatido += x.fin.abatido
    g.aPagar += x.fin.comissaoAPagar
    g.projetos.push(x)
    mapa.set(x.chave, g)
  }
  return [...mapa.values()].sort((a, b) => b.aPagar - a.aPagar || a.nome.localeCompare(b.nome))
}
