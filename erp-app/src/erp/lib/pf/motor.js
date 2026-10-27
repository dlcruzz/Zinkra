// Motor de cálculo do módulo Pessoal. PURO: sem Supabase, sem React. Recebe dados, devolve
// resultado; as telas só exibem. Tudo em centavos inteiros, datas em texto AAAA-MM-DD.
// Regras: seção 4 da especificação (clientes/erp_zinkra_financas_pessoais).
import { addDays, daysBetween, brl, dm } from '../format'
import { dataDoMes, ajustarPelaRegra } from './datas'

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const num = (v) => Number(v) || 0
const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0)
const primeiroDoMes = (iso) => `${iso.slice(0, 7)}-01`

export const LIMIAR_AMARELO_PCT = 30 // até 30% do limite do dia = amarelo
export const DIAS_SEM_ENTRADA = 30 // sem recebimento cadastrado, divide por 30 dias
export const ANTECEDENCIA_RECORRENTES = 90

// ---------------------------------------------------------------------------
// 4.1 Datas de recebimento
// ---------------------------------------------------------------------------
export const chaveEntrada = (modeloId, nominal) => `${modeloId}|${nominal}`

// Todas as ocorrências dos recebimentos fixos com data (já ajustada pela regra fim de semana)
// entre `desde` e `ate`, inclusive. `nominal` = data sem ajuste (identifica a ocorrência).
export function ocorrenciasDeRecebimento(modelos, regra, desde, ate) {
  const out = []
  let ano = Number(desde.slice(0, 4)), mes = Number(desde.slice(5, 7)) - 1 // começa um mês antes: ajuste pode empurrar para a frente
  if (mes < 1) { mes += 12; ano -= 1 }
  const fimAno = Number(ate.slice(0, 4)), fimMes = Number(ate.slice(5, 7)) + 1
  for (const m of modelos.filter((x) => x.ativo !== false)) {
    let a = ano, ms = mes
    while (a < fimAno || (a === fimAno && ms <= fimMes)) {
      const nominal = dataDoMes(a, ms, m.dia_mes)
      const data = ajustarPelaRegra(nominal, regra)
      if (data >= desde && data <= ate) {
        out.push({ id: chaveEntrada(m.id, nominal), modeloId: m.id, descricao: m.descricao, data, nominal, ajustada: data !== nominal, valor_cent: num(m.valor_esperado_cent), contaId: m.conta_id || null })
      }
      ms += 1
      if (ms > 12) { ms = 1; a += 1 }
    }
  }
  return out.sort((x, y) => cmp(x.data, y.data) || cmp(x.id, y.id))
}

// Ocorrências esperadas que ainda NÃO foram registradas.
// `recebidos`: [{ modelo_id, ref }] (ref = data nominal da ocorrência), vindos dos lançamentos.
export function entradasEsperadas({ modelos, regra, desde, ate, recebidos = [] }) {
  const feitos = new Set(recebidos.map((r) => chaveEntrada(r.modelo_id ?? r.modeloId, String(r.ref ?? r.nominal).slice(0, 10))))
  return ocorrenciasDeRecebimento(modelos, regra, desde, ate).filter((o) => !feitos.has(o.id))
}

// ---------------------------------------------------------------------------
// Obrigações (contas, parcelas) e encargos de atraso
// ---------------------------------------------------------------------------
// Junta tudo que sai do bolso numa lista só. Contas ligadas a parcela não entram (a parcela já
// conta) e parcelas que já viraram fatura de cartão também não (a fatura conta).
export function normalizarObrigacoes({ compromissos = [], parcelas = [], ignorar = [], extras = [] }) {
  const fora = new Set(ignorar)
  const contas = compromissos
    .filter((c) => c.status === 'aberta' && !c.parcela_id)
    .map((c) => ({
      id: `c:${c.id}`, ref: c.id, tipo: 'conta', descricao: c.descricao, valor_cent: num(c.valor_cent), vencimento: c.vencimento,
      prioridade: c.prioridade || 'importante', multa_pct: num(c.multa_pct), juros_dia_pct: num(c.juros_dia_pct),
    }))
  const parc = parcelas
    .filter((p) => p.status === 'aberta' && !p.fatura_id)
    .map((p) => ({
      id: `p:${p.id}`, ref: p.id, tipo: 'parcela', descricao: p.descricao || 'Parcela', valor_cent: num(p.valor_cent), vencimento: p.vencimento,
      prioridade: p.prioridade || 'importante', multa_pct: 0, juros_dia_pct: 0,
    }))
  return [...contas, ...parc, ...extras].filter((o) => !fora.has(o.id) && !fora.has(o.ref)).sort((a, b) => cmp(a.vencimento, b.vencimento) || cmp(a.id, b.id))
}

// Parcela mínima de cada dívida ativa, uma por mês, no dia de vencer, do mês de `hoje` até `ate`.
// `pagas`: ['id|AAAA-MM'] das que já foram pagas naquele mês. Dívida sem dia de vencimento não entra
// (vai em `semDia` para a tela avisar).
export function obrigacoesDeDividas({ dividas = [], pagas = [], hoje, ate }) {
  const feitas = new Set(pagas)
  const itens = [], semDia = []
  for (const d of dividas) {
    if (d.ativo === false || !num(d.parcela_minima_cent)) continue
    if (!d.dia_venc) { semDia.push(d); continue }
    let ano = Number(hoje.slice(0, 4)), mes = Number(hoje.slice(5, 7))
    for (let k = 0; k < 40; k++) {
      const venc = dataDoMes(ano, mes, d.dia_venc)
      if (venc > ate) break
      const ref = venc.slice(0, 7)
      // parcela que venceu há mais de 15 dias sem registro não vira "atrasada" para sempre
      if (venc >= addDays(hoje, -15) && !feitas.has(`${d.id}|${ref}`)) {
        itens.push({
          id: `d:${d.id}|${ref}`, ref: d.id, tipo: 'divida', descricao: `Dívida: ${d.credor}`, valor_cent: num(d.parcela_minima_cent), vencimento: venc,
          prioridade: d.prioridade || 'importante', multa_pct: 0, juros_dia_pct: 0, mes: ref,
        })
      }
      mes += 1
      if (mes > 12) { mes = 1; ano += 1 }
    }
  }
  return { itens, semDia }
}

// multa (uma vez) + juros por dia de atraso, em centavos
export function encargosDeAtraso(o, em) {
  const dias = Math.max(0, daysBetween(o.vencimento, em))
  if (!dias) return 0
  return Math.round(o.valor_cent * num(o.multa_pct) / 100 + o.valor_cent * num(o.juros_dia_pct) / 100 * dias)
}

export const valorDevido = (o, em) => o.valor_cent + encargosDeAtraso(o, em)

// ---------------------------------------------------------------------------
// 4.2 Saldo projetado dia a dia
// ---------------------------------------------------------------------------
// saldo(d) = saldo de hoje + entradas esperadas até d − obrigações com vencimento ≤ d.
// O que já venceu (atrasado) cai todo em `hoje`, com os encargos calculados até hoje.
export function projetarSaldo({ saldoCent, hoje, ate, entradas = [], obrigacoes = [] }) {
  const fim = ate > addDays(hoje, 800) ? addDays(hoje, 800) : ate
  const ent = new Map(), sai = new Map()
  for (const e of entradas) { if (e.data >= hoje) ent.set(e.data, (ent.get(e.data) || []).concat(e)) }
  for (const o of obrigacoes) {
    const dia = o.vencimento < hoje ? hoje : o.vencimento
    sai.set(dia, (sai.get(dia) || []).concat(o))
  }
  const dias = []
  let saldo = saldoCent
  for (let d = hoje; d <= fim; d = addDays(d, 1)) {
    const es = ent.get(d) || [], ss = sai.get(d) || []
    const entrou = soma(es, (e) => e.valor_cent)
    const saiu = soma(ss, (o) => valorDevido(o, hoje))
    saldo += entrou - saiu
    dias.push({ data: d, saldo_cent: saldo, entrou_cent: entrou, saiu_cent: saiu, entradas: es, saidas: ss })
  }
  return dias
}

// ---------------------------------------------------------------------------
// 4.3 Quanto posso gastar hoje
// ---------------------------------------------------------------------------
export function estadoDoDia({ livreCent, limiteCent, disponivelCent }) {
  if (livreCent <= 0 || disponivelCent <= 0) return 'vermelho'
  if (disponivelCent * 100 <= limiteCent * LIMIAR_AMARELO_PCT) return 'amarelo'
  return 'verde'
}

// Quando o dinheiro não fecha: o que dá para empurrar (só "pode adiar") e quanto custa.
export function sugerirAdiamentos({ faltaCent, obrigacoes, hoje, fimHorizonte, dataEntrada }) {
  const alvo = dataEntrada || addDays(fimHorizonte, 1)
  const candidatos = obrigacoes
    .filter((o) => o.prioridade === 'adiavel' && o.vencimento >= hoje && o.vencimento <= fimHorizonte)
    .map((o) => {
      const dias = Math.max(0, daysBetween(o.vencimento, alvo))
      const custo = Math.round(o.valor_cent * num(o.multa_pct) / 100 + o.valor_cent * num(o.juros_dia_pct) / 100 * dias)
      return { ...o, dias_adiados: dias, custo_cent: custo }
    })
    .sort((a, b) => a.custo_cent - b.custo_cent || b.valor_cent - a.valor_cent)
  const itens = []
  let cobre = 0
  for (const c of candidatos) {
    if (cobre >= faltaCent) break
    itens.push(c); cobre += c.valor_cent
  }
  return { itens, cobre_cent: cobre, cobreTudo: cobre >= faltaCent, custo_cent: soma(itens, (i) => i.custo_cent) }
}

/**
 * Painel do dia ("Hoje"). Entradas:
 *  hoje, config, saldoCent (saldo real agora), modelos, recebidos, avulsas ([{data,valor_cent,descricao}]),
 *  compromissos, parcelas, gastosPorDia ({ 'AAAA-MM-DD': centavos gastos, positivos, só gasto variável }),
 *  inicioCiclo (data do último recebimento registrado), desdeMin (início do histórico).
 */
export function calcularPainel({
  hoje, config = {}, saldoCent = 0, modelos = [], recebidos = [], avulsas = [], compromissos = [], parcelas = [],
  gastosPorDia = {}, inicioCiclo = null, desdeMin = null, dividas = [], dividasPagas = [], serieDias = 30,
}) {
  const colchao = num(config.colchao_cent)
  const regra = config.regra_fim_semana || 'antecipar'
  const horizonte = config.horizonte || 'segunda_entrada'
  const acumular = Boolean(config.acumular_sobra_dia)
  const avisos = []

  const gastoHoje = num(gastosPorDia[hoje])
  // o limite do dia sai do saldo de ANTES dos gastos de hoje, senão encolheria a cada gasto
  const saldoInicioDia = saldoCent + gastoHoje

  const futuras = [
    ...entradasEsperadas({ modelos, regra, desde: hoje, ate: addDays(hoje, 400), recebidos }),
    ...avulsas.filter((a) => a.data >= hoje).map((a, i) => ({ id: `avulsa:${i}`, data: a.data, descricao: a.descricao || 'Entrada prevista', valor_cent: num(a.valor_cent) })),
  ].sort((a, b) => cmp(a.data, b.data) || cmp(a.id, b.id))

  const datasFuturas = [...new Set(futuras.filter((e) => e.data > hoje).map((e) => e.data))]
  const proxima = datasFuturas[0] || null
  const segunda = datasFuturas[1] || null
  const semEntrada = !proxima

  const fimCiclo = proxima ? addDays(proxima, -1) : addDays(hoje, DIAS_SEM_ENTRADA - 1)
  let fimHorizonte = fimCiclo
  if (proxima && horizonte === 'segunda_entrada') {
    if (segunda) fimHorizonte = addDays(segunda, -1)
    else avisos.push('Só há um recebimento à frente, então o cálculo olha só até ele.')
  }
  if (semEntrada) avisos.push('Nenhum recebimento cadastrado: dividi o que sobra pelos próximos 30 dias.')
  const dias = Math.max(1, daysBetween(hoje, fimCiclo) + 1)

  const dv = obrigacoesDeDividas({ dividas, pagas: dividasPagas, hoje, ate: addDays(hoje, Math.max(serieDias, 130)) })
  if (dv.semDia.length) avisos.push(`Informe o dia do vencimento de ${dv.semDia.map((d) => d.credor).join(', ')} para a parcela mínima entrar na conta.`)
  const obrigacoes = normalizarObrigacoes({ compromissos, parcelas, extras: dv.itens })
  const fimSerie = fimHorizonte > addDays(hoje, serieDias - 1) ? fimHorizonte : addDays(hoje, serieDias - 1)
  const serie = projetarSaldo({ saldoCent: saldoInicioDia, hoje, ate: fimSerie, entradas: futuras, obrigacoes })
  const janela = serie.filter((d) => d.data <= fimHorizonte)
  let pior = janela[0]
  for (const d of janela) if (d.saldo_cent < pior.saldo_cent) pior = d

  const livre = pior.saldo_cent - colchao
  const limiteLivre = Math.floor(Math.max(0, livre) / dias)

  // sobra dos dias anteriores do ciclo
  const passados = inicioCiclo && inicioCiclo < hoje ? daysBetween(inicioCiclo, hoje) : 0
  let gastosAnteriores = 0
  if (passados) for (let d = inicioCiclo; d < hoje; d = addDays(d, 1)) gastosAnteriores += num(gastosPorDia[d])
  const baseCiclo = passados && !semEntrada ? Math.floor(Math.max(0, livre + gastosAnteriores) / (dias + passados)) : limiteLivre
  const limite = livre <= 0 ? 0 : acumular ? limiteLivre : Math.min(limiteLivre, baseCiclo)
  const sobraDeOntem = Math.max(0, limiteLivre - baseCiclo)

  const disponivel = limite - gastoHoje
  const estado = estadoDoDia({ livreCent: livre, limiteCent: limite, disponivelCent: disponivel })

  const faltam = livre < 0 ? -livre : 0
  const adiar = faltam ? sugerirAdiamentos({ faltaCent: faltam, obrigacoes, hoje, fimHorizonte, dataEntrada: proxima }) : null

  const atrasadas = obrigacoes.filter((o) => o.vencimento < hoje).map((o) => ({ ...o, encargos_cent: encargosDeAtraso(o, hoje), dias_atraso: daysBetween(o.vencimento, hoje) }))
  const limite7 = addDays(hoje, 7)
  const proximasContas = obrigacoes.filter((o) => o.vencimento >= hoje && o.vencimento <= limite7)

  const desde = [addDays(hoje, -7), desdeMin].filter(Boolean).sort().pop()
  const pendentes = entradasEsperadas({ modelos, regra, desde, ate: hoje, recebidos })
  const conviteRegistrar = pendentes.length > 0

  const painel = {
    hoje, estado, semEntrada, conviteRegistrar, pendentes, avisos,
    saldoCent, saldoInicioDia, gastoHoje,
    livre, faltam, limite, disponivel, dias,
    proximaEntrada: proxima ? { data: proxima, dias_ate: daysBetween(hoje, proxima), entradas: futuras.filter((e) => e.data === proxima) } : null,
    segundaEntrada: segunda, fimCiclo, fimHorizonte, pior: { data: pior.data, saldo_cent: pior.saldo_cent }, colchao,
    sobraDeOntem, baseCiclo, acumular, passados,
    adiar, atrasadas, proximasContas, serie,
    entradasFuturas: futuras.filter((e) => e.data <= fimSerie),
  }
  painel.explicacao = explicarDia(painel)
  painel.mensagem = estado === 'vermelho' ? (faltam ? `Faltam ${brl(faltam)} para fechar o ciclo` : 'Hoje não gaste nada') : `Você pode gastar ${brl(disponivel)} hoje`
  return painel
}

// "Por quê?": a conta inteira, passo a passo. As linhas somam exatamente até o pior saldo.
export function explicarDia(p) {
  const ate = p.pior.data
  const dias = p.serie.filter((d) => d.data <= ate)
  const entradas = dias.flatMap((d) => d.entradas)
  const saidas = dias.flatMap((d) => d.saidas.map((o) => ({ ...o, devido: valorDevido(o, p.hoje) })))
  const linhas = []
  linhas.push({
    chave: 'saldo', sinal: '', texto: 'Saldo no começo de hoje', valor_cent: p.saldoInicioDia,
    nota: p.gastoHoje ? `Saldo de agora (${brl(p.saldoCent)}) mais o que você já gastou hoje (${brl(p.gastoHoje)}), para o limite do dia não encolher a cada gasto.` : 'O saldo das suas contas agora.',
  })
  linhas.push({
    chave: 'entradas', sinal: '+', texto: `Dinheiro que deve entrar até ${dm(ate)}`, valor_cent: soma(entradas, (e) => e.valor_cent),
    itens: entradas.map((e) => ({ texto: `${dm(e.data)} · ${e.descricao}`, valor_cent: e.valor_cent })),
    nota: entradas.length ? null : 'Nenhum recebimento previsto nesse período.',
  })
  linhas.push({
    chave: 'contas', sinal: '-', texto: `Contas que vencem até ${dm(ate)}`, valor_cent: soma(saidas, (o) => o.devido),
    itens: saidas.map((o) => ({ texto: `${o.vencimento < p.hoje ? 'atrasada' : dm(o.vencimento)} · ${o.descricao}`, valor_cent: o.devido })),
    nota: saidas.length ? 'Atrasadas entram com multa e juros até hoje.' : 'Nenhuma conta vence nesse período.',
  })
  linhas.push({ chave: 'pior', sinal: '=', texto: 'Saldo mais baixo do período', valor_cent: p.pior.saldo_cent, nota: `Acontece em ${dm(ate)}. O período vai até ${dm(p.fimHorizonte)}.` })
  linhas.push({ chave: 'colchao', sinal: '-', texto: 'Colchão que você não quer tocar', valor_cent: p.colchao })
  linhas.push({ chave: 'livre', sinal: '=', texto: p.livre < 0 ? 'Falta para fechar o ciclo' : 'Livre para gastar até o próximo recebimento', valor_cent: p.livre })
  if (p.livre > 0) {
    linhas.push({
      chave: 'dias', sinal: '÷', texto: p.semEntrada ? 'Dias (sem recebimento cadastrado, uso 30)' : `Dias até o próximo recebimento (${dm(p.hoje)} a ${dm(p.fimCiclo)})`, valor: p.dias,
    })
    let notaLimite = null
    if (p.passados && p.acumular && p.sobraDeOntem) notaLimite = `Inclui ${brl(p.sobraDeOntem)} que sobraram dos dias anteriores.`
    if (p.passados && !p.acumular && p.sobraDeOntem) notaLimite = `Sobras de dias anteriores (${brl(p.sobraDeOntem)} por dia) não entram no limite de hoje; ficam de folga.`
    linhas.push({ chave: 'limite', sinal: '=', texto: 'Limite de hoje', valor_cent: p.limite, nota: notaLimite })
    linhas.push({ chave: 'gasto', sinal: '-', texto: 'Já gasto hoje', valor_cent: p.gastoHoje })
    linhas.push({ chave: 'disponivel', sinal: '=', texto: 'Ainda pode gastar hoje', valor_cent: p.disponivel })
  }
  return linhas
}

// ---------------------------------------------------------------------------
// 4.4 Plano da entrada
// ---------------------------------------------------------------------------
/**
 * Plano ao registrar um recebimento de `valorCent` em `data`. Ordem fixa:
 *  1 atrasadas · 2 contas até a véspera da próxima entrada · 3 déficit do ciclo seguinte ·
 *  4 reserva · 5 livre. `jaPagas`: ids de contas que o usuário já pagou por fora (não entram).
 *  `ocorrenciaId`: a ocorrência que está sendo recebida (não conta como "próxima").
 */
export function planoDaEntrada({
  valorCent, data, config = {}, modelos = [], recebidos = [], ocorrenciaId = null,
  compromissos = [], parcelas = [], jaPagas = [], reservaAtualCent = 0, dividas = [], dividasPagas = [],
}) {
  const regra = config.regra_fim_semana || 'antecipar'
  const R = Math.max(0, num(valorCent))
  const dv = obrigacoesDeDividas({ dividas, pagas: dividasPagas, hoje: data, ate: addDays(data, 100) })
  const obrigacoes = normalizarObrigacoes({ compromissos, parcelas, ignorar: jaPagas, extras: dv.itens })

  const seguintes = entradasEsperadas({ modelos, regra, desde: addDays(data, 1), ate: addDays(data, 400), recebidos })
    .filter((e) => e.id !== ocorrenciaId)
  const datas = [...new Set(seguintes.map((e) => e.data))]
  const proxima = datas[0] || null
  const depois = datas[1] || null
  const dias = proxima ? Math.max(1, daysBetween(data, proxima)) : DIAS_SEM_ENTRADA
  const vespera = proxima ? addDays(proxima, -1) : addDays(data, DIAS_SEM_ENTRADA - 1)

  const atrasadas = obrigacoes.filter((o) => o.vencimento < data)
    .map((o) => ({ ...o, encargos_cent: encargosDeAtraso(o, data), devido_cent: valorDevido(o, data) }))
  const ciclo = obrigacoes.filter((o) => o.vencimento >= data && o.vencimento <= vespera).map((o) => ({ ...o, devido_cent: o.valor_cent }))
  const jurosEvitados = Math.round(soma(atrasadas, (o) => o.valor_cent * num(o.juros_dia_pct) / 100 * dias))

  const fimSeguinte = proxima ? (depois ? addDays(depois, -1) : addDays(proxima, DIAS_SEM_ENTRADA - 1)) : null
  const seguinte = proxima ? obrigacoes.filter((o) => o.vencimento >= proxima && o.vencimento <= fimSeguinte) : []
  const entradaSeguinte = proxima ? soma(seguintes.filter((e) => e.data === proxima), (e) => e.valor_cent) : 0
  const deficitSeguinte = Math.max(0, soma(seguinte, (o) => o.valor_cent) - entradaSeguinte)

  let resto = R
  const tira = (devido) => { const pago = Math.min(resto, devido); resto -= pago; return pago }
  const devidoAtrasadas = soma(atrasadas, (o) => o.devido_cent)
  const devidoCiclo = soma(ciclo, (o) => o.devido_cent)
  const pAtrasadas = tira(devidoAtrasadas)
  const pCiclo = tira(devidoCiclo)
  const pDeficit = tira(deficitSeguinte)
  const pctReserva = num(config.reserva_pct)
  const meta = num(config.meta_reserva_cent)
  const teto = meta > 0 ? Math.max(0, meta - num(reservaAtualCent)) : Infinity
  const queroReservar = Math.floor(resto * pctReserva / 100)
  const pReserva = Math.min(queroReservar, teto)
  resto -= pReserva

  const faltou = Math.max(0, devidoAtrasadas + devidoCiclo - (pAtrasadas + pCiclo))
  const fecha = faltou === 0
  const livre = fecha ? resto : 0
  const limiteDiario = fecha ? Math.floor(livre / dias) : 0

  const passos = [
    { id: 'atrasadas', titulo: 'Contas atrasadas', devido_cent: devidoAtrasadas, valor_cent: pAtrasadas, itens: atrasadas, nota: atrasadas.length ? (jurosEvitados ? `Quitando agora você evita cerca de ${brl(jurosEvitados)} de juros até o próximo recebimento.` : 'Quite primeiro para parar os encargos.') : 'Nenhuma conta atrasada.' },
    { id: 'ciclo', titulo: proxima ? `Contas até ${dm(vespera)}` : 'Contas dos próximos 30 dias', devido_cent: devidoCiclo, valor_cent: pCiclo, itens: ciclo, nota: ciclo.length ? null : 'Nenhuma conta vence antes do próximo recebimento.' },
    { id: 'deficit', titulo: 'Reforço para o ciclo seguinte', devido_cent: deficitSeguinte, valor_cent: pDeficit, itens: seguinte, nota: deficitSeguinte ? `As contas do ciclo seguinte (${brl(soma(seguinte, (o) => o.valor_cent))}) passam do que deve entrar (${brl(entradaSeguinte)}). Separe a diferença agora.` : 'O próximo recebimento cobre as contas do ciclo seguinte.' },
    { id: 'reserva', titulo: 'Reserva', devido_cent: queroReservar, valor_cent: pReserva, itens: [], nota: pctReserva ? (teto === 0 ? 'A meta da reserva já foi atingida.' : `${pctReserva.toLocaleString('pt-BR')}% do que sobra.`) : 'Percentual da reserva em zero nas configurações.' },
    { id: 'livre', titulo: 'Livre para gastar', devido_cent: livre, valor_cent: livre, itens: [], nota: fecha ? `Dá ${brl(limiteDiario)} por dia durante ${dias} dia(s).` : 'Não sobra nada livre.' },
  ]
  return {
    valorCent: R, data, proxima, dias, vespera, ocorrenciaId,
    passos, faltou, fecha, livre, limiteDiario, jurosEvitados, deficitSeguinte,
    partes: [
      { id: 'atrasadas', valor_cent: pAtrasadas }, { id: 'ciclo', valor_cent: pCiclo }, { id: 'deficit', valor_cent: pDeficit },
      { id: 'reserva', valor_cent: pReserva }, { id: 'livre', valor_cent: livre },
    ],
  }
}

// ---------------------------------------------------------------------------
// 4.5 Cartão: em que fatura cai a compra
// ---------------------------------------------------------------------------
// Compra no dia do fechamento ainda entra na fatura que fecha naquele dia; no dia seguinte, na próxima.
// O vencimento é no mesmo mês do fechamento quando o dia de vencer é maior que o do fechar;
// senão, no mês seguinte (fatura que cruza o mês).
export function faturaDaCompra(dataCompra, { fechamento_dia, vencimento_dia }) {
  const ano = Number(dataCompra.slice(0, 4)), mes = Number(dataCompra.slice(5, 7))
  const fechaNoMes = dataDoMes(ano, mes, fechamento_dia)
  const ref = dataCompra <= fechaNoMes ? { a: ano, m: mes } : (mes === 12 ? { a: ano + 1, m: 1 } : { a: ano, m: mes + 1 })
  const venc = vencimento_dia > fechamento_dia ? ref : (ref.m === 12 ? { a: ref.a + 1, m: 1 } : { a: ref.a, m: ref.m + 1 })
  return {
    ref_mes: `${ref.a}-${String(ref.m).padStart(2, '0')}-01`,
    fechamento: dataDoMes(ref.a, ref.m, fechamento_dia),
    vencimento: dataDoMes(venc.a, venc.m, vencimento_dia),
  }
}

// Parcelas 1…n de uma compra no cartão: a 1ª na fatura da compra, as outras nas seguintes.
export function parcelasNoCartao({ dataCompra, cartao, valores }) {
  const base = faturaDaCompra(dataCompra, cartao)
  return valores.map((valor_cent, i) => {
    const total = Number(base.ref_mes.slice(5, 7)) - 1 + i
    const a = Number(base.ref_mes.slice(0, 4)) + Math.floor(total / 12), m = (total % 12) + 1
    const venc = cartao.vencimento_dia > cartao.fechamento_dia ? { a, m } : (m === 12 ? { a: a + 1, m: 1 } : { a, m: m + 1 })
    return {
      numero: i + 1, valor_cent,
      ref_mes: `${a}-${String(m).padStart(2, '0')}-01`,
      fechamento: dataDoMes(a, m, cartao.fechamento_dia),
      vencimento: dataDoMes(venc.a, venc.m, cartao.vencimento_dia),
    }
  })
}

// ---------------------------------------------------------------------------
// Contas recorrentes: ocorrências com 90 dias de antecedência, sem duplicar
// ---------------------------------------------------------------------------
// `modelos`: a conta original de cada série (recorrencia mensal/anual, sem origem_id).
// `existentes`: [{ origem_id, vencimento }] já gravadas. Devolve só as que faltam.
export function ocorrenciasRecorrentes({ modelos, existentes = [], hoje, antecedencia = ANTECEDENCIA_RECORRENTES }) {
  const limite = addDays(hoje, antecedencia)
  const tem = new Set(existentes.map((e) => `${e.origem_id}|${String(e.vencimento).slice(0, 10)}`))
  const novas = []
  for (const m of modelos) {
    if (m.status === 'cancelada' || !['mensal', 'anual'].includes(m.recorrencia)) continue
    const ancora = String(m.vencimento).slice(0, 10)
    const dia = m.dia_venc || Number(ancora.slice(8))
    const a0 = Number(ancora.slice(0, 4)), m0 = Number(ancora.slice(5, 7))
    for (let k = 1; k < 1500; k++) {
      let ano, mes
      if (m.recorrencia === 'mensal') { const t = m0 - 1 + k; ano = a0 + Math.floor(t / 12); mes = (t % 12) + 1 } else { ano = a0 + k; mes = m0 }
      const venc = dataDoMes(ano, mes, dia)
      if (venc > limite) break
      if (venc < hoje || tem.has(`${m.id}|${venc}`)) continue
      novas.push({
        origem_id: m.id, descricao: m.descricao, valor_cent: num(m.valor_cent), vencimento: venc, categoria_id: m.categoria_id || null,
        recorrencia: m.recorrencia, dia_venc: dia, prioridade: m.prioridade || 'importante', multa_pct: m.multa_pct ?? null, juros_dia_pct: m.juros_dia_pct ?? null, status: 'aberta',
      })
    }
  }
  return novas
}
