import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Layout   from './Layout'
import Home     from './pages/Home'
import Servicos from './pages/Servicos'
import Projetos from './pages/Projetos'
import Sobre    from './pages/Sobre'
import Saas     from './pages/Saas'
import Contato  from './pages/Contato'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"         element={<Home />}     />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/projetos" element={<Projetos />} />
        <Route path="/sobre"    element={<Sobre />}    />
        <Route path="/saas"     element={<Saas />}     />
        <Route path="/contato"  element={<Contato />}  />
      </Route>
    </Routes>
  )
}
