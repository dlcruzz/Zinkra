import React from 'react'
import { insert, update, remove, fetchRows } from '../lib/data'
import { brl } from '../lib/format'
import { taxaDoCartao, taxaPelaCaida, comissaoTotal, validarValor } from '../lib/financeiro'
import { Field, Select, MoneyInput } from './ui'

// Campos de "pagou no cartão" e "tem comissão", usados no projeto novo e na aba Financeiro.
// Nada é calculado aqui além da prévia: as contas de verdade estão em lib/financeiro.js.

export const CARTAO_VAZIO = { usa: false, parcelas: 1, modo: 'pct', taxa: '', caiu: 0, base: 0 }
export const COMISSAO_VAZIA = { usa: false, nome: '', partner_id: null, kind: 'percentual', valor: 0, pct: 30, base: 'liquido' }

const num = (s) => Number(String(s).replace(',', '.')) || 0
const pctTexto = (n) => String(n).replace('.', ',')

export function cartaoDoBanco(c) {
  if (!c) return { ...CARTAO_VAZIO }
  return { usa: true, parcelas: c.parcelas || 1, modo: 'pct', taxa: pctTexto(Number(c.taxa_pct) || 0), caiu: 0, base: Number(c.base_cents) || 0 }
}

export function comissaoDoBanco(c) {
  if (!c) return { ...COMISSAO_VAZIA }
  return { usa: true, nome: c.partner_name || '', partner_id: c.partner_id || null, kind: c.kind || 'fixa', valor: Number(c.amount_cents) || 0, pct: Number(c.pct) || 0, base: c.base || 'liquido' }
}

// taxa em % de acordo com o modo escolhido (digitou a taxa, ou digitou quanto caiu na conta)
export function taxaEscolhida(v, total) {
  const noCartao = v.base > 0 ? Math.min(v.base, total) : total
  // "o que cai na conta" é do projeto inteiro: a taxa é a diferença para o valor cheio, e só incide sobre a parte do cartão
  return v.modo === 'caida' ? taxaPelaCaida(noCartao, noCartao - Math.max(0, total - v.caiu)) : num(v.taxa)
}

// linha de cartão pronta para o banco (ou o erro em texto)
export function cartaoParaBanco(v, total) {
  if (!v.usa) return { linha: null, erro: '' }
  if (!(v.parcelas >= 1 && v.parcelas <= 24)) return { linha: null, erro: 'As parcelas do cartão vão de 1 a 24.' }
  let taxa = num(v.taxa)
  if (v.modo === 'caida') {
    if (!(total > 0)) return { linha: null, erro: 'Informe o valor do projeto antes de dizer quanto caiu.' }
    const noCartao = v.base > 0 ? Math.min(v.base, total) : total
    const taxaEmReais = total - v.caiu
    if (!(v.caiu > 0) || taxaEmReais < 0 || taxaEmReais > noCartao) return { linha: null, erro: 'Quanto cai na conta precisa ser maior que zero e não passar do valor do projeto.' }
    taxa = taxaPelaCaida(noCartao, noCartao - taxaEmReais)
  }
  if (!(taxa >= 0 && taxa < 100)) return { linha: null, erro: 'A taxa do cartão precisa estar entre 0 e 100%.' }
  return { linha: { parcelas: Number(v.parcelas), taxa_pct: taxa, base_cents: v.base > 0 ? v.base : null }, erro: '' }
}

export function comissaoParaBanco(v) {
  if (!v.usa) return { linha: null, erro: '' }
  if (!v.nome.trim()) return { linha: null, erro: 'Escolha ou digite o parceiro da comissão.' }
  const erro = v.kind === 'fixa' ? validarValor(v.valor)
    : !(num(v.pct) > 0 && num(v.pct) <= 100) ? 'O percentual da comissão precisa estar entre 0 e 100.' : ''
  if (erro) return { linha: null, erro }
  return {
    linha: { partner_id: v.partner_id, partner_name: v.nome.trim(), kind: v.kind, amount_cents: v.kind === 'fixa' ? v.valor : 0, pct: v.kind === 'percentual' ? num(v.pct) : 0, base: v.base },
    erro: '',
  }
}

// Grava (cria, troca ou tira) o cartão do projeto.
export async function gravarCartao(projectId, linha, atual) {
  if (!linha) { if (atual) await remove('project_cartao', atual.id); return }
  if (atual) await update('project_cartao', atual.id, linha)
  else await insert('project_cartao', { project_id: projectId, ...linha })
}

// Garante que o parceiro existe na tela de Parceiros (cria se for nome novo) e devolve o id.
export async function parceiroPorNome(nome, partners, pctPadrao = 30) {
  const n = nome.trim().toLowerCase()
  const achado = (partners || []).find((p) => p.name.trim().toLowerCase() === n)
  if (achado) return achado.id
  const novo = await insert('partners', { name: nome.trim(), pct: Number(pctPadrao) || 30, active: true })
  return novo?.id || null
}

// Grava (cria, troca ou tira) a comissão do projeto, já ligada a um parceiro cadastrado.
export async function gravarComissao(projectId, linha, atual, partners) {
  if (!linha) { if (atual) await remove('project_comissao', atual.id); return }
  const partner_id = linha.partner_id || await parceiroPorNome(linha.partner_name, partners, linha.kind === 'percentual' ? linha.pct : 30)
  const row = { ...linha, partner_id }
  if (atual) await update('project_comissao', atual.id, row)
  else await insert('project_comissao', { project_id: projectId, ...row })
}

export async function carregarParceiros() {
  return fetchRows('partners', { order: 'name', ascending: true }).catch(() => [])
}

export function CartaoCampos({ value: v, onChange, total }) {
  const set = (k) => (x) => onChange({ ...v, [k]: x })
  const noCartao = v.base > 0 ? Math.min(v.base, total) : total
  const taxa = taxaEscolhida(v, total)
  const taxaCents = taxaDoCartao({ taxa_pct: taxa, base_cents: v.base > 0 ? v.base : null }, total)
  return (
    <div className="stack">
      <label className="check"><input type="checkbox" checked={v.usa} onChange={(e) => set('usa')(e.target.checked)} />O cliente vai pagar no cartão de crédito</label>
      {v.usa ? (
        <>
          <div className="fields">
            <Field label="Parcelas"><input className="in num" inputMode="numeric" value={v.parcelas} onChange={(e) => set('parcelas')(Math.min(24, Number(e.target.value.replace(/\D/g, '')) || 0))} /></Field>
            <Field label="Como informar a taxa">
              <Select value={v.modo} onChange={(x) => set('modo')(x || 'pct')} options={{ pct: 'Pela taxa (%)', caida: 'Pelo que cai na conta' }} />
            </Field>
            {v.modo === 'pct'
              ? <Field label="Taxa total da maquininha (%)" hint="a cobrada nessas parcelas"><input className="in num" inputMode="decimal" value={v.taxa} onChange={(e) => set('taxa')(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex.: 3,16" /></Field>
              : <Field label="Quanto cai na conta"><MoneyInput value={v.caiu} onChange={set('caiu')} /></Field>}
            <Field label="Valor passado no cartão" hint="vazio = o projeto inteiro"><MoneyInput value={v.base} onChange={set('base')} /></Field>
          </div>
          {total > 0 && taxa > 0 ? (
            <div className="note info">
              Taxa de {pctTexto(taxa)}% sobre {brl(noCartao)}: <b>{brl(taxaCents)}</b>. Caem na conta <b>{brl(total - taxaCents)}</b>. O faturamento continua em {brl(total)}; a taxa é custo.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function ComissaoCampos({ value: v, onChange, partners, total, liquido }) {
  const set = (k) => (x) => onChange({ ...v, [k]: x })
  const escolher = (nome) => {
    const p = partners.find((x) => x.name.toLowerCase() === nome.trim().toLowerCase())
    onChange({ ...v, nome, partner_id: p?.id || null, ...(p && v.kind === 'percentual' && !v.tocouPct ? { pct: Number(p.pct) || v.pct } : {}) })
  }
  const previa = comissaoTotal({ kind: v.kind, amount_cents: v.valor, pct: num(v.pct), base: v.base }, total, liquido)
  return (
    <div className="stack">
      <label className="check"><input type="checkbox" checked={v.usa} onChange={(e) => set('usa')(e.target.checked)} />Tem comissão de um parceiro (quem vendeu ou indicou)</label>
      {v.usa ? (
        <>
          <div className="fields">
            <Field label="Parceiro">
              <input className="in" list="comissao-parceiros" value={v.nome} onChange={(e) => escolher(e.target.value)} placeholder="Nome do parceiro" />
              <datalist id="comissao-parceiros">{partners.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            </Field>
            <Field label="Tipo"><Select value={v.kind} onChange={(x) => set('kind')(x || 'percentual')} options={{ percentual: 'Percentual', fixa: 'Valor fechado' }} /></Field>
            {v.kind === 'fixa'
              ? <Field label="Valor da comissão"><MoneyInput value={v.valor} onChange={set('valor')} /></Field>
              : <Field label="Percentual (%)"><input className="in num" inputMode="decimal" value={v.pct} onChange={(e) => onChange({ ...v, pct: e.target.value.replace(/[^\d.,]/g, ''), tocouPct: true })} /></Field>}
            {v.kind === 'percentual'
              ? <Field label="Percentual sobre"><Select value={v.base} onChange={(x) => set('base')(x || 'liquido')} options={{ liquido: 'O que cai na conta (depois da taxa)', bruto: 'O valor cheio do projeto' }} /></Field>
              : null}
          </div>
          {!v.nome.trim() || !v.partner_id ? (
            <span className="lbl">{v.nome.trim() ? 'Parceiro novo: ele será cadastrado em Parceiros ao salvar.' : 'O parceiro fica ligado ao projeto e aparece na tela de Parceiros com o que já foi pago.'}</span>
          ) : null}
          {total > 0 && previa > 0 ? <div className="note info">Comissão de <b>{brl(previa)}</b>. Ela sai do que cai na conta antes de dividir nas caixinhas.</div> : null}
        </>
      ) : null}
    </div>
  )
}
