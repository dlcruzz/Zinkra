import React from 'react'
import { Helmet } from 'react-helmet-async'
import Projects from '../components/Projects'

export default function Projetos() {
  return (
    <>
      <Helmet>
        <title>Portfólio · Projetos Entregues | Zinkra</title>
        <meta name="description" content="Conheça os projetos desenvolvidos pela Zinkra: VIP Náutica, Go Ibroker, VIPSYS e FUTDraft. Cases reais de sites, sistemas e SaaS." />
      </Helmet>
      <div style={{ paddingTop: '76px' }}>
        <Projects />
      </div>
    </>
  )
}
