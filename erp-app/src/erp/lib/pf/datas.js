// Datas do módulo Pessoal. Funções puras (sem Supabase, sem React).
// Datas de vencimento são sempre texto AAAA-MM-DD; "hoje" é o de São Paulo.
import { parseDate, isoDate, addDays, addMonths } from '../format'

export const FUSO = 'America/Sao_Paulo'

const fmtSP = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
export const hojeSP = () => fmtSP.format(new Date())

const pad = (n) => String(n).padStart(2, '0')

// dia 30 em fevereiro (ou 31 em mês de 30 dias) = último dia do mês
export function dataDoMes(ano, mes, dia) {
  const ultimo = new Date(ano, mes, 0).getDate()
  return `${ano}-${pad(mes)}-${pad(Math.min(dia, ultimo))}`
}

// Páscoa (algoritmo de Meeus/Jones/Butcher)
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${pad(mes)}-${pad(dia)}`
}

const cacheFeriados = new Map()
// feriados nacionais + dias em que os bancos não abrem (carnaval, sexta santa, corpus christi)
export function feriados(ano) {
  if (cacheFeriados.has(ano)) return cacheFeriados.get(ano)
  const p = pascoa(ano)
  const set = new Set([
    `${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`,
    `${ano}-11-02`, `${ano}-11-15`, `${ano}-11-20`, `${ano}-12-25`,
    addDays(p, -48), addDays(p, -47), addDays(p, -2), addDays(p, 60),
  ])
  cacheFeriados.set(ano, set)
  return set
}

export const diaDaSemana = (iso) => parseDate(iso).getDay() // 0 = domingo
export const ehFimDeSemana = (iso) => [0, 6].includes(diaDaSemana(iso))
export const ehFeriado = (iso) => feriados(Number(iso.slice(0, 4))).has(iso)
export const ehDiaUtil = (iso) => !ehFimDeSemana(iso) && !ehFeriado(iso)

// regra: 'antecipar' (dia útil anterior) | 'proximo_dia_util' | 'manter'
export function ajustarPelaRegra(iso, regra) {
  if (regra === 'manter' || ehDiaUtil(iso)) return iso
  const passo = regra === 'proximo_dia_util' ? 1 : -1
  let d = iso
  for (let i = 0; i < 10 && !ehDiaUtil(d); i++) d = addDays(d, passo)
  return d
}

// próximas datas em que um recebimento modelo (dia_mes) cai, já ajustadas pela regra,
// a partir de `desde` (inclusive). Cada item: { data, nominal, ajustada }
export function proximasDatas(diaMes, regra, desde, quantas = 3) {
  const out = []
  const base = parseDate(desde)
  let ano = base.getFullYear(), mes = base.getMonth() + 1
  for (let i = 0; i < quantas + 14 && out.length < quantas; i++) {
    const nominal = dataDoMes(ano, mes, diaMes)
    const data = ajustarPelaRegra(nominal, regra)
    if (data >= desde) out.push({ data, nominal, ajustada: data !== nominal })
    mes += 1
    if (mes > 12) { mes = 1; ano += 1 }
  }
  return out
}

// recebimentos de todos os modelos ativos, em ordem de data
export function proximosRecebimentos(modelos, regra, desde, quantas = 4) {
  const todos = []
  for (const m of modelos.filter((x) => x.ativo)) {
    for (const o of proximasDatas(m.dia_mes, regra, desde, quantas)) todos.push({ ...o, modelo: m })
  }
  return todos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)).slice(0, quantas)
}

export { addDays, addMonths, isoDate }
