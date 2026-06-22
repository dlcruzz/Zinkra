import React, { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import WAModal      from './components/WAModal'
import Navbar       from './components/Navbar'
import Footer       from './components/Footer'
import CookieBanner from './components/CookieBanner'

gsap.registerPlugin(ScrollTrigger)

function ScrollProgressBar() {
  const { pathname } = useLocation()

  useEffect(() => {
    const bar = document.getElementById('scroll-bar')
    if (!bar) return
    ScrollTrigger.getAll()
      .filter(t => t.vars.id === 'progress')
      .forEach(t => t.kill())
    gsap.set(bar, { scaleX: 0 })
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        id: 'progress',
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    })
  }, [pathname])

  return <div id="scroll-bar" />
}

function CustomCursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    gsap.set(dot,  { xPercent: -50, yPercent: -50 })
    gsap.set(ring, { xPercent: -50, yPercent: -50 })

    const onMove = (e) => {
      dot.style.opacity  = '1'
      ring.style.opacity = '1'
      gsap.to(dot,  { x: e.clientX, y: e.clientY, duration: 0.08, overwrite: true })
      gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.18, overwrite: true })
    }
    const onOver = (e) => { if (e.target.closest('a, button')) ring.classList.add('hovered') }
    const onOut  = (e) => { if (e.target.closest('a, button')) ring.classList.remove('hovered') }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover',  onOver)
    document.addEventListener('mouseout',   onOut)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover',  onOver)
      document.removeEventListener('mouseout',   onOut)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}

function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/5511941164044"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="wa-float fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-transform duration-200 hover:scale-110"
      style={{ backgroundColor: '#25D366', boxShadow: '0 8px 32px rgba(37,211,102,0.3)' }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setTimeout(() => ScrollTrigger.refresh(), 150)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <div className="bg-white text-[#0A0C0B] font-sans overflow-x-hidden">
      <Helmet>
        <title>Software House no Brasil | Sistemas, Sites e ERPs Sob Medida | Zinkra</title>
        <meta name="description" content="Software house especializada em sistemas internos, ERPs, SaaS e sites sob medida para empresas em todo o Brasil. 100% personalizado, sem templates. Orçamento gratuito." />
      </Helmet>
      <WAModal />
      <ScrollProgressBar />
      <CustomCursor />
      <ScrollToTop />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      <CookieBanner />
    </div>
  )
}
