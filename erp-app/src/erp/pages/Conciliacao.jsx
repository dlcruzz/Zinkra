import React, { useMemo, useRef, useState } from 'react'
import { useMeta } from '../components/Shell'
import { useAuth } from '../lib/auth'
import { useData, fetchRows, rpc, update, emitChange, notify } from '../lib/data'
import { brl, dm, dmy, today, addDays } from '../lib/format'
import { calcularCarteira } from '../lib/financeiro'
import { sugerir, TIPOS_DESTINO } from '../lib/banco/conciliacao'
import { PROVEDORES, importarLancamentos } from '../lib/banco/provedor'
import { PageHead, Card, Tabs, Loading, ErrorBox, Badge, Select, AsyncButton, Empty, useConfirm } from '../components/ui'
import { carregarFinanceiro } from '../components/FinanceiroLista'
import { Icon } from '../lib/icons'

const TABELAS = ['bank_transactions', 'bank_rules', 'bank_imports', 'project_recebimentos', 'project_comissao_pagamentos', 'project_valores', 'project_comissao', 'payables']
const FALTA_TABELA = /does not exist|schema cache|Could not find the table/i

export default function Conciliacao() {
  useMeta('Financeiro', 'Conciliação')
  const auth = useAuth()
  if (!auth.isDirector) {
    return <div className="page"><div className="empty" style={{ paddingTop: 80 }}><h2>Sem acesso a esta área</h2><span>Os dados do banco são visíveis só para o Diretor geral.</span></div></div>
  }
  return <Tela />
}

function Tela() {
  const confirm = useConfirm()
  const [aba, setAba] = useState('pendente')
  const { data, loading, error, reload } = useData(async () => {
    try {
      const [tx, regras, imports, projects, clients, payables, fin] = await Promise.all([
        fetchRows('bank_transactions', { order: 'posted_on', limit: 3000 }),
        fetchRows('bank_rules', { order: null }),
        fetchRows('bank_imports', { order: 'created_at', limit: 8 }),
        fetchRows('projects'),
        fetchRows('clients', { select: 'id, name' }).catch(() => []),
        fetchRows('payables', { where: (q) => q.is('paid_on', null), order: 'due_on', ascending: true }),
        carregarFinanceiro(),
      ])
      return { tx, regras, imports, projects, clients, payables, fin }
    } catch (e) {
      if (FALTA_TABELA.test(e?.message || '')) return { semTabelas: true }
      throw e
    }
  }, TABELAS)

  const ctx = useMemo(() => {
    if (!data || data.semTabelas) return null
    const nomeCliente = (id) => data.clients.find((c) => c.id === id)?.name || ''
    const projs = data.projects.map((p) => ({ ...p, clientName: nomeCliente(p.client_id) }))
    const { linhas } = calcularCarteira(data.fin, projs)
    const projetos = linhas.map(({ projeto, fin }) => ({
      id: projeto.id, name: projeto.name, clientName: projeto.clientName, fin,
      comissao: data.fin.parceiros.find((x) => x.project_id === projeto.id) || null,
    }))
    return { projetos, todos: projs, regras: data.regras, contasAbertas: data.payables }
  }, [data])

  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>
  if (data.semTabelas) {
    return <div className="page"><PageHead title="Conciliação" /><div className="note y">As tabelas do banco ainda não foram criadas. Rode, nesta ordem, <span className="num">supabase/erp-financeiro-projetos.sql</span> e <span className="num">supabase/erp-banco.sql</span> no SQL Editor do Supabase e atualize a página.</div></div>
  }

  const por = (s) => data.tx.filter((t) => t.status === s)
  const lista = por(aba)
  return (
    <div className="page">
      <PageHead title="Conciliação" sub="Lançamentos do Nu Empresas esperando virar recebimento, pagamento de comissão ou conta paga" />
      <Origem onFeito={reload} imports={data.imports} />
      <Tabs value={aba} onChange={setAba} options={[['pendente', 'Pendentes', por('pendente').length], ['conciliado', 'Conciliados', por('conciliado').length], ['ignorado', 'Ignorados', por('ignorado').length]]} />
      {!lista.length ? <div className="card"><Empty icon="money">{aba === 'pendente' ? 'Nenhum lançamento pendente. Importe um extrato acima.' : 'Nada por aqui.'}</Empty></div> : (
        <div className="cc-lista">
          {lista.slice(0, 300).map((t) => <Linha key={t.id} t={t} ctx={ctx} confirm={confirm} />)}
          {lista.length > 300 ? <p className="lbl">Mostrando os 300 mais recentes de {lista.length}.</p> : null}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- de onde vêm os lançamentos
function Origem({ onFeito, imports }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState(null)       // { ok, motivo } da conexão automática
  const [de, setDe] = useState(addDays(today(), -30))
  const [ate, setAte] = useState(today())
  const [msg, setMsg] = useState('')
  React.useEffect(() => { PROVEDORES.pluggy.disponivel().then(setStatus) }, [])

  const rodar = async (provedor, opcoes, source, fileName) => {
    setMsg('')
    try {
      const lanc = await provedor.buscar(opcoes)
      if (!lanc.length) { setMsg('Nenhum lançamento encontrado nesse período/arquivo.'); return }
      const r = await importarLancamentos(lanc, { source, fileName })
      setMsg(`${r.novos} lançamento(s) novo(s) importado(s); ${r.duplicados} já existiam e foram ignorados.`)
      notify('Importação concluída.', 'ok')
      onFeito()
    } catch (e) {
      setMsg(e.message || 'Não consegui importar.')
    }
  }

  return (
    <div className="grid-2">
      <Card pad title={<h2>Importar extrato (arquivo)</h2>}>
        <div className="stack">
          <p className="lbl">No app do Nubank PJ, exporte o extrato em OFX ou CSV. O arquivo é lido aqui no navegador. Importar o mesmo arquivo duas vezes não duplica nada.</p>
          <input ref={inputRef} type="file" accept=".ofx,.csv,.txt" className="in" aria-label="Arquivo do extrato" />
          <AsyncButton className="btn p" onClick={async () => {
            const file = inputRef.current?.files?.[0]
            if (!file) { setMsg('Escolha o arquivo do extrato.'); return }
            await rodar(PROVEDORES.arquivo, { file }, 'arquivo', file.name)
            if (inputRef.current) inputRef.current.value = ''
          }}><Icon name="upload" size={14} />Importar arquivo</AsyncButton>
        </div>
      </Card>
      <Card pad title={<h2>Conexão automática (Open Finance)</h2>} action={status ? <Badge kind={status.ok ? 'g' : 'y'}>{status.ok ? 'ligada' : 'desligada'}</Badge> : null}>
        {!status ? <div className="skel" style={{ height: 40 }} /> : status.ok ? (
          <div className="stack">
            <div className="fields">
              <label className="field"><span>De</span><input type="date" className="in" value={de} onChange={(e) => setDe(e.target.value)} /></label>
              <label className="field"><span>Até</span><input type="date" className="in" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
            </div>
            <AsyncButton className="btn p" onClick={() => rodar(PROVEDORES.pluggy, { de, ate }, 'pluggy', null)}><Icon name="zap" size={14} />Buscar do banco</AsyncButton>
          </div>
        ) : (
          <div className="stack">
            <div className="note y">A conexão automática ainda não está ligada. {status.motivo} Enquanto isso, use a importação por arquivo ao lado: ela faz o mesmo trabalho.</div>
            <span className="lbl">Para ligar: cadastre <span className="num">PLUGGY_CLIENT_ID</span>, <span className="num">PLUGGY_CLIENT_SECRET</span> e <span className="num">PLUGGY_ITEM_ID</span> na Vercel (veja o README).</span>
          </div>
        )}
      </Card>
      {msg ? <div className="note info" style={{ gridColumn: '1 / -1' }}>{msg}</div> : null}
      {imports.length ? (
        <p className="lbl" style={{ gridColumn: '1 / -1' }}>
          Últimas importações: {imports.slice(0, 4).map((i) => `${dmy(i.created_at.slice(0, 10))} · ${i.source === 'pluggy' ? 'automática' : i.file_name || 'arquivo'} (${i.novos} novos, ${i.duplicados} repetidos)`).join('  |  ')}
        </p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- uma linha
const codifica = (tipo, alvo) => (tipo === 'ignorar' ? 'ignorar' : `${tipo}:${alvo}`)

function Linha({ t, ctx, confirm }) {
  const sug = useMemo(() => (t.status === 'pendente' ? sugerir(t, ctx) : null), [t, ctx])
  const [escolha, setEscolha] = useState(sug ? codifica(sug.tipo, sug.alvo) : '')
  const entrada = t.direction === 'entrada'

  const opcoes = useMemo(() => {
    if (t.status !== 'pendente') return []
    if (entrada) return ctx.todos.map((p) => [`recebimento:${p.id}`, `Recebimento · ${p.name}${p.clientName ? ` (${p.clientName})` : ''}`])
    const com = ctx.projetos.filter((p) => p.comissao).map((p) => [`pagamento_comissao:${p.id}`, `Comissão · ${p.name} (${p.comissao.partner_name})`])
    const contas = ctx.contasAbertas.map((c) => [`conta_pagar:${c.id}`, `Conta a pagar · ${c.description} ${brl(c.amount_cents)}`])
    return [...com, ...contas]
  }, [t.status, entrada, ctx])

  const confirmar = async () => {
    if (!escolha) return
    const [tipo, alvo] = escolha.split(':')
    const igualSugestao = sug && escolha === codifica(sug.tipo, sug.alvo)
    await rpc('bank_conciliar', { p_tx: t.id, p_tipo: tipo, p_alvo: alvo, p_memorizar: !igualSugestao })
    emitChange('bank_transactions', 'bank_rules', 'project_recebimentos', 'project_comissao_pagamentos', 'payables')
    notify(igualSugestao ? 'Conciliado.' : 'Conciliado. Vou lembrar dessa escolha para este nome.', 'ok')
  }
  const ignorar = async () => {
    await update('bank_transactions', t.id, { status: 'ignorado' })
  }
  const desfazer = async () => {
    const msg = t.status === 'conciliado' ? 'Desfazer a conciliação? O lançamento criado no projeto (ou o pagamento da conta) será desfeito.' : 'Voltar este lançamento para pendente?'
    if (!(await confirm(msg, { ok: 'Desfazer', danger: t.status === 'conciliado' }))) return
    await rpc('bank_desfazer', { p_tx: t.id })
    emitChange('bank_transactions', 'project_recebimentos', 'project_comissao_pagamentos', 'payables')
  }

  const destino = t.status === 'conciliado' ? `${TIPOS_DESTINO[t.target_type]}${t.project_id ? ` · ${ctx.todos.find((p) => p.id === t.project_id)?.name || ''}` : ''}` : ''
  return (
    <div className={`cc-row ${t.status}`}>
      <div className="cc-data num">{dm(t.posted_on)}</div>
      <div className="cc-desc">
        <span className="cc-nome">{t.counterparty || t.description || 'Sem descrição'}</span>
        <span className="lbl ellipsis" title={t.description}>{t.description}</span>
        {sug ? <span className="cc-sug"><Icon name="spark" size={11} />{sug.motivo}</span> : null}
        {destino ? <span className="cc-sug ok">{destino}</span> : null}
      </div>
      <div className={`cc-valor num ${entrada ? 'in' : 'out'}`}>{entrada ? '+' : '−'} {brl(t.amount_cents)}</div>
      <div className="cc-acoes">
        {t.status === 'pendente' ? (
          <>
            <Select value={escolha} onChange={(v) => setEscolha(v || '')} placeholder="Escolher destino…" options={opcoes} aria-label="Destino do lançamento" />
            <div className="row" style={{ gap: 6 }}>
              <AsyncButton className="btn p s" disabled={!escolha || escolha === 'ignorar'} onClick={confirmar}>Confirmar</AsyncButton>
              <AsyncButton className="btn s" onClick={ignorar}>Ignorar</AsyncButton>
            </div>
          </>
        ) : <AsyncButton className="btn s" onClick={desfazer}>{t.status === 'conciliado' ? 'Desfazer conciliação' : 'Voltar para pendente'}</AsyncButton>}
      </div>
    </div>
  )
}
