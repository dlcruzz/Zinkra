// Assistente do ERP Zinkra (opcional).
// Recebe um resumo numérico da empresa e devolve recomendações em texto.
// Só funciona para usuários com papel "diretor" e só se ANTHROPIC_API_KEY estiver definida na Vercel.
//
// Variáveis na Vercel:
//   ANTHROPIC_API_KEY   chave da API da Anthropic (obrigatória para usar o assistente)
//   ERP_AI_MODEL        opcional; padrão claude-haiku-4-5-20251001 (mais barato)
//   VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (as mesmas do front)

const SYSTEM = `Você é o analista de negócios da Zinkra, uma software house pequena de São Paulo
(sites, sistemas sob medida, social media e tráfego pago), com o dono (diretor geral) e um prospector.
Você recebe um resumo em JSON com caixa, fluxo, funil de prospecção, scripts de mensagem, propostas e sinais
que o sistema já detectou. Responda em português do Brasil, direto e prático:
- Comece com o diagnóstico em 2 frases, citando números.
- Depois dê no máximo 5 ações concretas para os próximos 7 dias, em ordem de impacto no caixa, cada uma com o porquê em uma linha.
- Termine com 1 risco que ele precisa observar.
Não invente números que não estão no resumo. Sem jargão, sem emojis, sem markdown pesado (use apenas hífens para listas).`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(501).json({ error: 'Assistente desativado: defina ANTHROPIC_API_KEY nas variáveis da Vercel.' })

  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const sbAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !sbUrl || !sbAnon) return res.status(401).json({ error: 'Não autenticado' })

  try {
    // confere a sessão e o papel do usuário
    const u = await fetch(`${sbUrl}/auth/v1/user`, { headers: { apikey: sbAnon, Authorization: `Bearer ${token}` } })
    if (!u.ok) return res.status(401).json({ error: 'Sessão inválida' })
    const user = await u.json()
    const p = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role,active`, {
      headers: { apikey: sbAnon, Authorization: `Bearer ${token}` },
    })
    const [profile] = (await p.json()) || []
    if (!profile || profile.role !== 'diretor' || !profile.active) return res.status(403).json({ error: 'Só o Diretor geral usa o assistente.' })

    const { question, summary } = req.body || {}
    const body = JSON.stringify(summary || {}).slice(0, 20000)
    const prompt = question
      ? `Resumo da empresa:\n${body}\n\nPergunta do diretor: ${String(question).slice(0, 500)}`
      : `Resumo da empresa:\n${body}\n\nMonte o plano da semana.`

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ERP_AI_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Falha ao consultar o assistente' })
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim()
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: 'Erro no assistente: ' + (e.message || e) })
  }
}
