// Camada "provedor bancário": uma interface só, duas implementações trocáveis.
//   provedor = { id, nome, disponivel(): Promise<{ ok, motivo? }>, buscar(opcoes): Promise<Lancamento[]> }
// (a) arquivo: extrato OFX/CSV do app do Nubank, funciona sempre, sem depender de ninguém.
// (b) pluggy:  Open Finance via rota do servidor (/api/banco-pluggy). As chaves ficam na Vercel.
// Qualquer provedor devolve lançamentos no mesmo formato e passa pela mesma importação segura.
import { supabase } from '../supabase'
import { emitChange } from '../data'
import { lerArquivoExtrato } from './arquivo'

export const provedorArquivo = {
  id: 'arquivo',
  nome: 'Arquivo do extrato (OFX ou CSV)',
  async disponivel() { return { ok: true } },
  async buscar({ file }) {
    if (!file) throw new Error('Escolha o arquivo do extrato.')
    return lerArquivoExtrato(file)
  },
}

async function chamarPluggy(corpo, metodo = 'POST') {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const url = metodo === 'GET' ? `/api/banco-pluggy?acao=${corpo.acao}` : '/api/banco-pluggy'
  const r = await fetch(url, {
    method: metodo,
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: metodo === 'GET' ? undefined : JSON.stringify(corpo),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json.error || 'Falha na conexão automática.')
  return json
}

export const provedorPluggy = {
  id: 'pluggy',
  nome: 'Conexão automática (Open Finance)',
  async disponivel() {
    try {
      const { configurado } = await chamarPluggy({ acao: 'status' }, 'GET')
      return configurado ? { ok: true } : { ok: false, motivo: 'Ainda não ligada: faltam as chaves do provedor na Vercel.' }
    } catch (e) {
      return { ok: false, motivo: e.message }
    }
  },
  async buscar({ de, ate }) {
    const { transacoes } = await chamarPluggy({ acao: 'transacoes', de, ate })
    return transacoes
  },
}

export const PROVEDORES = { arquivo: provedorArquivo, pluggy: provedorPluggy }

const LOTE = 200

// Importação segura: nunca duplica (external_id único + ON CONFLICT DO NOTHING),
// nunca altera nem apaga lançamento já existente (inclusive os conciliados)
// e registra o que entrou e quando em bank_imports.
export async function importarLancamentos(lancamentos, { source, fileName = null }) {
  const lista = dedupe(lancamentos)
  if (!lista.length) return { total: 0, novos: 0, duplicados: 0 }
  const datas = lista.map((l) => l.posted_on).sort()
  const { data: imp, error: e1 } = await supabase.from('bank_imports')
    .insert({ source, file_name: fileName, total: lista.length, period_from: datas[0], period_to: datas[datas.length - 1] })
    .select('id').single()
  if (e1) throw e1

  let novos = 0
  for (let i = 0; i < lista.length; i += LOTE) {
    const linhas = lista.slice(i, i + LOTE).map((l) => ({ ...l, source, import_id: imp.id }))
    const { data, error } = await supabase.from('bank_transactions')
      .upsert(linhas, { onConflict: 'external_id', ignoreDuplicates: true }).select('id')
    if (error) throw error
    novos += data?.length || 0
  }
  const duplicados = lista.length - novos
  await supabase.from('bank_imports').update({ novos, duplicados }).eq('id', imp.id)
  emitChange('bank_transactions', 'bank_imports')
  return { total: lista.length, novos, duplicados }
}

function dedupe(lista) {
  const vistos = new Set()
  return lista.filter((l) => (vistos.has(l.external_id) ? false : (vistos.add(l.external_id), true)))
}
