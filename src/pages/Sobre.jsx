import React from 'react'
import About       from '../components/About'
import Team        from '../components/Team'
import WhySection  from '../components/WhySection'
import Comparativo from '../components/Comparativo'
import Testimonials from '../components/Testimonials'
import FAQ         from '../components/FAQ'

export default function Sobre() {
  return (
    <div style={{ paddingTop: '76px' }}>
      <About />
      <Team />
      <WhySection />
      <Comparativo />
      <Testimonials />
      <FAQ />
    </div>
  )
}
