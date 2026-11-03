// Sugestões de conciliação: para cada lançamento pendente do banco, qual é o destino provável.
// Funções puras (sem banco), testadas em conciliacao.test.js.

const SEM_ACENTO = /[̀-ͯ]/g
const PALAVRAS_FRACAS = new Set(['ltda', 'me', 'epp', 'eireli', 'sa', 'de', 'da', 'do', 'das', 'dos', 'e', 'cia', 'mei', 'pix', 'pagamento', 'transferencia'])

// mesma regra de public.bank_chave() no banco: sem acento, minúsculo, só letras e números
export const chaveContraparte = (nome) =>
  String(nome || '').normalize('NFD').replace(SEM_ACENTO, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const tokens = (nome) => chaveContraparte(nome).split(' ').filter((t) => t.length > 1 && !PALAVRAS_FRACAS.has(t))

// Pega o nome da outra parte na descrição do extrato.
// Ex.: "Transferência recebida pelo Pix - FULANO DA SILVA - •••.123.456-•• - NU PAGAMENTOS"
export function extrairContraparte(descricao) {
  const d = String(descricao || '').replace(/\s+/g, ' ').trim()
  if (!d) return ''
  const partes = d.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean)
  if (partes.length >= 2) {
    const cand = partes.slice(1).find((p) => /[A-Za-zÀ-ÿ]{3}/.test(p) && !/[•*\d]{4,}/.test(p) && !/^(banco|nu pagamentos|agencia|ag[eê]ncia|conta)/i.test(p))
    if (cand) return cand
  }
  const m = /(?:para|de)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .']{3,})$/i.exec(d)
  return m ? m[1].trim() : ''
}

// 0..1: quanto o nome do extrato se parece com o nome cadastrado
export function parecenca(a, b) {
  const A = tokens(a), B = tokens(b)
  if (!A.length || !B.length) return 0
  const [menor, maior] = A.length <= B.length ? [A, B] : [B, A]
  const comum = menor.filter((t) => maior.includes(t))
  if (!comum.length) return 0
  // um nome de uma palavra só precisa ser um termo forte (4+ letras)
  if (menor.length === 1 && comum[0].length < 4) return 0
  return comum.length / menor.length
}

const LIMITE_NOME = 0.99

/**
 * @param tx          lançamento { direction, amount_cents, counterparty }
 * @param ctx.regras  linhas de bank_rules
 * @param ctx.projetos  [{ id, name, clientName, fin, comissao: { partner_name } | null }]
 * @param ctx.contasAbertas  contas a pagar em aberto [{ id, supplier, description, amount_cents }]
 * @returns { tipo, alvo, projectId, motivo, origem } ou null
 */
export function sugerir(tx, ctx) {
  const { regras = [], projetos = [], contasAbertas = [] } = ctx
  const chave = chaveContraparte(tx.counterparty)

  const regra = chave && regras.find((r) => r.counterparty_key === chave && r.direction === tx.direction)
  if (regra) {
    if (regra.target_type === 'ignorar') return { tipo: 'ignorar', alvo: null, projectId: null, motivo: 'Regra aprendida: ignorar', origem: 'regra' }
    return { tipo: regra.target_type, alvo: regra.project_id, projectId: regra.project_id, motivo: 'Regra aprendida de lançamentos anteriores', origem: 'regra' }
  }

  if (tx.direction === 'entrada') {
    const achados = projetos
      .map((p) => ({ p, s: parecenca(tx.counterparty, p.clientName) }))
      .filter((x) => x.s >= LIMITE_NOME)
    if (achados.length) {
      // prefere quem ainda tem saldo a receber, depois o maior saldo
      achados.sort((a, b) => (b.p.fin.faltaReceber > 0) - (a.p.fin.faltaReceber > 0) || b.p.fin.faltaReceber - a.p.fin.faltaReceber)
      const p = achados[0].p
      return { tipo: 'recebimento', alvo: p.id, projectId: p.id, motivo: `Cliente ${p.clientName} · projeto ${p.name}`, origem: 'nome' }
    }
    return null
  }

  const comParceiro = projetos
    .filter((p) => p.comissao && parecenca(tx.counterparty, p.comissao.partner_name) >= LIMITE_NOME)
    .sort((a, b) => (b.fin.comissaoAPagar > 0) - (a.fin.comissaoAPagar > 0) || b.fin.comissaoAPagar - a.fin.comissaoAPagar)
  if (comParceiro.length) {
    const p = comParceiro[0]
    return { tipo: 'pagamento_comissao', alvo: p.id, projectId: p.id, motivo: `Parceiro ${p.comissao.partner_name} · projeto ${p.name}`, origem: 'nome' }
  }

  const conta = contasAbertas.find((c) => c.amount_cents === tx.amount_cents &&
    (parecenca(tx.counterparty, c.supplier) >= LIMITE_NOME || !c.supplier))
  if (conta) return { tipo: 'conta_pagar', alvo: conta.id, projectId: null, motivo: `Conta a pagar: ${conta.description}`, origem: 'valor' }
  return null
}

export const TIPOS_DESTINO = {
  recebimento: 'Recebimento do projeto',
  pagamento_comissao: 'Pagamento de comissão',
  conta_pagar: 'Conta a pagar',
  ignorar: 'Ignorar',
}
