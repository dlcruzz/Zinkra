import React from 'react'
import { Helmet } from 'react-helmet-async'
import About       from '../components/About'
import Team        from '../components/Team'
import WhySection  from '../components/WhySection'
import Comparativo from '../components/Comparativo'
import Testimonials from '../components/Testimonials'
import FAQ         from '../components/FAQ'

export default function Sobre() {
  return (
    <>
      <Helmet>
        <title>Sobre · Quem é a Zinkra | Software House</title>
        <meta name="description" content="Conheça a Zinkra: software house brasileira especializada em sistemas sob medida, sites e ERPs. Saiba por que mais de 50 empresas confiam na nossa equipe." />
      </Helmet>
    <div style={{ paddingTop: '76px' }}>
      <About />
      <Team />
      <WhySection />
      <Comparativo />
      <Testimonials />
      <FAQ />
    </div>
    </>
  )
}
