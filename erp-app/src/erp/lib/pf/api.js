// Acesso aos dados do módulo Pessoal. Tudo passa pelo cliente do Supabase com a sessão do
// usuário: a segurança de verdade é a RLS das tabelas pf_* (só o dono). Valores em centavos.
import { supabase } from '../supabase'
import { fetchRows, rpc } from '../data'

export const PRIORIDADES = { essencial: 'Essencial', importante: 'Importante', adiavel: 'Pode adiar' }
export const PRIORIDADE_COR = { essencial: 'bl', importante: '', adiavel: 'y' }
export const RECORRENCIAS = { unica: 'Única', mensal: 'Todo mês', anual: 'Todo ano' }
export const TIPOS_CONTA = { corrente: 'Conta corrente', dinheiro: 'Dinheiro em mãos', cartao: 'Cartão de crédito' }
export const REGRAS_FIM_SEMANA = [
  ['antecipar', 'Cai no dia útil anterior'],
  ['proximo_dia_util', 'Cai no próximo dia útil'],
  ['manter', 'Fica na data, mesmo no fim de semana'],
]
export const HORIZONTES = [
  ['proxima_entrada', 'Até o próximo recebimento'],
  ['segunda_entrada', 'Até o segundo recebimento'],
]
export const CORES = ['#15C45A', '#3FDD7C', '#8AB2FF', '#E5A23A', '#F0C04A', '#FF7A7D', '#C79BFF', '#5FD0C5', '#B5835A', '#8A938E']

// categorias que já vêm prontas (todas editáveis)
export const CATEGORIAS_PADRAO = [
  ['Moradia', 'saida', '#8AB2FF', true],
  ['Alimentação', 'saida', '#E5A23A', true],
  ['Transporte', 'saida', '#5FD0C5', true],
  ['Saúde', 'saida', '#FF7A7D', true],
  ['Estudos (FIAP)', 'saida', '#C79BFF', true],
  ['Assinaturas', 'saida', '#F0C04A', false],
  ['Lazer', 'saida', '#3FDD7C', false],
  ['Dívidas', 'saida', '#B5835A', true],
  ['Imprevistos', 'saida', '#8A938E', false],
  ['Reserva', 'saida', '#15C45A', false],
  ['Salário', 'entrada', '#15C45A', false],
  ['Outras entradas', 'entrada', '#3FDD7C', false],
].map(([nome, tipo, cor, essencial], i) => ({ nome, tipo, cor, essencial, ordem: i }))

// cria a configuração (1 linha) e as categorias padrão na primeira visita
export async function garantirBase(uid) {
  const { error: e1 } = await supabase.from('pf_config').upsert({ owner_id: uid }, { onConflict: 'owner_id', ignoreDuplicates: true })
  if (e1) throw e1
  const { count, error: e2 } = await supabase.from('pf_categorias').select('id', { count: 'exact', head: true })
  if (e2) throw e2
  if (!count) await restaurarCategoriasPadrao(uid)
}

export async function restaurarCategoriasPadrao(uid) {
  const linhas = CATEGORIAS_PADRAO.map((c) => ({ ...c, owner_id: uid }))
  const { error } = await supabase.from('pf_categorias').upsert(linhas, { onConflict: 'owner_id,tipo,nome', ignoreDuplicates: true })
  if (error) throw error
}

export async function lerConfig() {
  const { data, error } = await supabase.from('pf_config').select('*').maybeSingle()
  if (error) throw error
  return data
}

// carrega tudo que as telas de configuração usam (tabelas pequenas, cadastradas à mão)
export async function lerCadastros() {
  const [contas, categorias, modelos] = await Promise.all([
    fetchRows('pf_contas', { order: 'ordem', ascending: true }),
    fetchRows('pf_categorias', { order: 'ordem', ascending: true }),
    fetchRows('pf_recebimentos_modelo', { order: 'dia_mes', ascending: true }),
  ])
  return { contas, categorias, modelos }
}

// totais calculados no banco (pf_resumo_base)
export const lerResumoBase = () => rpc('pf_resumo_base')

export const percentual = (txt) => {
  const n = parseFloat(String(txt ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
}
