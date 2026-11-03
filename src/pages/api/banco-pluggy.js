// Ponte com o Pluggy (Open Finance) para o ERP. Só o Diretor geral usa.
// As chaves ficam SÓ aqui, no servidor (variáveis da Vercel). O navegador nunca as vê:
// ele chama esta rota com a sessão do ERP e recebe só os lançamentos já normalizados.
// Nada é gravado no banco por esta rota; quem grava é o ERP, com a RLS do diretor.
//
// Variáveis na Vercel (Settings → Environment Variables):
//   PLUGGY_CLIENT_ID      Client ID da aplicação no painel do Pluggy
//   PLUGGY_CLIENT_SECRET  Client Secret da aplicação (nunca com prefixo VITE_)
//   PLUGGY_ITEM_ID        id da conexão (item) do Nu Empresas, criada ao autorizar no Pluggy
//   VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (as mesmas do front, para validar a sessão)
//
// GET  ?acao=status                      -> { configurado }
// POST { acao: 'transacoes', de, ate }   -> { transacoes: [...] }  (datas AAAA-MM-DD)

const API = 'https://api.pluggy.ai'

async function exigirDiretor(req) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !url || !anon) return { erro: [401, 'Não autenticado'] }
  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })
  if (!u.ok) return { erro: [401, 'Sessão inválida'] }
  const user = await u.json()
  const p = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,active`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  })
  const [perfil] = (await p.json()) || []
  if (!perfil || perfil.role !== 'diretor' || !perfil.active) return { erro: [403, 'Só o Diretor geral acessa os dados do banco.'] }
  return { ok: true }
}

const configurado = () => Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET && process.env.PLUGGY_ITEM_ID)

async function pluggy(caminho, apiKey, init = {}) {
  const r = await fetch(`${API}${caminho}`, { ...init, headers: { 'content-type': 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}), ...init.headers } })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(dados?.message || `Pluggy respondeu ${r.status}`)
  return dados
}

const centavos = (n) => Math.round(Math.abs(Number(n) || 0) * 100)

function normalizar(t) {
  const credito = String(t.type || '').toUpperCase() === 'CREDIT' || (!t.type && Number(t.amount) > 0)
  const pd = t.paymentData || {}
  const parte = credito ? pd.payer : pd.receiver
  return {
    external_id: `pluggy:${t.id}`,
    posted_on: String(t.date || '').slice(0, 10),
    description: String(t.description || '').replace(/\s+/g, ' ').trim(),
    amount_cents: centavos(t.amount),
    direction: credito ? 'entrada' : 'saida',
    counterparty: String(parte?.name || '').trim(),
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const auth = await exigirDiretor(req)
    if (auth.erro) return res.status(auth.erro[0]).json({ error: auth.erro[1] })

    const acao = req.method === 'GET' ? req.query.acao : (req.body || {}).acao
    if (acao === 'status') return res.status(200).json({ configurado: configurado() })

    if (req.method !== 'POST' || acao !== 'transacoes') return res.status(400).json({ error: 'Ação inválida.' })
    if (!configurado()) return res.status(501).json({ error: 'Conexão automática não ligada: cadastre as chaves do Pluggy na Vercel.' })

    const { de, ate } = req.body || {}
    const data = /^\d{4}-\d{2}-\d{2}$/
    if (!data.test(de || '') || !data.test(ate || '')) return res.status(400).json({ error: 'Informe o período (de, ate) como AAAA-MM-DD.' })

    const { apiKey } = await pluggy('/auth', null, {
      method: 'POST',
      body: JSON.stringify({ clientId: process.env.PLUGGY_CLIENT_ID, clientSecret: process.env.PLUGGY_CLIENT_SECRET }),
    })
    const contas = await pluggy(`/accounts?itemId=${encodeURIComponent(process.env.PLUGGY_ITEM_ID)}`, apiKey)
    const transacoes = []
    for (const conta of contas.results || []) {
      for (let pagina = 1, total = 1; pagina <= total && pagina <= 40; pagina++) {
        const r = await pluggy(`/transactions?accountId=${encodeURIComponent(conta.id)}&from=${de}&to=${ate}&pageSize=500&page=${pagina}`, apiKey)
        total = r.totalPages || 1
        for (const t of r.results || []) transacoes.push(normalizar(t))
      }
    }
    return res.status(200).json({ transacoes: transacoes.filter((t) => t.posted_on && t.amount_cents > 0) })
  } catch (e) {
    return res.status(502).json({ error: 'Falha ao falar com o provedor bancário: ' + (e.message || e) })
  }
}
