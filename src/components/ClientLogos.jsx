import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const CLIENTS = [
  { name: 'VIP Náutica',  tag: 'Náutica · SP' },
  { name: 'Go Ibroker',   tag: 'Imóveis · EUA' },
  { name: 'VIPSYS',       tag: 'Software · SP' },
  { name: 'FUTDraft',     tag: 'SaaS · Esportes' },
  { name: 'VIP Náutica',  tag: 'Náutica · SP' },
  { name: 'Go Ibroker',   tag: 'Imóveis · EUA' },
  { name: 'VIPSYS',       tag: 'Software · SP' },
  { name: 'FUTDraft',     tag: 'SaaS · Esportes' },
]

export default function ClientLogos() {
  const headRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 85%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <div style={{ backgroundColor: '#F5F7F5', borderTop: '1px solid #E8EDEA', borderBottom: '1px solid #E8EDEA' }}>
      <div ref={headRef} className="flex items-center gap-4 px-8 py-4 max-w-7xl mx-auto opacity-0">
        <p className="font-mono text-[10px] uppercase tracking-[3px] whitespace-nowrap shrink-0" style={{ color: '#9AA5A0' }}>
          Quem confia na Zinkra
        </p>
        <div className="h-px flex-1" style={{ backgroundColor: '#E8EDEA' }} />
      </div>

      <div className="overflow-hidden pb-5">
        <div
          className="flex gap-6 px-8"
          style={{ width: 'max-content', animation: 'tech-marquee 24s linear infinite' }}
        >
          {CLIENTS.map((c, i) => (
            <div
              key={i}
              className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{ border: '1px solid #E0E8E3', backgroundColor: '#FFFFFF' }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px]"
                style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#15C45A' }}
              >
                {c.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-[13px] text-[#0A0C0B] leading-none">{c.name}</p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: '#9AA5A0' }}>{c.tag}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
