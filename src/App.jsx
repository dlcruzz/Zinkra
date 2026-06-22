import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import WAModal          from './components/WAModal'
import Navbar           from './components/Navbar'
import Hero             from './components/Hero'
import ServicesGrid     from './components/ServicesGrid'
import WhySection       from './components/WhySection'
import HorizontalProcess from './components/HorizontalProcess'
import FeaturedService  from './components/FeaturedService'
import Performance      from './components/Performance'
import Projects         from './components/Projects'
import Testimonials     from './components/Testimonials'
import Services         from './components/Services'
import Footer           from './components/Footer'

gsap.registerPlugin(ScrollTrigger)

/* ─── Scroll progress bar ──────────────────────────────────────────── */
function ScrollProgressBar() {
  useEffect(() => {
    const bar = document.getElementById('scroll-bar')
    if (!bar) return
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    })
  }, [])
  return <div id="scroll-bar" />
}

/* ─── Custom cursor ────────────────────────────────────────────────── */
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

/* ─── WhatsApp float ───────────────────────────────────────────────── */
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

/* ─── Planos section wrapper ───────────────────────────────────────── */
function PlanosSection() {
  return (
    <section id="planos" style={{ backgroundColor: '#F5F7F5', paddingTop: '80px', paddingBottom: '80px' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Planos e preços
          </p>
          <h2
            className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(26px, 4vw, 48px)' }}
          >
            Escolha o plano certo<br />
            <span style={{ color: '#15C45A' }}>para o seu negócio.</span>
          </h2>
          <p className="mt-4 text-[16px]" style={{ color: '#4A5550' }}>
            Cada plano construído do zero — sem template, sem enrolação.
          </p>
        </div>
        <Services standalone />
      </div>
    </section>
  )
}

/* ─── CTA final ────────────────────────────────────────────────────── */
function FinalCTA() {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power4.out',
          scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section
      id="contato"
      className="py-28 text-center relative overflow-hidden"
      style={{ backgroundColor: '#071209' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(21,196,90,0.06) 0%, transparent 70%)' }}
      />
      <div ref={ref} className="max-w-2xl mx-auto px-6 relative opacity-0">
        <p className="font-mono text-[11px] uppercase tracking-[3px] mb-5" style={{ color: '#5A7A65' }}>
          Próximo passo
        </p>
        <h2
          className="font-black text-white leading-[1.06] tracking-tight mb-5"
          style={{ fontSize: 'clamp(28px, 4.5vw, 58px)' }}
        >
          Pronto para fazer sua empresa{' '}
          <span style={{ color: '#15C45A' }}>decolar?</span>
        </h2>
        <p className="text-[17px] mb-10 leading-[1.75]" style={{ color: '#5A7A65' }}>
          Marque uma conversa gratuita. A gente entende seu negócio, apresenta as soluções certas e te dá um orçamento sem compromisso.
        </p>
        <a
          href="https://wa.me/5511941164044?text=Ol%C3%A1%2C%20quero%20uma%20an%C3%A1lise%20gratuita%20do%20meu%20projeto"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 font-bold text-white px-10 py-4 rounded-lg text-[15px] uppercase tracking-wide transition-all duration-200 mb-8"
          style={{ backgroundColor: '#15C45A' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Quero uma análise gratuita
        </a>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {['Sem compromisso', 'Orçamento gratuito', 'Respondemos em até 2h'].map(t => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#15C45A' }} />
              <span className="font-mono text-[11px]" style={{ color: '#3A5545' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── App ──────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <div className="bg-white text-[#0A0C0B] font-sans overflow-x-hidden">
      <WAModal />
      <ScrollProgressBar />
      <CustomCursor />
      <Navbar />
      <Hero />
      <ServicesGrid />
      <WhySection />
      <HorizontalProcess />
      <FeaturedService />
      <Performance />
      <Projects />
      <Testimonials />
      <PlanosSection />
      <FinalCTA />
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}
