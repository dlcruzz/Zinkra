import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Layout           from './Layout'
import Home             from './pages/Home'
import Servicos         from './pages/Servicos'
import Projetos         from './pages/Projetos'
import ProjetoDetalhe   from './pages/ProjetoDetalhe'
import Sobre            from './pages/Sobre'
import Saas             from './pages/Saas'
import Contato          from './pages/Contato'
import Blog             from './pages/Blog'
import BlogPost         from './pages/BlogPost'
import IdentidadeVisual from './pages/IdentidadeVisual'
import NotFound         from './pages/NotFound'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  return (
    <HelmetProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                    element={<Home />}             />
          <Route path="/servicos"            element={<Servicos />}         />
          <Route path="/projetos"            element={<Projetos />}         />
          <Route path="/projetos/:slug"      element={<ProjetoDetalhe />}   />
          <Route path="/sobre"               element={<Sobre />}            />
          <Route path="/saas"                element={<Saas />}             />
          <Route path="/contato"             element={<Contato />}          />
          <Route path="/blog"                element={<Blog />}             />
          <Route path="/blog/:slug"          element={<BlogPost />}         />
          <Route path="/identidade-visual"   element={<IdentidadeVisual />} />
          <Route path="*"                    element={<NotFound />}         />
        </Route>
      </Routes>
    </HelmetProvider>
  )
}
