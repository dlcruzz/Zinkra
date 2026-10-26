// Núcleo do módulo Pessoal (etapa 2): leitura dos dados que o motor precisa e as ações de gravar.
// A conta em si fica em motor.js (puro). Aqui só entra Supabase. Nada de tabela inteira:
// só o que está em aberto, o ciclo atual e janelas de poucos dias.
import { supabase } from '../supabase'
import { fetchRows, rpc, insert, update, updateWhere, emitChange } from '../data'
import { addDays, localDay } from '../format'
import { calcularPainel, ocorrenciasRecorrentes } from './motor'
import { lerCadastros, lerConfig } from './api'

export const TABELAS_NUCLEO = [
  'pf_config', 'pf_contas', 'pf_categorias', 'pf_recebimentos_modelo', 'pf_compromissos', 'pf_parcelas', 'pf_parcelamentos', 'pf_lancamentos',
]

export const contaPadrao = (contas) => contas.find((c) => c.ativo && c.tipo === 'corrente') || contas.find((c) => c.ativo && c.tipo === 'dinheiro') || null
export const categoriaReserva = (categorias) => categorias.find((c) => c.nome === 'Reserva' && c.tipo === 'saida') || null

// parcelas em aberto, já com o texto "Compra (3/10)" que o motor e as telas usam
const achatarParcelas = (linhas) => linhas.map((p) => {
  const { pf_parcelamentos: pm, ...resto } = p
  return { ...resto, descricao: pm ? `${pm.descricao} (${p.numero}/${pm.n_parcelas})` : 'Parcela', categoria_id: pm?.categoria_id || null, prioridade: 'importante' }
})
export const lerParcelasAbertas = async () => achatarParcelas(await fetchRows('pf_parcelas', {
  select: '*, pf_parcelamentos(descricao, n_parcelas, categoria_id)', where: (q) => q.eq('status', 'aberta'), order: 'vencimento', ascending: true,
}))

export const lerCompromissosAbertos = () => fetchRows('pf_compromissos', { where: (q) => q.eq('status', 'aberta'), order: 'vencimento', ascending: true })

// Tudo que o motor precisa para o dia: contas, saldo, o que está aberto, recebimentos já registrados e gastos do ciclo.
export async function lerNucleo(hoje, configLida = null) {
  const [config, cad, saldos, compromissos, parcelas, recebidosRows, reservaAtual] = await Promise.all([
    configLida || lerConfig(), lerCadastros(), rpc('pf_saldos'), lerCompromissosAbertos(), lerParcelasAbertas(),
    fetchRows('pf_lancamentos', {
      select: 'id,data,recebimento_modelo_id,recebimento_ref', order: 'data', ascending: true,
      where: (q) => q.not('recebimento_modelo_id', 'is', null).gte('data', addDays(hoje, -60)),
    }),
    rpc('pf_reserva_atual'),
  ])
  const recebidos = recebidosRows.map((r) => ({ modelo_id: r.recebimento_modelo_id, ref: r.recebimento_ref, data: r.data }))
  const feitos = recebidos.filter((r) => r.data <= hoje).map((r) => r.data).sort()
  const inicioCiclo = feitos.length ? feitos[feitos.length - 1] : null

  // gasto variável por dia desde o começo do ciclo (não conta conta paga, parcela nem dinheiro separado para a reserva)
  const reserva = categoriaReserva(cad.categorias)
  const { data: gastos, error } = await supabase.from('pf_lancamentos').select('data,valor_cent,categoria_id')
    .gte('data', inicioCiclo || hoje).lte('data', hoje).lt('valor_cent', 0).is('compromisso_id', null).is('parcela_id', null).limit(1000)
  if (error) throw error
  const gastosPorDia = {}
  for (const g of gastos) {
    if (reserva && g.categoria_id === reserva.id) continue
    gastosPorDia[g.data] = (gastosPorDia[g.data] || 0) - Number(g.valor_cent)
  }

  const desdeMin = config.onboarding_ok_em ? localDay(config.onboarding_ok_em) : null
  const painel = calcularPainel({
    hoje, config, saldoCent: Number(saldos.total_cent) || 0, modelos: cad.modelos, recebidos, compromissos, parcelas, gastosPorDia, inicioCiclo, desdeMin,
  })
  return { config, ...cad, saldos, compromissos, parcelas, recebidos, reservaAtual: Number(reservaAtual) || 0, gastosPorDia, inicioCiclo, painel }
}

// ---------------------------------------------------------------- gravar
export async function registrarGasto({ valorCent, categoriaId, contaId, descricao, data }) {
  if (!valorCent) throw new Error('Informe o valor do gasto.')
  return insert('pf_lancamentos', {
    data, valor_cent: -Math.abs(valorCent), conta_id: contaId || null, categoria_id: categoriaId || null, descricao: descricao || '', origem: 'manual',
  })
}

export async function pagarCompromisso(id, { data, valorCent, contaId, gerar = true }) {
  await rpc('pf_pagar_compromisso', { p_id: id, p_data: data, p_valor_cent: valorCent, p_conta: contaId || null, p_gerar_lancamento: gerar })
  emitChange('pf_compromissos', 'pf_lancamentos')
}

export async function pagarParcela(id, { data, valorCent, contaId, gerar = true }) {
  await rpc('pf_pagar_parcela', { p_id: id, p_data: data, p_valor_cent: valorCent, p_conta: contaId || null, p_gerar_lancamento: gerar })
  emitChange('pf_parcelas', 'pf_lancamentos')
}

export async function reabrirCompromisso(id) {
  await rpc('pf_reabrir_compromisso', { p_id: id })
  emitChange('pf_compromissos', 'pf_lancamentos')
}

// apaga o lançamento e, se ele pagou uma conta ou parcela, reabre a conta ou parcela
export async function apagarLancamento(id) {
  await rpc('pf_desfazer_lancamento', { p_id: id })
  emitChange('pf_lancamentos', 'pf_compromissos', 'pf_parcelas')
}

// Registra um recebimento (fixo ou avulso) e dá baixa nas contas que o usuário já tinha pago por fora.
export async function registrarRecebimento({ ocorrencia, valorCent, data, contaId, categoriaId, descricao, jaPagas = [] }) {
  if (!valorCent) throw new Error('Informe o valor recebido.')
  const lanc = await insert('pf_lancamentos', {
    data, valor_cent: Math.abs(valorCent), conta_id: contaId || null, categoria_id: categoriaId || null,
    descricao: descricao || ocorrencia?.descricao || 'Entrada', origem: 'manual',
    recebimento_modelo_id: ocorrencia?.modeloId || null, recebimento_ref: ocorrencia?.nominal || null,
  })
  const falhas = []
  for (const id of jaPagas) {
    try {
      if (id.startsWith('c:')) await rpc('pf_pagar_compromisso', { p_id: id.slice(2), p_data: data, p_valor_cent: 0, p_conta: null, p_gerar_lancamento: false }, { quiet: true })
      else if (id.startsWith('p:')) await rpc('pf_pagar_parcela', { p_id: id.slice(2), p_data: data, p_valor_cent: 0, p_conta: null, p_gerar_lancamento: false }, { quiet: true })
    } catch { falhas.push(id) }
  }
  emitChange('pf_lancamentos', 'pf_compromissos', 'pf_parcelas')
  return { lancamento: lanc, falhas }
}

// separa dinheiro para a reserva: sai da conta e entra na categoria Reserva (não conta como gasto do dia)
export async function separarReserva({ valorCent, contaId, categoriaId, data }) {
  return insert('pf_lancamentos', { data, valor_cent: -Math.abs(valorCent), conta_id: contaId || null, categoria_id: categoriaId, descricao: 'Separado para a reserva', origem: 'manual' })
}

// ---------------------------------------------------------------- recorrentes
// Gera as ocorrências dos próximos 90 dias. Pode rodar quantas vezes quiser: o motor só devolve o que falta
// e o banco recusa repetidas (índice único origem + vencimento).
export async function gerarRecorrentes(hoje) {
  const series = await fetchRows('pf_compromissos', {
    where: (q) => q.in('recorrencia', ['mensal', 'anual']).is('origem_id', null).neq('status', 'cancelada'), order: 'vencimento', ascending: true,
  })
  if (!series.length) return 0
  const futuras = await fetchRows('pf_compromissos', {
    where: (q) => q.in('origem_id', series.map((s) => s.id)).gte('vencimento', hoje), order: 'vencimento', ascending: true,
  })
  // as novas herdam os valores da ocorrência mais recente (assim "aplicar às próximas" vale também para as que ainda vão ser geradas)
  const ultima = {}
  for (const f of futuras) if (f.status !== 'cancelada') ultima[f.origem_id] = f
  const modelos = series.map((s) => {
    const u = ultima[s.id]
    return u ? { ...s, descricao: u.descricao, valor_cent: u.valor_cent, categoria_id: u.categoria_id, prioridade: u.prioridade, multa_pct: u.multa_pct, juros_dia_pct: u.juros_dia_pct } : s
  })
  const novas = ocorrenciasRecorrentes({ modelos, existentes: futuras, hoje })
  if (!novas.length) return 0
  const n = await rpc('pf_inserir_ocorrencias', { p_linhas: novas }, { quiet: true })
  if (n) emitChange('pf_compromissos')
  return n
}

// edição de uma conta; em série, vale também para as próximas ocorrências em aberto
export async function salvarCompromisso(c, dados, { serie = false, hoje }) {
  await update('pf_compromissos', c.id, dados)
  if (serie) {
    const raiz = c.origem_id || c.id
    const semData = { ...dados }
    delete semData.vencimento
    await updateWhere('pf_compromissos', (q) => q.eq('origem_id', raiz).eq('status', 'aberta').gt('vencimento', c.vencimento).gte('vencimento', hoje).neq('id', c.id), semData)
  }
}

// cancela só esta conta ou a série inteira (esta e as próximas)
export async function cancelarCompromisso(c, { serie = false, hoje }) {
  await update('pf_compromissos', c.id, { status: 'cancelada' })
  if (serie) {
    const raiz = c.origem_id || c.id
    // a conta original deixa de ser "mensal/anual": é o que faz o gerador parar (sem mexer no status dela)
    await update('pf_compromissos', raiz, { recorrencia: 'unica' }, { silent: true })
    await updateWhere('pf_compromissos', (q) => q.eq('origem_id', raiz).eq('status', 'aberta').gte('vencimento', hoje), { status: 'cancelada' })
  }
}
