import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Services        from '../components/Services'
import Calculadora     from '../components/Calculadora'
import FeaturedService from '../components/FeaturedService'

export default function Servicos() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    const el = document.getElementById(id)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }, [hash])

  return (
    <>
      <Helmet>
        <title>Serviços · Sites, Sistemas e Redes Sociais | Zinkra</title>
        <meta name="description" content="Criação de sites, sistemas sob medida, ERPs, SaaS e gestão de redes sociais. Veja os planos e preços da Zinkra e use nossa calculadora de orçamento." />
      </Helmet>
      <div style={{ paddingTop: '76px' }}>
        <Services />
        <Calculadora />
        <FeaturedService />
      </div>
    </>
  )
}
