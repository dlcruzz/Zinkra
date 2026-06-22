import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const ROWS = [
  { label: 'Desenvolvimento 100% próprio',  zinkra: true,  free: null,  agencia: false },
  { label: 'Prazo previsível',              zinkra: true,  free: null,  agencia: null  },
  { label: 'Custo-benefício',              zinkra: true,  free: true,  agencia: false },
  { label: 'Foco em resultado de negócio', zinkra: true,  free: null,  agencia: null  },
  { label: 'Comunicação direta com o dev', zinkra: true,  free: true,  agencia: false },
  { label: 'Suporte e manutenção',         zinkra: true,  free: false, agencia: true  },
  { label: 'Escala e complexidade',        zinkra: true,  free: false, agencia: true  },
  { label: 'Sem terceirização',            zinkra: true,  free: null,  agencia: false },
]

function Cell({ value }) {
  if (value === true)
    return (
      <div className="flex justify-center">
        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(21,196,90,0.15)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#15C45A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 6l3 3 5-5" />
          </svg>
        </span>
      </div>
    )
  if (value === false)
    return (
      <div className="flex justify-center">
        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </span>
      </div>
    )
  return (
    <div className="flex justify-center">
      <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M1 5h8" />
        </svg>
      </span>
    </div>
  )
}

export default function Comparativo() {
  const headRef  = useRef(null)
  const tableRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: headRef.current, start: 'top 82%', once: true } }
      )
      gsap.fromTo(tableRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power4.out',
          scrollTrigger: { trigger: tableRef.current, start: 'top 82%', once: true } }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="py-28" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-3xl mx-auto px-6">

        <div ref={headRef} className="mb-14 opacity-0">
          <p className="font-mono text-[11px] uppercase tracking-[3px] mb-4" style={{ color: '#15C45A' }}>
            Comparativo
          </p>
          <h2 className="font-black text-[#0A0C0B] leading-[1.08] tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
            Zinkra vs. as outras opções.
          </h2>
          <p className="mt-4 text-[17px]" style={{ color: '#4A5550' }}>
            Entenda por que clientes que já tentaram freelancer ou grandes agências chegam até nós.
          </p>
        </div>

        <div ref={tableRef} className="rounded-2xl overflow-hidden opacity-0" style={{ border: '1px solid #E8EDEA' }}>

          {/* Header */}
          <div className="grid grid-cols-4 text-center" style={{ backgroundColor: '#F5F7F5', borderBottom: '1px solid #E8EDEA' }}>
            <div className="p-4" />
            <div className="p-4 flex flex-col items-center gap-1">
              <span
                className="font-black text-[14px] px-3 py-1 rounded-full"
                style={{ backgroundColor: '#15C45A', color: '#fff' }}
              >
                Zinkra
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: '#9AA5A0' }}>Recomendado</span>
            </div>
            <div className="p-4 flex flex-col items-center gap-1">
              <span className="font-bold text-[14px] text-[#0A0C0B]">Freelancer</span>
              <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: '#9AA5A0' }}>Depende do profissional</span>
            </div>
            <div className="p-4 flex flex-col items-center gap-1">
              <span className="font-bold text-[14px] text-[#0A0C0B]">Agência grande</span>
              <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: '#9AA5A0' }}>Alto custo</span>
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-4 items-center"
              style={{
                borderBottom: i < ROWS.length - 1 ? '1px solid #E8EDEA' : 'none',
                backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFA',
              }}
            >
              <div className="px-5 py-4 text-[13px] font-medium" style={{ color: '#0A0C0B' }}>
                {row.label}
              </div>
              <div className="py-4 px-2">
                <Cell value={row.zinkra} />
              </div>
              <div className="py-4 px-2">
                <Cell value={row.free} />
              </div>
              <div className="py-4 px-2">
                <Cell value={row.agencia} />
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 px-5 py-4" style={{ backgroundColor: '#F5F7F5', borderTop: '1px solid #E8EDEA' }}>
            {[
              { color: '#15C45A', bg: 'rgba(21,196,90,0.15)', label: 'Sim' },
              { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Depende' },
              { color: '#EF4444', bg: 'rgba(239,68,68,0.10)', label: 'Não' },
            ].map(({ color, bg, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full" style={{ backgroundColor: bg }} />
                <span className="font-mono text-[11px]" style={{ color: '#9AA5A0' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
