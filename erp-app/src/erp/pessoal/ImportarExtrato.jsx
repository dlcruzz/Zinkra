import React, { useRef, useState } from 'react'
import { Modal, Field, Select, AsyncButton } from '../components/ui'
import { Icon } from '../lib/icons'
import { fetchRows, notify } from '../lib/data'
import { useAuth } from '../lib/auth'
import { brl, dm, dmy } from '../lib/format'
import { lerExtrato, categorizar, proporConciliacoes, resumoDaPrevia, trechoDaDescricao, ErroExtrato } from '../lib/pf/extrato'
import { normalizarObrigacoes } from '../lib/pf/motor'
import { contaPadrao, hashesExistentes, importarExtrato, aprenderRegras, lerCompromissosAbertos, lerParcelasAbertas } from '../lib/pf/nucleo'

// Importar extrato: escolher o arquivo (lido aqui no navegador) → prévia → gravar.
export default function ImportarExtrato({ contas, categorias, onClose }) {
  const auth = useAuth()
  const correntes = contas.filter((c) => c.ativo && c.tipo !== 'cartao')
  const [conta, setConta] = useState(contaPadrao(contas)?.id || null)
  const [etapa, setEtapa] = useState('arquivo')
  const [erro, setErro] = useState('')
  const [lendo, setLendo] = useState(false)
  const [nome, setNome] = useState('')
  const [linhas, setLinhas] = useState([])
  const [resultado, setResultado] = useState(null)
  const entrada = useRef(null)
  const contaSel = contas.find((c) => c.id === conta)

  const abrir = async (arquivo) => {
    if (!arquivo) return
    setErro(''); setLendo(true)
    try {
      const { linhas: lidas } = lerExtrato(await arquivo.arrayBuffer())
      const hashes = lidas.map((l) => l.hash)
      const datas = lidas.map((l) => l.data).sort()
      const [existentes, regras, manuais, comp, parc] = await Promise.all([
        hashesExistentes(hashes),
        fetchRows('pf_regras_categoria', { order: 'created_at', ascending: true }),
        fetchRows('pf_lancamentos', { where: (q) => q.gte('data', datas[0]).lte('data', datas[datas.length - 1]).eq('origem', 'manual'), order: 'data', ascending: true }),
        lerCompromissosAbertos(), lerParcelasAbertas(),
      ])
      const jaTem = new Set(existentes)
      const usados = new Set()
      const prontas = lidas.map((l) => {
        if (jaTem.has(l.hash)) return { ...l, situacao: 'existe', incluir: false }
        // lançamento manual de mesma data e valor: provável duplicata do que já foi digitado à mão
        const m = manuais.find((x) => !usados.has(x.id) && x.data === l.data && Number(x.valor_cent) === l.valor_cent)
        if (m) usados.add(m.id)
        const cat = categorizar(l.descricao_norm, regras)
        return { ...l, situacao: 'nova', incluir: !m, possivel_manual: Boolean(m), categoria_id: cat, auto_categoria: cat }
      })
      const concilia = proporConciliacoes(prontas.map((l) => (l.situacao === 'nova' && l.incluir ? l : { ...l, ignorar: true })), normalizarObrigacoes({ compromissos: comp, parcelas: parc }))
      prontas.forEach((l, i) => { if (concilia[i]) { l.conciliar = concilia[i]; l.conciliar_on = true } })
      setLinhas(prontas); setNome(arquivo.name); setEtapa('previa')
    } catch (e) {
      setErro(e instanceof ErroExtrato ? e.message : 'Não consegui ler esse arquivo. Confira se é um extrato em OFX ou CSV.')
      if (!(e instanceof ErroExtrato)) console.error(e)
    } finally { setLendo(false) }
  }

  const muda = (i, patch) => setLinhas((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const novas = linhas.filter((l) => l.situacao === 'nova')
  const escolhidas = novas.filter((l) => l.incluir)
  const resumo = resumoDaPrevia(linhas)
  const baixas = escolhidas.filter((l) => l.conciliar && l.conciliar_on).length
  const antesDoSaldo = contaSel?.data_saldo_inicial ? escolhidas.filter((l) => l.data < contaSel.data_saldo_inicial).length : 0

  const gravar = async () => {
    if (!escolhidas.length) return notify('Marque ao menos um lançamento para importar.', 'err')
    const datas = escolhidas.map((l) => l.data).sort()
    const r = await importarExtrato({
      arquivo_nome: nome, periodo: `${datas[0]} a ${datas[datas.length - 1]}`, conta_id: conta,
      linhas: escolhidas.map((l) => ({
        data: l.data, valor_cent: l.valor_cent, descricao: l.descricao, categoria_id: l.categoria_id || null, hash: l.hash, id_externo: l.id_externo,
        compromisso_id: l.conciliar && l.conciliar_on && l.conciliar.tipo === 'conta' ? l.conciliar.ref : null,
        parcela_id: l.conciliar && l.conciliar_on && l.conciliar.tipo === 'parcela' ? l.conciliar.ref : null,
      })),
    })
    // aprende com as correções: a mesma descrição na próxima importação já vem categorizada
    const aprendidas = new Map()
    for (const l of escolhidas) {
      const trecho = trechoDaDescricao(l.descricao)
      if (l.categoria_id && l.categoria_id !== l.auto_categoria && trecho) aprendidas.set(trecho, l.categoria_id)
    }
    if (aprendidas.size) await aprenderRegras([...aprendidas].map(([trecho_descricao, categoria_id]) => ({ owner_id: auth.uid, trecho_descricao, categoria_id })))
    setResultado({ ...r, aprendidas: aprendidas.size })
    setEtapa('feito')
  }

  const rodape = etapa === 'previa' ? (
    <>
      <button type="button" className="btn" onClick={() => { setEtapa('arquivo'); setLinhas([]) }}>Trocar arquivo</button>
      <AsyncButton className="btn p" onClick={gravar} disabled={!escolhidas.length}>Importar {escolhidas.length} {escolhidas.length === 1 ? 'lançamento' : 'lançamentos'}</AsyncButton>
    </>
  ) : etapa === 'feito' ? <button type="button" className="btn p" onClick={() => onClose(true)}>Fechar</button> : <button type="button" className="btn" onClick={() => onClose(false)}>Cancelar</button>

  return (
    <Modal title="Importar extrato" onClose={() => onClose(etapa === 'feito')} footer={rodape}>
      {etapa === 'arquivo' ? (
        <>
          <p className="lbl">Escolha o arquivo do extrato (OFX é o melhor; CSV também serve). Ele é lido aqui no seu navegador e <b>não é enviado a lugar nenhum</b>: só as linhas que você confirmar são gravadas.</p>
          {correntes.length > 1 ? <Field label="De qual conta é o extrato"><Select value={conta} onChange={setConta} options={correntes.map((c) => [c.id, c.nome])} /></Field> : null}
          <input ref={entrada} type="file" accept=".ofx,.csv,.txt,.qfx" hidden onChange={(e) => { abrir(e.target.files[0]); e.target.value = '' }} />
          <button type="button" className="pf-soltar" onClick={() => entrada.current?.click()} disabled={lendo}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); abrir(e.dataTransfer.files[0]) }}>
            <Icon name="upload" size={22} />
            <b>{lendo ? 'Lendo o arquivo…' : 'Escolher o arquivo do extrato'}</b>
            <span className="lbl">ou arraste para cá · OFX, QFX ou CSV</span>
          </button>
          {erro ? <div className="note r">{erro}</div> : null}
        </>
      ) : null}

      {etapa === 'previa' ? (
        <>
          <div className="pf-previa-resumo" role="status">
            <span><b className="num">{resumo.novas}</b> {resumo.novas === 1 ? 'nova' : 'novas'}</span>
            <span><b className="num">{resumo.existiam}</b> já {resumo.existiam === 1 ? 'existia' : 'existiam'}</span>
            <span className={resumo.semCategoria ? 'alerta' : ''}><b className="num">{resumo.semCategoria}</b> sem categoria</span>
            {baixas ? <span className="ok"><b className="num">{baixas}</b> {baixas === 1 ? 'conta paga' : 'contas pagas'}</span> : null}
          </div>
          {resumo.possiveis ? <div className="note y">{resumo.possiveis} {resumo.possiveis === 1 ? 'lançamento tem' : 'lançamentos têm'} a mesma data e valor de algo que você já digitou. Deixei desmarcado{resumo.possiveis === 1 ? '' : 's'} para não duplicar; marque se for outra coisa.</div> : null}
          {antesDoSaldo ? <div className="note info">{antesDoSaldo} {antesDoSaldo === 1 ? 'lançamento é anterior' : 'lançamentos são anteriores'} à data do saldo informado ({dmy(contaSel.data_saldo_inicial)}) e não mudam o seu saldo.</div> : null}
          <div className="pf-previa">
            {novas.map((l) => {
              const i = linhas.indexOf(l)
              const entradaLinha = l.valor_cent > 0
              return (
                <div key={l.hash} className={`pf-previa-linha ${l.incluir ? '' : 'fora'}`}>
                  <label className="pf-previa-sel"><input type="checkbox" checked={l.incluir} onChange={(e) => muda(i, { incluir: e.target.checked })} aria-label={`Importar ${l.descricao}`} /></label>
                  <div className="pf-meio">
                    <span className="pf-nome">{l.descricao}</span>
                    <span className="lbl">{dm(l.data)}{l.possivel_manual ? ' · parece já lançado à mão' : ''}</span>
                  </div>
                  <span className={`pf-valor num ${entradaLinha ? 'pos' : ''}`}>{entradaLinha ? '+' : '−'} {brl(Math.abs(l.valor_cent))}</span>
                  <Select value={l.categoria_id} onChange={(v) => muda(i, { categoria_id: v })} placeholder="Sem categoria" aria-label={`Categoria de ${l.descricao}`}
                    options={categorias.filter((c) => c.tipo === (entradaLinha ? 'entrada' : 'saida')).map((c) => [c.id, c.nome])} />
                  {l.conciliar ? (
                    <label className="pf-previa-concilia">
                      <input type="checkbox" checked={Boolean(l.conciliar_on)} onChange={(e) => muda(i, { conciliar_on: e.target.checked })} />
                      <span>Marcar como paga: <b>{l.conciliar.descricao}</b> (vence {dm(l.conciliar.vencimento)})</span>
                    </label>
                  ) : null}
                </div>
              )
            })}
            {!novas.length ? <span className="lbl">Todas as linhas desse arquivo já estavam gravadas.</span> : null}
          </div>
          {resumo.existiam ? (
            <details className="pf-previa-existem">
              <summary className="lbl">Ver as {resumo.existiam} que já existiam (não serão importadas)</summary>
              {linhas.filter((l) => l.situacao === 'existe').map((l) => <div key={l.hash} className="pf-previa-existe"><span>{dm(l.data)} · {l.descricao}</span><span className="num">{brl(l.valor_cent)}</span></div>)}
            </details>
          ) : null}
        </>
      ) : null}

      {etapa === 'feito' && resultado ? (
        <div className="stack-s">
          <span className="pf-selo num">IMPORTADO</span>
          <p className="pf-feito-t"><b className="num">{resultado.novas}</b> {resultado.novas === 1 ? 'lançamento novo' : 'lançamentos novos'}{resultado.duplicadas ? `, ${resultado.duplicadas} já existiam` : ''}.</p>
          {resultado.conciliadas ? <span className="note g">{resultado.conciliadas} {resultado.conciliadas === 1 ? 'conta foi marcada como paga' : 'contas foram marcadas como pagas'}.</span> : null}
          {resultado.aprendidas ? <span className="lbl">Aprendi {resultado.aprendidas} {resultado.aprendidas === 1 ? 'regra' : 'regras'} de categoria com as suas correções.</span> : null}
        </div>
      ) : null}
    </Modal>
  )
}
