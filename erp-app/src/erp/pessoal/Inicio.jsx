import React from 'react'
import { Link } from 'react-router-dom'
import { useMeta } from '../components/Shell'
import { PageHead, Loading, ErrorBox, CountUp, Badge } from '../components/ui'
import { Icon } from '../lib/icons'
import { useData } from '../lib/data'
import { brl, daysBetween, dmy } from '../lib/format'
import { hojeSP, proximosRecebimentos } from '../lib/pf/datas'
import { lerCadastros, lerConfig, lerResumoBase } from '../lib/pf/api'
import { diaSemanaData } from './listas'

const TABELAS = ['pf_config', 'pf_contas', 'pf_recebimentos_modelo', 'pf_compromissos', 'pf_parcelas', 'pf_parcelamentos', 'pf_dividas']

export default function Inicio() {
  useMeta('Pessoal', 'Pessoal')
  const { data, loading, error, reload } = useData(async () => {
    const [config, cad, resumo] = await Promise.all([lerConfig(), lerCadastros(), lerResumoBase()])
    return { config, ...cad, resumo }
  }, TABELAS, [])
  if (error) return <div className="page"><ErrorBox error={error} onRetry={reload} /></div>
  if (loading || !data) return <div className="page"><Loading rows={6} /></div>

  const { config, modelos, contas, resumo } = data
  const hoje = hojeSP()

  if (!config.onboarding_ok_em) {
    return (
      <div className="page pf">
        <PageHead title="Suas finanças pessoais" sub="Separadas da Zinkra. Só você vê." />
        <section className="pf-convite">
          <span className="pf-selo num">PASSO {Math.min(4, config.onboarding_passo)} DE 4</span>
          <h2>Vamos montar o seu mês</h2>
          <p>Quatro perguntas rápidas: quanto você tem hoje, quando o dinheiro entra, o que está para vencer e o que ainda está parcelado. Leva uns cinco minutos e cada passo já fica salvo.</p>
          <Link to="/erp/pessoal/primeiros-passos" className="btn p">{config.onboarding_passo > 1 ? 'Continuar de onde parei' : 'Começar'}<Icon name="arrow" size={14} /></Link>
        </section>
      </div>
    )
  }

  const proximos = proximosRecebimentos(modelos, config.regra_fim_semana, hoje, 4)
  const cartoes = contas.filter((c) => c.tipo === 'cartao' && c.ativo)
  return (
    <div className="pf-inicio page pf">
      <PageHead title="Suas finanças pessoais" sub="Separadas da Zinkra. Só você vê.">
        <Link to="/erp/pessoal/config" className="btn">Configurações</Link>
      </PageHead>

      <section className="pf-hero">
        <div className="pf-hero-saldo">
          <span className="lbl">Saldo informado nas contas</span>
          <span className="pf-grande num"><CountUp value={brl(resumo.saldo_contas_cent)} /></span>
          <span className="lbl">Conferido na configuração. As telas de gasto do dia e do plano de cada entrada chegam na próxima etapa.</span>
        </div>
        <div className="pf-regua" aria-label="Próximos recebimentos">
          <span className="lbl">Próximos recebimentos</span>
          {proximos.length ? (
            <ol>
              {proximos.map((p, i) => {
                const dias = daysBetween(hoje, p.data)
                return (
                  <li key={p.data + p.modelo.id} style={{ animationDelay: `${i * 0.07}s` }}>
                    <span className="pf-ponto" aria-hidden="true" />
                    <span className="pf-quando"><b className="num">{diaSemanaData(p.data)}</b><span className="lbl">{dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`}</span></span>
                    <span className="pf-quanto num">{p.modelo.valor_esperado_cent ? brl(p.modelo.valor_esperado_cent) : <span className="mut">sem valor</span>}</span>
                  </li>
                )
              })}
            </ol>
          ) : <span className="mut">Nenhum recebimento fixo cadastrado.</span>}
        </div>
      </section>

      <section className="pf-bloco">
        <div className="pf-cabeca"><div className="stack-s"><h2>O que está cadastrado</h2><span className="lbl">Números calculados no banco.</span></div></div>
        <div className="pf-linha slim"><div className="pf-meio"><span className="pf-nome">Contas em aberto</span><span className="lbl">{resumo.contas_abertas.n} conta(s)</span></div><span className="pf-valor num">{brl(resumo.contas_abertas.total_cent)}</span></div>
        <div className="pf-linha slim"><div className="pf-meio"><span className="pf-nome">Parcelas que ainda faltam</span><span className="lbl">{resumo.parcelas_abertas.n} parcela(s) em {resumo.parcelamentos_ativos} parcelamento(s)</span></div><span className="pf-valor num">{brl(resumo.parcelas_abertas.total_cent)}</span></div>
        <div className="pf-linha slim"><div className="pf-meio"><span className="pf-nome">Dívidas</span><span className="lbl">{resumo.dividas.n} dívida(s), mínimo de {brl(resumo.dividas.minima_cent)}</span></div><span className="pf-valor num">{brl(resumo.dividas.saldo_cent)}</span></div>
        {cartoes.map((c) => (
          <div className="pf-linha slim" key={c.id}><div className="pf-meio"><span className="pf-nome">{c.nome}</span><span className="lbl">fecha dia {c.fechamento_dia}, vence dia {c.vencimento_dia}</span></div><Badge dot={false}>Cartão</Badge></div>
        ))}
        <span className="lbl">Primeiros passos concluídos em {dmy(config.onboarding_ok_em.slice(0, 10))}. <Link to="/erp/pessoal/primeiros-passos">Rever</Link></span>
      </section>
    </div>
  )
}
